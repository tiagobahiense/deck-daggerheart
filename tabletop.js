// =========================================================
// TABLETOP SYSTEM V3.1 (TAMANHO REAL FIX & SYNC)
// =========================================================

const REF_TABLETOP = 'mesa_rpg/tabuleiro';
const GRID_SIZE = 50;
let isDraggingToken = false;
let currentTokenId = null;
let vttMinimizado = false;

// --- INICIALIZAÇÃO ---
window.iniciarTabletop = function() {
    const area = document.getElementById('tabletop-area');
    const btnMinimizar = document.getElementById('btn-vtt-toggle');
    if(!area) return;

    window.onValue(window.ref(window.db, REF_TABLETOP), (snap) => {
        const dados = snap.val();
        
        // Controle de Visibilidade e Imagem
        if(dados && dados.config && dados.config.imagem) {
            const isMestre = window.nomeJogador === "Mestre";
            const mapaAtivo = dados.config.visivel;
            const imgEl = document.getElementById('map-bg-img');
            const mapContainer = document.getElementById('map-container');

            // CORREÇÃO TAMANHO DA IMAGEM:
            // Ajusta o container para o tamanho natural da imagem ao carregar
            imgEl.onload = function() {
                mapContainer.style.width = this.naturalWidth + 'px';
                mapContainer.style.height = this.naturalHeight + 'px';
            };
            // Só atualiza src se mudou para evitar piscar
            if(imgEl.src !== dados.config.imagem) {
                imgEl.src = dados.config.imagem;
            } else {
                // Se já estava carregada, força ajuste de tamanho (caso tenha redimensionado janela)
                mapContainer.style.width = imgEl.naturalWidth + 'px';
                mapContainer.style.height = imgEl.naturalHeight + 'px';
            }

            // Lógica de Exibição
            if (isMestre) {
                area.style.display = 'block'; 
            } else {
                // Jogador
                if (mapaAtivo) {
                    if (btnMinimizar) btnMinimizar.style.display = 'block';
                    
                    if (!vttMinimizado) {
                        area.style.display = 'block';
                        document.body.classList.add('vtt-ativo'); 
                    } else {
                        area.style.display = 'none';
                        document.body.classList.remove('vtt-ativo'); 
                    }
                } else {
                    area.style.display = 'none';
                    if (btnMinimizar) btnMinimizar.style.display = 'none';
                    document.body.classList.remove('vtt-ativo');
                }
            }

            if(dados.tokens) renderizarTokens(dados.tokens);
        }
    });
};

// --- RENDERIZAÇÃO DE TOKENS ---
function renderizarTokens(tokensData) {
    const container = document.getElementById('map-container');
    
    // Limpeza
    const existing = document.querySelectorAll('.token');
    existing.forEach(el => { if(!tokensData[el.id]) el.remove(); });

    Object.keys(tokensData).forEach(id => {
        const t = tokensData[id];
        let el = document.getElementById(id);

        if (!el) {
            el = document.createElement('div');
            el.id = id;
            el.className = `token ${t.tipo === 'pc' ? 'token-jogador' : 'token-monstro'}`;
            
            // HTML das Barras
            el.innerHTML = `
                <div class="token-bars-container">
                    <div class="bar-track"><div class="fill-hp"></div></div>
                    <div class="bar-track" style="display:none;"><div class="fill-pf"></div></div>
                </div>
            `;
            
            el.onclick = (e) => { e.stopPropagation(); abrirInfoToken(id, t); };
            el.addEventListener('mousedown', (e) => startDragToken(e, id, t));
            el.addEventListener('touchstart', (e) => startDragToken(e, id, t), {passive: false});
            container.appendChild(el);
        }

        // Imagem
        const imgSrc = t.imagem || 'img/monsters/default.png';
        el.style.backgroundImage = `url('${imgSrc}')`;
        
        el.style.width = (t.tamanho * GRID_SIZE) + 'px';
        el.style.height = (t.tamanho * GRID_SIZE) + 'px';
        
        if (currentTokenId !== id) {
            el.style.left = t.x + 'px';
            el.style.top = t.y + 'px';
        }

        // Atualização de Barras
        const s = t.stats || {};
        const hpBar = el.querySelector('.fill-hp');
        const pfBar = el.querySelector('.fill-pf');
        const pfTrack = pfBar.parentElement;

        // Vida
        if(s.pv_max > 0) {
            const hpPct = Math.max(0, Math.min(100, (s.pv_atual / s.pv_max) * 100));
            hpBar.style.width = hpPct + '%';
        }

        // PF
        if(s.pf_max > 0) {
            pfTrack.style.display = 'block';
            const pfPct = Math.max(0, Math.min(100, (s.pf_atual / s.pf_max) * 100));
            pfBar.style.width = pfPct + '%';
        } else {
            pfTrack.style.display = 'none';
        }
    });
}

