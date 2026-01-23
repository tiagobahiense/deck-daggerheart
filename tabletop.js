// =========================================================
// TABLETOP SYSTEM V6.0 (GM PLAYER TOKEN & MAP FIX)
// =========================================================

const REF_TABLETOP = 'mesa_rpg/tabuleiro';
const GRID_SIZE = 50;

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

    // Pan do Mapa
    area.addEventListener('mousedown', startPanMap);
    window.addEventListener('mousemove', movePanMap);
    window.addEventListener('mouseup', endPanMap);

    window.onValue(window.ref(window.db, REF_TABLETOP), (snap) => {
        const dados = snap.val() || {};
        
        // Configuração Mapa
        if(dados.config && dados.config.imagem) {
            const isMestre = window.nomeJogador === "Mestre";
            const imgEl = document.getElementById('map-bg-img');

            if(imgEl.src !== dados.config.imagem) {
                imgEl.src = dados.config.imagem;
                imgEl.onload = () => {
                    mapContainer.style.width = imgEl.naturalWidth + 'px';
                    mapContainer.style.height = imgEl.naturalHeight + 'px';
                };
            }

            // Exibição
            if (isMestre) {
                area.style.display = 'block'; 
            } else {
                if (dados.config.visivel) {
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
            el.innerHTML = `<div class="token-bars-container"><div class="bar-track"><div class="fill-hp"></div></div></div>`;
            
            // Eventos
            let clickTime;
            el.addEventListener('mousedown', (e) => { e.stopPropagation(); clickTime = Date.now(); startDragToken(e, id, t); });
            el.addEventListener('mouseup', (e) => { if (Date.now() - clickTime < 200 && !isDraggingToken) abrirInfoToken(id, t); });
            el.addEventListener('touchstart', (e) => { e.stopPropagation(); clickTime = Date.now(); startDragToken(e, id, t); }, {passive:false});
            el.addEventListener('touchend', (e) => { if (Date.now() - clickTime < 200 && !isDraggingToken) abrirInfoToken(id, t); });

            container.appendChild(el);
        }

        if (currentTokenId !== id) {
            el.style.left = t.x + 'px';
            el.style.top = t.y + 'px';
        }

        const imgSrc = t.imagem || 'img/monsters/default.png';
        el.style.backgroundImage = `url('${imgSrc}')`;
        el.style.width = (t.tamanho * GRID_SIZE) + 'px';
        el.style.height = (t.tamanho * GRID_SIZE) + 'px';

        const s = t.stats || {};
        const hpBar = el.querySelector('.fill-hp');
        if(s.pv_max > 0) {
            const pct = Math.max(0, Math.min(100, (s.pv_atual / s.pv_max) * 100));
            hpBar.style.width = pct + '%';
        }
    });
}

function abrirInfoToken(id, t) {
    const modal = document.getElementById('token-info-modal') || criarModalInfo();
    const isMestre = window.nomeJogador === "Mestre";
    const s = t.stats || {};
    const vis = s.vis || { hp:false, ac:false, atk:false, dmg:false, desc:false };

    let html = `<h3 style="margin:0 0 10px 0; color:var(--gold); text-align:center;">${t.nome}</h3>`;

    const row = (lbl, val, k) => {
        if (!isMestre && !vis[k] && t.tipo !== 'pc') return `<div class="info-row"><span><strong>${lbl}:</strong> ???</span></div>`;
        // Se for PC, jogadores veem tudo
        const ver = (t.tipo === 'pc' || isMestre || vis[k]); 
        if(!ver) return '';
        
        const eye = isMestre ? `<span class="eye-btn ${vis[k]?'visible':''}" onclick="toggleInfoVis('${id}', '${k}')">👁️</span>` : '';
        return `<div class="info-row"><span><strong>${lbl}:</strong> ${val}</span>${eye}</div>`;
    };

    html += row("PV", `${s.pv_atual}/${s.pv_max}`, 'hp');
    html += row("Defesa", s.dificuldade, 'ac');
    html += row("Ataque", s.ataque, 'atk');
    html += row("Dano", s.dano, 'dmg');

    if(isMestre) {
        html += `<div class="hp-control-group">
            <button class="btn-dmg" onclick="alterarVidaToken('${id}', -1)">-1</button>
            <button class="btn-heal" onclick="alterarVidaToken('${id}', 1)">+1</button>
            <button class="btn-trash" onclick="removerTokenDoGrid('${id}')">🗑️</button>
        </div>`;
    }
    html += `<button onclick="document.getElementById('token-info-modal').style.display='none'" style="width:100%; margin-top:10px;">Fechar</button>`;
    
    modal.innerHTML = html;
    modal.style.display = 'block';
}

function criarModalInfo() {
    const m = document.createElement('div'); m.id='token-info-modal'; m.className='token-info-modal';
    document.body.appendChild(m); return m;
}

// --- FUNÇÕES GM ---
window.criarTokenMonstro = function(k, d) {
    const id = 'mob_' + Date.now();
    const t = {
        tipo: 'mob', nome: d.nome, imagem: d.imagem||'', tamanho: 1, x: 100, y: 100,
        stats: { ...d, vis: { hp:false, ac:false, atk:false, dmg:false, desc:false } }
    };
    window.update(window.ref(window.db, `${REF_TABLETOP}/tokens/${id}`), t);
    alert("Monstro Criado!");
};

window.criarTokenPC = function(nome, img) {
    const id = 'pc_' + Date.now();
    const t = {
        tipo: 'pc', nome: nome, imagem: img, tamanho: 1, x: 150, y: 150,
        stats: { pv_atual:6, pv_max:6, dificuldade:10, ataque:"+0", dano:"1d8" } // Padrão
    };
    window.update(window.ref(window.db, `${REF_TABLETOP}/tokens/${id}`), t);
    // Fecha modal
    document.getElementById('modal-criar-token-pc').style.display = 'none';
};

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
    const a = document.getElementById('tabletop-area');
    const b = document.getElementById('btn-vtt-toggle');
    vttMinimizado = !vttMinimizado;
    if(vttMinimizado) { a.style.display='none'; document.body.classList.remove('vtt-ativo'); b.innerText="🗺️ Abrir"; }
    else { a.style.display='block'; document.body.classList.add('vtt-ativo'); b.innerText="⬇️ Minimizar"; }
};

