// =========================================================
// TABLETOP SYSTEM V8.0 (GM FULLSCREEN & TOKEN CONTROLS)
// =========================================================

const REF_TABLETOP = 'mesa_rpg/tabuleiro';
const GRID_SIZE = 50;

let isDraggingToken = false;
let isPanningMap = false;
let currentTokenId = null;
let dragStartPos = { x: 0, y: 0 };
let mapOffset = { x: 0, y: 0 };
let vttMinimizado = false; // Para jogador

// --- INICIALIZAÇÃO ---
window.iniciarTabletop = function() {
    const area = document.getElementById('tabletop-area');
    const mapContainer = document.getElementById('map-container');
    const btnMinimizar = document.getElementById('btn-vtt-toggle'); // Jogador
    
    if(!area || !mapContainer) return;

    // Pan do Mapa (Mover fundo)
    area.addEventListener('mousedown', startPanMap);
    window.addEventListener('mousemove', movePanMap);
    window.addEventListener('mouseup', endPanMap);

    // Listener Firebase
    window.onValue(window.ref(window.db, REF_TABLETOP), (snap) => {
        const dados = snap.val() || {};
        const config = dados.config || {};
        const tokens = dados.tokens || {};
        const isMestre = window.nomeJogador === "Mestre";

        // Imagem do Mapa
        const imgEl = document.getElementById('map-bg-img');
        if(config.imagem && imgEl.src !== config.imagem) {
            imgEl.src = config.imagem;
            imgEl.onload = () => {
                // Se mestre não estiver fullscreen, usa tamanho real para edição
                if(isMestre && !area.classList.contains('gm-fullscreen')) {
                    mapContainer.style.width = imgEl.naturalWidth + 'px';
                    mapContainer.style.height = imgEl.naturalHeight + 'px';
                }
            };
        }

        // Lógica de Exibição
        if (isMestre) {
            // Mestre sempre vê, mas controlamos se está expandido ou não via botão
            area.style.display = 'block'; 
        } else {
            // Jogador
            if (config.visivel) {
                if(btnMinimizar) btnMinimizar.style.display = 'block';
                if (!vttMinimizado) {
                    area.style.display = 'flex';
                    document.body.classList.add('vtt-ativo'); 
                } else {
                    area.style.display = 'none';
                    document.body.classList.remove('vtt-ativo'); 
                }
            } else {
                area.style.display = 'none';
                if(btnMinimizar) btnMinimizar.style.display = 'none';
                document.body.classList.remove('vtt-ativo');
                vttMinimizado = false;
            }
        }

        renderizarTokens(tokens);
    });
};

function renderizarTokens(tokensData) {
    const container = document.getElementById('map-container');
    const isMestre = window.nomeJogador === "Mestre";
    const existing = document.querySelectorAll('.token');
    
    existing.forEach(el => { if(!tokensData[el.id]) el.remove(); });

    Object.keys(tokensData).forEach(id => {
        const t = tokensData[id];
        // Se for jogador e o token estiver invisível, não renderiza
        if (!isMestre && t.visivel === false) {
            const el = document.getElementById(id);
            if(el) el.remove();
            return;
        }

        let el = document.getElementById(id);
        if (!el) {
            el = document.createElement('div');
            el.id = id;
            el.className = `token ${t.tipo === 'pc' ? 'token-jogador' : 'token-monstro'}`;
            // Barras apenas para Monstros ou se Mestre quiser ver
            el.innerHTML = `<div class="token-bars-container"><div class="bar-track"><div class="fill-hp"></div></div></div>`;
            
            // Eventos
            let clickTime;
            // Mouse Down (Inicia Drag)
            el.addEventListener('mousedown', (e) => { 
                e.stopPropagation(); 
                clickTime = Date.now(); 
                startDragToken(e, id, t); 
            });
            
            // Mouse Up (Detecta clique simples vs drag)
            el.addEventListener('mouseup', (e) => { 
                // Se soltou rápido, não é drag. Mas aqui não faz nada, ação é no DBLCLICK
            });

            // DUPLO CLIQUE (Abre Opções)
            el.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                if(isMestre) abrirModalOpcoesToken(id, t);
            });

            // Touch
            el.addEventListener('touchstart', (e) => { e.stopPropagation(); startDragToken(e, id, t); }, {passive:false});

            container.appendChild(el);
        }

        // Atualiza Classe Oculto (Mestre vê transparente)
        if(isMestre && t.visivel === false) el.classList.add('oculto');
        else el.classList.remove('oculto');

        // Posição (só atualiza se não estiver arrastando este)
        if (currentTokenId !== id) {
            el.style.left = t.x + 'px';
            el.style.top = t.y + 'px';
        }

        // Tamanho e Imagem
        const sizeMult = t.tamanho || 1;
        el.style.width = (sizeMult * GRID_SIZE) + 'px';
        el.style.height = (sizeMult * GRID_SIZE) + 'px';
        el.style.backgroundImage = `url('${t.imagem || 'img/monsters/default.png'}')`;

        // Barras
        const s = t.stats || {};
        const hpBar = el.querySelector('.fill-hp');
        if(s.pv_max > 0) {
            const pct = Math.max(0, Math.min(100, (s.pv_atual / s.pv_max) * 100));
            hpBar.style.width = pct + '%';
        }
    });
}

