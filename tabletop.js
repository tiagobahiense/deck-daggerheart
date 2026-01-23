// =========================================================
// TABLETOP SYSTEM V5.0 (PANNING, VISIBILITY & SYNC)
// =========================================================

const REF_TABLETOP = 'mesa_rpg/tabuleiro';
const GRID_SIZE = 50;

// Variáveis de Controle
let isDraggingToken = false;
let isPanningMap = false;
let currentTokenId = null;
let dragStartPos = { x: 0, y: 0 };
let mapOffset = { x: 0, y: 0 };
let vttMinimizado = false;

// --- INICIALIZAÇÃO ---
window.iniciarTabletop = function() {
    const area = document.getElementById('tabletop-area');
    const mapContainer = document.getElementById('map-container');
    const btnMinimizar = document.getElementById('btn-vtt-toggle');
    
    if(!area || !mapContainer) return;

    // Eventos de PANNING (Mover o mapa)
    area.addEventListener('mousedown', startPanMap);
    window.addEventListener('mousemove', movePanMap);
    window.addEventListener('mouseup', endPanMap);

    // Listener do Firebase
    window.onValue(window.ref(window.db, REF_TABLETOP), (snap) => {
        const dados = snap.val() || {};
        
        // Configuração do Mapa
        if(dados.config && dados.config.imagem) {
            const isMestre = window.nomeJogador === "Mestre";
            const mapaAtivo = dados.config.visivel;
            const imgEl = document.getElementById('map-bg-img');

            // Carrega Imagem
            if(imgEl.src !== dados.config.imagem) {
                imgEl.src = dados.config.imagem;
                // Ao carregar, ajusta tamanho do container
                imgEl.onload = () => {
                    mapContainer.style.width = imgEl.naturalWidth + 'px';
                    mapContainer.style.height = imgEl.naturalHeight + 'px';
                };
            }

            // Exibição
            if (isMestre) {
                area.style.display = 'block'; 
            } else {
                if (mapaAtivo) {
                    btnMinimizar.style.display = 'block';
                    if (!vttMinimizado) {
                        area.style.display = 'block';
                        document.body.classList.add('vtt-ativo'); 
                    }
                } else {
                    area.style.display = 'none';
                    btnMinimizar.style.display = 'none';
                    document.body.classList.remove('vtt-ativo');
                }
            }
        }

        renderizarTokens(dados.tokens || {});
    });

    // Listener para Vitral do Jogador
    if (window.nomeJogador && window.nomeJogador !== "Mestre") {
        window.onValue(window.ref(window.db, `mesa_rpg/jogadores/${window.nomeJogador}/avatar`), snap => {
            if(snap.exists()) {
                document.getElementById('player-portrait-img').src = snap.val();
                document.getElementById('player-portrait-container').style.display = 'block';
            }
        });
    }
};