// --- MODAL DE DETALHES ---
function abrirInfoToken(id, t) {
    const modal = document.getElementById('token-info-modal') || criarModalInfo();
    const isMestre = window.nomeJogador === "Mestre";
    const s = t.stats || {};
    const vis = s.vis || { hp: false, ac: false, atk: false, dmg: false, desc: false };

    let html = `<h3 style="margin:0 0 15px 0; color:var(--gold); text-align:center; border-bottom:1px solid #333; padding-bottom:5px;">${t.nome}</h3>`;

    const row = (label, val, key) => {
        if (!isMestre && !vis[key]) return ''; 
        const eye = isMestre ? `<span class="eye-btn ${vis[key]?'visible':''}" onclick="toggleInfoVis('${id}', '${key}')">👁️</span>` : '';
        return `<div class="info-row"><span><strong>${label}:</strong> ${val}</span>${eye}</div>`;
    };

    html += row("PV", `${s.pv_atual} / ${s.pv_max}`, 'hp');
    if(s.pf_max > 0) html += row("PF", `${s.pf_atual} / ${s.pf_max}`, 'hp');

    html += row("Dificuldade", s.dificuldade, 'ac');
    html += row("Ataque", s.ataque, 'atk');
    html += row("Dano", s.dano, 'dmg');

    if(isMestre || vis.desc) {
        html += `<div style="margin-top:10px; font-style:italic; font-size:0.9rem; white-space: pre-wrap;">${s.detalhes || ''}</div>`;
        if(isMestre) html += `<div style="text-align:right; margin-top:5px;"><span class="eye-btn ${vis.desc?'visible':''}" onclick="toggleInfoVis('${id}', 'desc')">👁️ Descrição</span></div>`;
    }

    if(isMestre) {
        html += `
            <div class="hp-control-group">
                <button class="btn-dmg" onclick="alterarVidaToken('${id}', -1)">-1 PV</button>
                <button class="btn-heal" onclick="alterarVidaToken('${id}', 1)">+1 PV</button>
                <button class="btn-trash" onclick="removerTokenDoGrid('${id}')">🗑️</button>
            </div>
        `;
    }

    html += `<button onclick="document.getElementById('token-info-modal').style.display='none'" style="width:100%; margin-top:15px; padding:10px;">Fechar</button>`;
    
    modal.innerHTML = html;
    modal.style.display = 'block';
}

function criarModalInfo() {
    const m = document.createElement('div');
    m.id = 'token-info-modal';
    m.className = 'token-info-modal';
    document.body.appendChild(m);
    return m;
}

// --- AÇÕES ---
window.toggleInfoVis = function(tokenId, field) {
    const refVis = window.ref(window.db, `${REF_TABLETOP}/tokens/${tokenId}/stats/vis/${field}`);
    window.get(refVis).then(snap => { window.set(refVis, !snap.val()); });
};

window.alterarVidaToken = function(id, delta) {
    const refStats = window.ref(window.db, `${REF_TABLETOP}/tokens/${id}/stats`);
    window.get(refStats).then(snap => {
        const s = snap.val();
        let novo = (s.pv_atual || 0) + delta;
        if(novo < 0) novo = 0;
        if(novo > s.pv_max) novo = s.pv_max;
        window.update(refStats, { pv_atual: novo });
        document.getElementById('token-info-modal').style.display='none'; // Fecha para atualizar
    });
};

window.removerTokenDoGrid = function(id) {
    if(confirm("Remover este token do mapa?")) {
        window.remove(window.ref(window.db, `${REF_TABLETOP}/tokens/${id}`));
        document.getElementById('token-info-modal').style.display='none';
    }
};

window.toggleVTTMinimizado = function() {
    const area = document.getElementById('tabletop-area');
    const btn = document.getElementById('btn-vtt-toggle');
    vttMinimizado = !vttMinimizado;

    if (vttMinimizado) {
        area.style.display = 'none';
        document.body.classList.remove('vtt-ativo'); 
        btn.innerText = "🗺️ Abrir Mapa";
    } else {
        area.style.display = 'block';
        document.body.classList.add('vtt-ativo');
        btn.innerText = "⬇️ Minimizar";
    }
};

// --- DRAG ---
function startDragToken(e, id, t) {
    const isMestre = window.nomeJogador === "Mestre";
    if(!isMestre && t.tipo !== 'pc') return; 
    
    isDraggingToken = true; currentTokenId = id;
    const el = document.getElementById(id);
    const rect = el.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    window.dragOffset = { x: clientX - rect.left, y: clientY - rect.top };
    
    document.addEventListener('mousemove', moveDragToken);
    document.addEventListener('mouseup', endDragToken);
    document.addEventListener('touchmove', moveDragToken, {passive:false});
    document.addEventListener('touchend', endDragToken);
}

function moveDragToken(e) {
    if(!isDraggingToken) return;
    const el = document.getElementById(currentTokenId);
    const container = document.getElementById('map-container').getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    el.style.left = (clientX - container.left - window.dragOffset.x) + 'px';
    el.style.top = (clientY - container.top - window.dragOffset.y) + 'px';
}

function endDragToken() {
    if(!isDraggingToken) return;
    const el = document.getElementById(currentTokenId);
    let x = Math.round(parseFloat(el.style.left) / GRID_SIZE) * GRID_SIZE;
    let y = Math.round(parseFloat(el.style.top) / GRID_SIZE) * GRID_SIZE;
    window.update(window.ref(window.db, `${REF_TABLETOP}/tokens/${currentTokenId}`), { x: x, y: y });
    isDraggingToken = false;
    document.removeEventListener('mousemove', moveDragToken);
    document.removeEventListener('mouseup', endDragToken);
    document.removeEventListener('touchmove', moveDragToken);
    document.removeEventListener('touchend', endDragToken);
}

// --- SETUP GM & PLAYER ---
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

window.uploadAvatarJogador = function() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = (e) => {
        const r = new FileReader();
        r.onload = (ev) => {
            if(window.nomeJogador) {
                const img = ev.target.result;
                window.update(window.ref(window.db, `mesa_rpg/jogadores/${window.nomeJogador}`), { avatar: img });
                const tokenId = 'pc_' + window.nomeJogador;
                const token = {
                    tipo: 'pc', nome: window.nomeJogador, imagem: img, tamanho: 1, x: 50, y: 50,
                    stats: { pv_atual: 10, pv_max: 10 }
                };
                window.update(window.ref(window.db, `${REF_TABLETOP}/tokens/${tokenId}`), token);
            }
        };
        r.readAsDataURL(e.target.files[0]);
    };
    input.click();
};