// --- MODAL DE OPÇÕES (DUPLO CLIQUE) ---
function abrirModalOpcoesToken(id, t) {
    let modal = document.getElementById('token-options-modal');
    if(!modal) {
        modal = document.createElement('div');
        modal.id = 'token-options-modal';
        modal.className = 'token-options-modal';
        document.body.appendChild(modal);
    }

    const visivel = t.visivel !== false; // Default true
    const s = t.stats || { pv_atual:0, pv_max:0, pf_atual:0, pf_max:0 };

    modal.innerHTML = `
        <div class="token-options-header">
            ${t.nome}
            <span class="eye-toggle ${visivel?'visible':''}" onclick="toggleTokenVisibilidade('${id}')" title="Visível para Jogadores?">👁️</span>
        </div>
        
        <div class="token-control-row">
            <span class="token-control-label">Tamanho</span>
            <div style="display:flex; gap:5px;">
                <button class="btn-ctrl" onclick="mudarTamanhoToken('${id}', -0.5)">-</button>
                <span style="color:var(--gold); padding:0 5px;">${t.tamanho||1}x</span>
                <button class="btn-ctrl" onclick="mudarTamanhoToken('${id}', 0.5)">+</button>
            </div>
        </div>

        <div class="token-control-row">
            <span class="token-control-label">Vida (PV)</span>
            <div style="display:flex; gap:5px;">
                <button class="btn-ctrl" style="border-color:#f00" onclick="mudarStatusToken('${id}', 'pv_atual', -1)">-</button>
                <span style="min-width:40px; text-align:center;">${s.pv_atual}/${s.pv_max}</span>
                <button class="btn-ctrl" style="border-color:#0f0" onclick="mudarStatusToken('${id}', 'pv_atual', 1)">+</button>
            </div>
        </div>

        ${s.pf_max > 0 ? `
        <div class="token-control-row">
            <span class="token-control-label">Estresse (PF)</span>
            <div style="display:flex; gap:5px;">
                <button class="btn-ctrl" style="border-color:#00f" onclick="mudarStatusToken('${id}', 'pf_atual', -1)">-</button>
                <span style="min-width:40px; text-align:center;">${s.pf_atual}/${s.pf_max}</span>
                <button class="btn-ctrl" style="border-color:#00f" onclick="mudarStatusToken('${id}', 'pf_atual', 1)">+</button>
            </div>
        </div>` : ''}

        <button class="btn-delete-token" onclick="deletarTokenDefinitivo('${id}')">🗑️ Excluir Token</button>
        <div style="text-align:center; margin-top:10px; cursor:pointer; color:#888;" onclick="document.getElementById('token-options-modal').style.display='none'">Fechar</div>
    `;

    modal.style.display = 'block';
}

// --- AÇÕES DO MODAL ---
window.toggleTokenVisibilidade = function(id) {
    const refVis = window.ref(window.db, `${REF_TABLETOP}/tokens/${id}/visivel`);
    window.get(refVis).then(s => {
        const val = s.val(); // Se for null (undefined), assume true
        window.set(refVis, val === false ? true : false); // Inverte
        document.getElementById('token-options-modal').style.display = 'none';
    });
};

window.mudarTamanhoToken = function(id, delta) {
    const refTam = window.ref(window.db, `${REF_TABLETOP}/tokens/${id}/tamanho`);
    window.get(refTam).then(s => {
        let novo = (parseFloat(s.val()) || 1) + delta;
        if(novo < 0.5) novo = 0.5;
        window.set(refTam, novo);
        document.getElementById('token-options-modal').style.display = 'none';
    });
};

window.mudarStatusToken = function(id, stat, delta) {
    const refStats = window.ref(window.db, `${REF_TABLETOP}/tokens/${id}/stats`);
    window.get(refStats).then(s => {
        const data = s.val();
        let val = (data[stat] || 0) + delta;
        const max = stat === 'pv_atual' ? data.pv_max : data.pf_max;
        if(val < 0) val = 0; if(val > max) val = max;
        
        window.update(refStats, { [stat]: val });
        document.getElementById('token-options-modal').style.display = 'none';
    });
};

window.deletarTokenDefinitivo = function(id) {
    if(confirm("Excluir este token permanentemente?")) {
        window.remove(window.ref(window.db, `${REF_TABLETOP}/tokens/${id}`));
        document.getElementById('token-options-modal').style.display = 'none';
    }
};

// --- CONTROLES GERAIS (GM FULLSCREEN) ---
window.toggleGMFulscreen = function() {
    const area = document.getElementById('tabletop-area');
    area.classList.toggle('gm-fullscreen');
    
    // Reseta o mapa container para garantir alinhamento
    const mapContainer = document.getElementById('map-container');
    if(area.classList.contains('gm-fullscreen')) {
        mapContainer.style.width = 'auto'; 
        mapContainer.style.height = 'auto';
        mapContainer.style.left = 'auto';
        mapContainer.style.top = 'auto';
    } else {
        // Volta ao normal (tamanho da imagem)
        const img = document.getElementById('map-bg-img');
        mapContainer.style.width = img.naturalWidth + 'px';
        mapContainer.style.height = img.naturalHeight + 'px';
        mapContainer.style.left = '0';
        mapContainer.style.top = '0';
    }
};