// --- RENDERIZAÇÃO DE TOKENS ---
function renderizarTokens(tokensData) {
    const container = document.getElementById('map-container');
    const existing = document.querySelectorAll('.token');
    
    // Remove deletados
    existing.forEach(el => { if(!tokensData[el.id]) el.remove(); });

    Object.keys(tokensData).forEach(id => {
        const t = tokensData[id];
        let el = document.getElementById(id);

        if (!el) {
            el = document.createElement('div');
            el.id = id;
            el.className = `token ${t.tipo === 'pc' ? 'token-jogador' : 'token-monstro'}`;
            el.innerHTML = `
                <div class="token-bars-container">
                    <div class="bar-track"><div class="fill-hp"></div></div>
                    <div class="bar-track" style="display:none;"><div class="fill-pf"></div></div>
                </div>
            `;
            
            // Lógica de Clique vs Drag (Timer)
            let startClickTime;
            el.addEventListener('mousedown', (e) => {
                e.stopPropagation(); // Não propaga para o mapa (evita pan)
                startClickTime = Date.now();
                startDragToken(e, id, t);
            });
            el.addEventListener('mouseup', (e) => {
                // Se soltou rápido (menos de 200ms) e não moveu muito, é clique
                if (Date.now() - startClickTime < 200 && !isDraggingToken) {
                    abrirInfoToken(id, t);
                }
            });
            // Touch events
            el.addEventListener('touchstart', (e) => {
                e.stopPropagation();
                startClickTime = Date.now();
                startDragToken(e, id, t);
            }, {passive: false});
            el.addEventListener('touchend', (e) => {
                if (Date.now() - startClickTime < 200 && !isDraggingToken) {
                    abrirInfoToken(id, t);
                }
            });

            container.appendChild(el);
        }

        // Atualiza posição (apenas se não estiver arrastando este específico)
        if (currentTokenId !== id) {
            el.style.left = t.x + 'px';
            el.style.top = t.y + 'px';
        }

        // Imagem
        el.style.backgroundImage = `url('${t.imagem || 'img/monsters/default.png'}')`;
        el.style.width = (t.tamanho * GRID_SIZE) + 'px';
        el.style.height = (t.tamanho * GRID_SIZE) + 'px';

        // Barras
        const s = t.stats || {};
        const hpBar = el.querySelector('.fill-hp');
        const pfTrack = el.querySelector('.token-bars-container > div:last-child');
        const pfBar = el.querySelector('.fill-pf');

        if(s.pv_max > 0) {
            const hpPct = Math.max(0, Math.min(100, (s.pv_atual / s.pv_max) * 100));
            hpBar.style.width = hpPct + '%';
        }
        if(s.pf_max > 0) {
            pfTrack.style.display = 'block';
            const pfPct = Math.max(0, Math.min(100, (s.pf_atual / s.pf_max) * 100));
            pfBar.style.width = pfPct + '%';
        } else {
            pfTrack.style.display = 'none';
        }
    });
}

// --- INFO MODAL (CORRIGIDO VISIBILIDADE) ---
function abrirInfoToken(id, t) {
    // Busca dados frescos do objeto t (que vem do listener)
    const modal = document.getElementById('token-info-modal') || criarModalInfo();
    const isMestre = window.nomeJogador === "Mestre";
    const s = t.stats || {};
    // Garante defaults se não existirem
    const vis = s.vis || { hp: false, ac: false, atk: false, dmg: false, desc: false };

    let html = `<h3 style="margin:0 0 15px 0; color:var(--gold); text-align:center;">${t.nome}</h3>`;

    const row = (label, val, key) => {
        // Se for jogador e estiver oculto
        if (!isMestre && !vis[key]) return `<div class="info-row"><span><strong>${label}:</strong> ???</span></div>`;
        
        const eyeClass = vis[key] ? 'visible' : '';
        const eye = isMestre ? `<span class="eye-btn ${eyeClass}" onclick="toggleInfoVis('${id}', '${key}')">👁️</span>` : '';
        return `<div class="info-row"><span><strong>${label}:</strong> ${val}</span>${eye}</div>`;
    };

    html += row("PV", `${s.pv_atual} / ${s.pv_max}`, 'hp');
    if(s.pf_max > 0) html += row("PF", `${s.pf_atual} / ${s.pf_max}`, 'hp');

    html += row("Defesa", s.dificuldade, 'ac');
    html += row("Ataque", s.ataque, 'atk');
    html += row("Dano", s.dano, 'dmg');

    if(isMestre || vis.desc) {
        html += `<div style="margin-top:10px; font-size:0.9rem; font-style:italic;">${s.detalhes || 'Sem descrição.'}</div>`;
        if(isMestre) {
            const eyeClass = vis.desc ? 'visible' : '';
            html += `<div style="text-align:right"><span class="eye-btn ${eyeClass}" onclick="toggleInfoVis('${id}', 'desc')">👁️ Descrição</span></div>`;
        }
    }

    if(isMestre) {
        html += `
            <div class="hp-control-group">
                <button class="btn-dmg" onclick="alterarVidaToken('${id}', -1)">-1</button>
                <button class="btn-heal" onclick="alterarVidaToken('${id}', 1)">+1</button>
                <button class="btn-trash" onclick="removerTokenDoGrid('${id}')">🗑️</button>
            </div>
        `;
    }

    html += `<button onclick="document.getElementById('token-info-modal').style.display='none'" style="width:100%; margin-top:15px; padding:8px; background:#333; color:#fff; border:1px solid #666; cursor:pointer;">Fechar</button>`;
    
    modal.innerHTML = html;
    modal.style.display = 'block';
}

