// =========================================================
// TABLETOP SYSTEM V2.0 (VITRAL, HAND HIDE, INFO MODAL)
// =========================================================

const REF_TABLETOP = 'mesa_rpg/tabuleiro';
const GRID_SIZE = 50;
let isDraggingToken = false;
let currentTokenId = null;

// --- INICIALIZAÇÃO E LISTENERS ---
window.iniciarTabletop = function() {
    const area = document.getElementById('tabletop-area');
    if(!area) return;

    window.onValue(window.ref(window.db, REF_TABLETOP), (snap) => {
        const dados = snap.val();
        
        // 1. Controle de Visibilidade do Mapa
        if(dados && dados.config && dados.config.imagem) {
            const isMestre = window.nomeJogador === "Mestre";
            
            if (dados.config.visivel || isMestre) {
                area.style.display = 'block';
                document.getElementById('map-bg-img').src = dados.config.imagem;
                
                // SE FOR JOGADOR e MAPA VISIVEL -> Esconde Mão e Mostra Vitral
                if(!isMestre && dados.config.visivel) {
                    document.body.classList.add('vtt-ativo');
                    document.getElementById('player-portrait-container').style.display = 'block';
                }
            } else {
                area.style.display = 'none';
                document.body.classList.remove('vtt-ativo');
                document.getElementById('player-portrait-container').style.display = 'none';
            }

            if(dados.tokens) renderizarTokens(dados.tokens);
        }
    });

    // Listener do Avatar do Jogador (Vitral)
    if(window.nomeJogador && window.nomeJogador !== "Mestre") {
        window.onValue(window.ref(window.db, `mesa_rpg/jogadores/${window.nomeJogador}/avatar`), (snap) => {
            if(snap.exists()) {
                document.getElementById('player-portrait-img').src = snap.val();
            }
        });
    }
};

function renderizarTokens(tokensData) {
    const container = document.getElementById('map-container');
    const existing = document.querySelectorAll('.token');
    existing.forEach(el => { if(!tokensData[el.id]) el.remove(); });

    Object.keys(tokensData).forEach(id => {
        const t = tokensData[id];
        let el = document.getElementById(id);

        if (!el) {
            el = document.createElement('div');
            el.id = id;
            el.className = `token ${t.tipo === 'pc' ? 'token-jogador' : 'token-monstro'}`;
            // Clique abre Info
            el.onclick = (e) => { e.stopPropagation(); abrirInfoToken(id, t); };
            
            // Drag (Mestre ou Dono)
            el.addEventListener('mousedown', (e) => startDragToken(e, id, t));
            el.addEventListener('touchstart', (e) => startDragToken(e, id, t), {passive: false});
            
            el.innerHTML = `<div class="token-hp-bar"><div class="token-hp-fill"></div></div>`;
            container.appendChild(el);
        }

        el.style.backgroundImage = `url('${t.imagem}')`;
        el.style.width = (t.tamanho * GRID_SIZE) + 'px';
        el.style.height = (t.tamanho * GRID_SIZE) + 'px';
        if (currentTokenId !== id) {
            el.style.left = t.x + 'px';
            el.style.top = t.y + 'px';
        }

        // Barra de Vida
        const bar = el.querySelector('.token-hp-fill');
        if(t.stats && t.stats.pv_max) {
            const pct = (t.stats.pv_atual / t.stats.pv_max) * 100;
            bar.style.width = pct + '%';
        }
    });
}

// --- INFO MODAL (O PULO DO GATO) ---
function abrirInfoToken(id, t) {
    const modal = document.getElementById('token-info-modal') || criarModalInfo();
    const isMestre = window.nomeJogador === "Mestre";
    const s = t.stats || {};
    const vis = s.vis || { hp: false, ac: false, atk: false, dmg: false, desc: false }; // Defaults

    let html = `<h3 style="margin:0 0 10px 0; color:var(--gold); text-align:center;">${t.nome}</h3>`;

    // Função auxiliar para gerar linha com Toggle
    const linha = (label, valor, key) => {
        if (!isMestre && !vis[key]) return ''; // Jogador não vê se oculto
        
        const olho = isMestre ? 
            `<span class="eye-toggle ${vis[key]?'visible':''}" onclick="toggleInfoVis('${id}', '${key}')">👁️</span>` : '';
        
        return `<div class="token-info-row">
                    <span><strong>${label}:</strong> ${valor}</span>
                    ${olho}
                </div>`;
    };

    html += linha("PV", `${s.pv_atual} / ${s.pv_max}`, 'hp');
    html += linha("Dificuldade", s.dificuldade, 'ac');
    html += linha("Ataque", s.ataque, 'atk');
    html += linha("Dano", s.dano, 'dmg');
    
    if(isMestre || vis.desc) {
        html += `<div style="margin-top:10px; font-size:0.9rem; font-style:italic;">${s.detalhes || ''}</div>`;
        if(isMestre) html += `<span class="eye-toggle ${vis.desc?'visible':''}" onclick="toggleInfoVis('${id}', 'desc')" style="float:right;">👁️ Descrição</span>`;
    }

    if(isMestre) {
        html += `<div style="display:flex; gap:5px; margin-top:15px;">
                    <button onclick="alterarVidaToken('${id}', -1)" style="flex:1; background:#500; color:white;">-1 PV</button>
                    <button onclick="alterarVidaToken('${id}', 1)" style="flex:1; background:#050; color:white;">+1 PV</button>
                    <button onclick="removerToken('${id}')" style="flex:1; background:#333; border:1px solid red;">🗑️</button>
                 </div>`;
    }

    html += `<button onclick="document.getElementById('token-info-modal').style.display='none'" style="width:100%; margin-top:10px;">Fechar</button>`;

    modal.innerHTML = html;
    modal.style.display = 'block';
}