// --- OUTROS ---
window.uploadMapa = function() {
    const f = document.getElementById('map-upload-input').files[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = (e) => {
        window.update(window.ref(window.db, `${REF_TABLETOP}/config`), { imagem: e.target.result, visivel: false });
    };
    r.readAsDataURL(f);
};

window.toggleMapaVisivel = function() {
    window.get(window.ref(window.db, `${REF_TABLETOP}/config/visivel`)).then(s => {
        window.update(window.ref(window.db, `${REF_TABLETOP}/config`), { visivel: !s.val() });
    });
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
        area.style.display = 'flex';
        document.body.classList.add('vtt-ativo');
        btn.innerText = "⬇️ Minimizar";
    }
};

// --- DRAG LOGIC ---
function startPanMap(e) { 
    if(e.target.id!=='tabletop-area' && !e.target.classList.contains('grid-overlay')) return;
    isPanningMap=true; dragStartPos={x:e.clientX, y:e.clientY}; 
    const c=document.getElementById('map-container'); 
    // Se estiver fullscreen ou jogador, não move (é estático centrado)
    const area = document.getElementById('tabletop-area');
    if(area.classList.contains('gm-fullscreen') || document.body.classList.contains('modo-jogador')) return;

    mapOffset={x:c.offsetLeft, y:c.offsetTop};
}
function movePanMap(e) {
    if(!isPanningMap) return;
    const c=document.getElementById('map-container');
    c.style.left = (mapOffset.x + (e.clientX-dragStartPos.x)) + 'px';
    c.style.top = (mapOffset.y + (e.clientY-dragStartPos.y)) + 'px';
}
function endPanMap() { isPanningMap=false; }

function startDragToken(e, id, t) {
    const isMestre = window.nomeJogador === "Mestre";
    if(!isMestre && t.tipo !== 'pc') return; 
    isDraggingToken=true; currentTokenId=id;
    const el = document.getElementById(id);
    const rect = el.getBoundingClientRect();
    const cx = e.touches?e.touches[0].clientX:e.clientX;
    const cy = e.touches?e.touches[0].clientY:e.clientY;
    dragStartPos = { x: cx - rect.left, y: cy - rect.top };
    
    window.addEventListener('mousemove', moveDragToken); window.addEventListener('mouseup', endDragToken);
    window.addEventListener('touchmove', moveDragToken, {passive:false}); window.addEventListener('touchend', endDragToken);
}
function moveDragToken(e) {
    if(!isDraggingToken) return;
    e.preventDefault();
    const el = document.getElementById(currentTokenId);
    const c = document.getElementById('map-container').getBoundingClientRect();
    const cx = e.touches?e.touches[0].clientX:e.clientX;
    const cy = e.touches?e.touches[0].clientY:e.clientY;
    el.style.left = (cx - c.left - dragStartPos.x) + 'px';
    el.style.top = (cy - c.top - dragStartPos.y) + 'px';
}
function endDragToken() {
    if(!isDraggingToken) return;
    const el = document.getElementById(currentTokenId);
    let x = Math.round(parseFloat(el.style.left)/GRID_SIZE)*GRID_SIZE;
    let y = Math.round(parseFloat(el.style.top)/GRID_SIZE)*GRID_SIZE;
    window.update(window.ref(window.db, `${REF_TABLETOP}/tokens/${currentTokenId}`), {x:x, y:y});
    isDraggingToken=false;
    window.removeEventListener('mousemove', moveDragToken); window.removeEventListener('mouseup', endDragToken);
    window.removeEventListener('touchmove', moveDragToken); window.removeEventListener('touchend', endDragToken);
}

// Helpers para criação (vindas do inimigos.js)
window.criarTokenMonstro = function(k, dados) {
    const imgSrc = dados.imagem || 'img/monsters/default.png';
    const tokenId = 'mob_' + Date.now();
    const novoToken = {
        tipo: 'mob', nome: dados.nome, imagem: imgSrc, tamanho: dados.tamanho||1, x: 100, y: 100, visivel: true,
        stats: { ...dados }
    };
    window.update(window.ref(window.db, `${REF_TABLETOP}/tokens/${tokenId}`), novoToken);
    alert("Token Criado!");
};
window.criarTokenPC = function(nome, img) {
    const id = 'pc_' + Date.now();
    const t = { tipo: 'pc', nome: nome, imagem: img, tamanho: 1, x: 150, y: 150, visivel: true, stats: { pv_atual:6, pv_max:6 } };
    window.update(window.ref(window.db, `${REF_TABLETOP}/tokens/${id}`), t);
    document.getElementById('modal-criar-token-pc').style.display = 'none';
};