function criarModalInfo() {
    const m = document.createElement('div');
    m.id = 'token-info-modal'; m.className = 'token-info-modal';
    document.body.appendChild(m); return m;
}

// --- AÇÕES DO MESTRE ---
window.toggleInfoVis = function(tokenId, field) {
    const refVis = window.ref(window.db, `${REF_TABLETOP}/tokens/${tokenId}/stats/vis/${field}`);
    window.get(refVis).then(snap => {
        window.set(refVis, !snap.val()); 
        document.getElementById('token-info-modal').style.display = 'none'; // Fecha pra forçar atualização visual ao reabrir
    });
};

window.alterarVidaToken = function(id, delta) {
    const refStats = window.ref(window.db, `${REF_TABLETOP}/tokens/${id}/stats`);
    window.get(refStats).then(snap => {
        const s = snap.val();
        let novo = (s.pv_atual || 0) + delta;
        if(novo < 0) novo = 0; if(novo > s.pv_max) novo = s.pv_max;
        window.update(refStats, { pv_atual: novo });
        document.getElementById('token-info-modal').style.display = 'none';
    });
};

window.removerTokenDoGrid = function(id) {
    if(confirm("Excluir token?")) {
        window.remove(window.ref(window.db, `${REF_TABLETOP}/tokens/${id}`));
        document.getElementById('token-info-modal').style.display = 'none';
    }
};

// --- PANNING DO MAPA (MOVER O FUNDO) ---
function startPanMap(e) {
    // Só move se clicar no fundo (mapa) e não em token
    if(e.target.id !== 'tabletop-area' && e.target.id !== 'map-container' && !e.target.classList.contains('grid-overlay')) return;
    
    isPanningMap = true;
    dragStartPos = { x: e.clientX, y: e.clientY };
    const container = document.getElementById('map-container');
    // Lê posição atual transform ou top/left
    mapOffset = { x: container.offsetLeft, y: container.offsetTop };
}

function movePanMap(e) {
    if(!isPanningMap) return;
    const dx = e.clientX - dragStartPos.x;
    const dy = e.clientY - dragStartPos.y;
    const container = document.getElementById('map-container');
    container.style.left = (mapOffset.x + dx) + 'px';
    container.style.top = (mapOffset.y + dy) + 'px';
}

function endPanMap() {
    isPanningMap = false;
}

// --- DRAG TOKEN ---
function startDragToken(e, id, t) {
    const isMestre = window.nomeJogador === "Mestre";
    // Mestre move tudo, Jogador só move se for PC e nome bater
    if (!isMestre && (t.tipo !== 'pc' || t.nome !== window.nomeJogador)) return;

    isDraggingToken = true; 
    currentTokenId = id;
    const el = document.getElementById(id);
    const container = document.getElementById('map-container').getBoundingClientRect();
    
    // Pega posição do toque ou mouse
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // Offset dentro do token para não "pular" para o centro do mouse
    dragStartPos = {
        x: clientX - el.getBoundingClientRect().left,
        y: clientY - el.getBoundingClientRect().top
    };

    window.addEventListener('mousemove', moveDragToken);
    window.addEventListener('mouseup', endDragToken);
    window.addEventListener('touchmove', moveDragToken, {passive: false});
    window.addEventListener('touchend', endDragToken);
}