// Cria o modal dinamicamente no Jogador se não existir
function criarModalInfo() {
    const m = document.createElement('div');
    m.id = 'token-info-modal';
    m.className = 'token-info-modal';
    document.body.appendChild(m);
    return m;
}

// --- AÇÕES DO MESTRE ---
window.toggleInfoVis = function(tokenId, field) {
    // Busca o valor atual e inverte
    const refVis = window.ref(window.db, `${REF_TABLETOP}/tokens/${tokenId}/stats/vis/${field}`);
    window.get(refVis).then(snap => {
        window.set(refVis, !snap.val());
        // O listener global vai atualizar a tela automaticamente
        setTimeout(() => document.getElementById('token-info-modal').style.display='none', 100); // Fecha pra reabrir atualizado
    });
};

window.alterarVidaToken = function(id, delta) {
    const refPV = window.ref(window.db, `${REF_TABLETOP}/tokens/${id}/stats/pv_atual`);
    window.get(refPV).then(snap => {
        let atual = snap.val();
        window.set(refPV, atual + delta);
        setTimeout(() => document.getElementById('token-info-modal').style.display='none', 100);
    });
};

window.removerToken = function(id) {
    if(confirm("Remover token?")) {
        window.remove(window.ref(window.db, `${REF_TABLETOP}/tokens/${id}`));
        document.getElementById('token-info-modal').style.display='none';
    }
};

window.criarTokenMonstro = function(monstroId, dados) {
    const tokenId = 'mob_' + Date.now();
    const novoToken = {
        tipo: 'mob',
        nome: dados.nome,
        imagem: dados.imagem || '',
        tamanho: 1,
        x: 100, y: 100,
        stats: { ...dados } // Copia todos os status e visibilidade
    };
    window.update(window.ref(window.db, `${REF_TABLETOP}/tokens/${tokenId}`), novoToken);
};

// --- UPLOAD MAPA E DRAG (MANTIDOS DO CÓDIGO ANTERIOR) ---
window.uploadMapa = function() { /* ... igual anterior ... */ 
    const file = document.getElementById('map-upload-input').files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
        window.update(window.ref(window.db, `${REF_TABLETOP}/config`), { imagem: e.target.result, visivel: false });
    };
    if(file) reader.readAsDataURL(file);
};
window.toggleMapaVisivel = function() { /* ... igual anterior ... */ 
    window.get(window.ref(window.db, `${REF_TABLETOP}/config/visivel`)).then(s => {
        window.update(window.ref(window.db, `${REF_TABLETOP}/config`), { visivel: !s.val() });
    });
};

// Drag Logic (Simplificado para o exemplo)
function startDragToken(e, id, t) {
    const isMestre = window.nomeJogador === "Mestre";
    if(!isMestre && t.tipo !== 'pc') return; // Jogador só move o dele (PC)
    // ... código de drag igual ao anterior ...
    isDraggingToken = true; currentTokenId = id;
    const el = document.getElementById(id);
    const rect = el.getBoundingClientRect();
    // Offset visual
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    window.dragOffset = { x: clientX - rect.left, y: clientY - rect.top };
    
    document.addEventListener('mousemove', moveDragToken);
    document.addEventListener('mouseup', endDragToken);
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
}

// UPLOAD DE AVATAR (JOGADOR)
window.uploadAvatarJogador = function() {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = 'image/*';
    input.onchange = (e) => {
        const r = new FileReader();
        r.onload = (ev) => {
            // Salva no perfil do jogador E cria/atualiza token
            if(window.nomeJogador) {
                const img = ev.target.result;
                window.update(window.ref(window.db, `mesa_rpg/jogadores/${window.nomeJogador}`), { avatar: img });
                
                // Cria Token PC se não existir
                const tokenId = 'pc_' + window.nomeJogador;
                const token = {
                    tipo: 'pc', nome: window.nomeJogador, imagem: img, tamanho: 1, x: 50, y: 50,
                    stats: { pv_atual: 10, pv_max: 10 } // Exemplo
                };
                window.update(window.ref(window.db, `${REF_TABLETOP}/tokens/${tokenId}`), token);
            }
        };
        r.readAsDataURL(e.target.files[0]);
    };
    input.click();
};