window.toggleInfoVis = function(id, f) {
    const r = window.ref(window.db, `${REF_TABLETOP}/tokens/${id}/stats/vis/${f}`);
    window.get(r).then(s => { window.set(r, !s.val()); document.getElementById('token-info-modal').style.display='none'; });
};
window.alterarVidaToken = function(id, d) {
    const r = window.ref(window.db, `${REF_TABLETOP}/tokens/${id}/stats`);
    window.get(r).then(s => { 
        let v = (s.val().pv_atual||0)+d; 
        if(v<0)v=0; if(v>s.val().pv_max)v=s.val().pv_max; 
        window.update(r, {pv_atual:v}); document.getElementById('token-info-modal').style.display='none';
    });
};
window.removerTokenDoGrid = function(id) {
    if(confirm("Remover?")) { window.remove(window.ref(window.db, `${REF_TABLETOP}/tokens/${id}`)); document.getElementById('token-info-modal').style.display='none'; }
};

// Drag & Pan (Simplificado)
function startPanMap(e) { 
    if(e.target.id!=='tabletop-area' && !e.target.classList.contains('grid-overlay')) return;
    isPanningMap=true; dragStartPos={x:e.clientX, y:e.clientY}; 
    const c=document.getElementById('map-container'); mapOffset={x:c.offsetLeft, y:c.offsetTop};
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
    dragStartPos = { x: e.clientX - el.getBoundingClientRect().left, y: e.clientY - el.getBoundingClientRect().top };
    window.addEventListener('mousemove', moveDragToken); window.addEventListener('mouseup', endDragToken);
    window.addEventListener('touchmove', moveDragToken); window.addEventListener('touchend', endDragToken);
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