function moveDragToken(e) {
    if(!isDraggingToken) return;
    e.preventDefault(); // Evita scroll em mobile
    const el = document.getElementById(currentTokenId);
    const container = document.getElementById('map-container').getBoundingClientRect();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // Posição relativa ao container do mapa
    const newLeft = clientX - container.left - dragStartPos.x;
    const newTop = clientY - container.top - dragStartPos.y;

    el.style.left = newLeft + 'px';
    el.style.top = newTop + 'px';
}

function endDragToken() {
    if(!isDraggingToken) return;
    const el = document.getElementById(currentTokenId);
    
    // Snap to Grid (50px)
    let x = Math.round(parseFloat(el.style.left) / GRID_SIZE) * GRID_SIZE;
    let y = Math.round(parseFloat(el.style.top) / GRID_SIZE) * GRID_SIZE;
    
    // Salva posição
    window.update(window.ref(window.db, `${REF_TABLETOP}/tokens/${currentTokenId}`), { x: x, y: y });
    
    isDraggingToken = false;
    currentTokenId = null;
    window.removeEventListener('mousemove', moveDragToken);
    window.removeEventListener('mouseup', endDragToken);
    window.removeEventListener('touchmove', moveDragToken);
    window.removeEventListener('touchend', endDragToken);
}

// --- UPLOADS ---
window.uploadMapa = function() {
    const file = document.getElementById('map-upload-input').files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        window.update(window.ref(window.db, `${REF_TABLETOP}/config`), { imagem: e.target.result, visivel: false });
    };
    if(file) reader.readAsDataURL(file);
};

window.toggleMapaVisivel = function() {
    window.get(window.ref(window.db, `${REF_TABLETOP}/config/visivel`)).then(s => {
        window.update(window.ref(window.db, `${REF_TABLETOP}/config`), { visivel: !s.val() });
    });
};

window.uploadAvatarJogador = function() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if(!file) return;
        const r = new FileReader();
        r.onload = (ev) => {
            if(window.nomeJogador) {
                const img = ev.target.result;
                // 1. Salva no perfil (para vitral)
                window.update(window.ref(window.db, `mesa_rpg/jogadores/${window.nomeJogador}`), { avatar: img });
                
                // 2. Cria token no mapa com VISIBILIDADE PADRÃO
                const tokenId = 'pc_' + window.nomeJogador;
                const token = {
                    tipo: 'pc', nome: window.nomeJogador, imagem: img, tamanho: 1, x: 50, y: 50,
                    stats: { 
                        pv_atual: 6, pv_max: 6, pf_atual: 0, pf_max: 6,
                        dificuldade: 10, ataque: "+0", dano: "1d8",
                        vis: { hp: true, ac: true, atk: true, dmg: true, desc: true } // Players veem tudo deles
                    }
                };
                window.update(window.ref(window.db, `${REF_TABLETOP}/tokens/${tokenId}`), token);
            }
        };
        r.readAsDataURL(file);
    };
    input.click();
};

window.toggleVTTMinimizado = function() {
    const area = document.getElementById('tabletop-area');
    const btn = document.getElementById('btn-vtt-toggle');
    vttMinimizado = !vttMinimizado;
    if (vttMinimizado) {
        area.style.display = 'none';
        document.body.classList.remove('vtt-ativo');
        btn.innerText = "🗺️ Abrir";
    } else {
        area.style.display = 'block';
        document.body.classList.add('vtt-ativo');
        btn.innerText = "⬇️ Minimizar";
    }
};

window.criarTokenMonstro = function(keyIgnorada, dados) {
    const imgSrc = dados.imagem || 'img/monsters/default.png';
    const tokenId = 'mob_' + Date.now();
    const novoToken = {
        tipo: 'mob', nome: dados.nome, imagem: imgSrc, tamanho: 1, x: 100, y: 100,
        stats: { ...dados, vis: { hp: false, ac: false, atk: false, dmg: false, desc: false } }
    };
    window.update(window.ref(window.db, `${REF_TABLETOP}/tokens/${tokenId}`), novoToken);
    alert("Token Criado!");
};