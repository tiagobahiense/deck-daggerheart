// =========================================================
// TABLETOP SYSTEM V7.0 (SYNC REAL-TIME, SCALE & PF)
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

    // LISTENER ÚNICO E ROBUSTO
    window.onValue(window.ref(window.db, REF_TABLETOP), (snap) => {
        const dados = snap.val() || {};
        const config = dados.config || {};
        const tokens = dados.tokens || {};
        
        // 1. Configuração do Mapa e Visibilidade
        const isMestre = window.nomeJogador === "Mestre";
        const mapaAtivo = config.visivel;
        const imgEl = document.getElementById('map-bg-img');

        // Atualiza Imagem se mudou
        if(config.imagem && imgEl.src !== config.imagem) {
            imgEl.src = config.imagem;
            imgEl.onload = () => {
                if(isMestre) { // Mestre usa tamanho real para editar
                    mapContainer.style.width = imgEl.naturalWidth + 'px';
                    mapContainer.style.height = imgEl.naturalHeight + 'px';
                }
            };
        }

        // Lógica de Exibição (Sincronia Player/Mestre)
        if (isMestre) {
            area.style.display = 'block'; // Mestre vê sempre
        } else {
            if (mapaAtivo) {
                // Se o mestre ativou, o jogador VÊ.
                btnMinimizar.style.display = 'block';
                if (!vttMinimizado) {
                    area.style.display = 'flex'; // Flex para centralizar
                    document.body.classList.add('vtt-ativo'); 
                } else {
                    area.style.display = 'none';
                    document.body.classList.remove('vtt-ativo'); 
                }
            } else {
                // Se o mestre fechou, fecha pra todos na hora
                area.style.display = 'none';
                btnMinimizar.style.display = 'none';
                document.body.classList.remove('vtt-ativo');
                vttMinimizado = false; // Reseta estado
            }
        }

        // 2. Renderiza Tokens
        renderizarTokens(tokens);
    });
};

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
            // Define classes base
            el.className = `token ${t.tipo === 'pc' ? 'token-jogador' : 'token-monstro'}`;
            
            // Só monstros têm barra de vida visível por padrão
            let htmlBarras = '';
            if(t.tipo === 'mob') {
                htmlBarras = `<div class="token-bars-container"><div class="bar-track"><div class="fill-hp"></div></div><div class="bar-track pf-track" style="display:none; margin-top:2px;"><div class="fill-pf"></div></div></div>`;
            }
            el.innerHTML = htmlBarras;
            
            // Eventos
            let clickTime;
            el.addEventListener('mousedown', (e) => { e.stopPropagation(); clickTime = Date.now(); startDragToken(e, id, t); });
            el.addEventListener('mouseup', (e) => { if (Date.now() - clickTime < 200 && !isDraggingToken) abrirInfoToken(id, t); });
            el.addEventListener('touchstart', (e) => { e.stopPropagation(); clickTime = Date.now(); startDragToken(e, id, t); }, {passive:false});
            el.addEventListener('touchend', (e) => { if (Date.now() - clickTime < 200 && !isDraggingToken) abrirInfoToken(id, t); });

            container.appendChild(el);
        }

        // Posicionamento
        if (currentTokenId !== id) {
            el.style.left = t.x + 'px';
            el.style.top = t.y + 'px';
        }

        // Estilo e Tamanho (ESCALA)
        const sizeMult = t.tamanho || 1; // 1, 2, 3...
        el.style.width = (sizeMult * GRID_SIZE) + 'px';
        el.style.height = (sizeMult * GRID_SIZE) + 'px';
        
        const imgSrc = t.imagem || 'img/monsters/default.png';
        el.style.backgroundImage = `url('${imgSrc}')`;

        // Atualiza Barras (Apenas monstros)
        if(t.tipo === 'mob') {
            const s = t.stats || {};
            const hpBar = el.querySelector('.fill-hp');
            const pfTrack = el.querySelector('.pf-track');
            const pfBar = el.querySelector('.fill-pf');

            if(hpBar && s.pv_max > 0) {
                const pct = Math.max(0, Math.min(100, (s.pv_atual / s.pv_max) * 100));
                hpBar.style.width = pct + '%';
            }
            if(pfBar && s.pf_max > 0) {
                pfTrack.style.display = 'block';
                const pctPf = Math.max(0, Math.min(100, (s.pf_atual / s.pf_max) * 100));
                pfBar.style.width = pctPf + '%';
            } else if (pfTrack) {
                pfTrack.style.display = 'none';
            }
        }
    });
}

// --- INFO MODAL ---
function abrirInfoToken(id, t) {
    // Se for jogador e clicar em monstro, não mostra NADA (nem abre modal) se não for mestre
    // A MENOS que tenha alguma info visível. Vamos simplificar: Player só clica no seu.
    const isMestre = window.nomeJogador === "Mestre";
    if (!isMestre && t.tipo === 'mob') return; // Jogador não abre ficha de monstro

    const modal = document.getElementById('token-info-modal') || criarModalInfo();
    const s = t.stats || {};
    const vis = s.vis || { hp:false, ac:false, atk:false, dmg:false, desc:false };

    let html = `<h3 style="margin:0 0 10px 0; color:var(--gold); text-align:center;">${t.nome}</h3>`;

    const row = (lbl, val, k) => {
        const eye = isMestre ? `<span class="eye-btn ${vis[k]?'visible':''}" onclick="toggleInfoVis('${id}', '${k}')">👁️</span>` : '';
        return `<div class="info-row"><span><strong>${lbl}:</strong> ${val}</span>${eye}</div>`;
    };

    html += row("PV", `${s.pv_atual}/${s.pv_max}`, 'hp');
    if(s.pf_max > 0) html += row("PF", `${s.pf_atual}/${s.pf_max}`, 'hp'); // Usa visibilidade do HP por enq

    html += row("Defesa", s.dificuldade, 'ac');
    html += row("Ataque", s.ataque, 'atk');
    html += row("Dano", s.dano, 'dmg');

    if(isMestre) {
        html += `<div style="margin-top:10px; font-size:0.8rem; color:#aaa;">${s.detalhes || ''}</div>`;
        // CONTROLES DE VIDA E PF
        html += `
        <div style="margin-top:15px; border-top:1px solid #333; padding-top:10px;">
            <div style="display:flex; justify-content:space-between; margin-bottom:5px; color:#ddd; font-size:0.8rem;">
                <span>Vida (PV)</span>
                <span>Fadiga (PF)</span>
            </div>
            <div style="display:flex; gap:10px;">
                <div class="hp-control-group" style="flex:1; margin:0;">
                    <button class="btn-dmg" onclick="alterarStatToken('${id}', 'pv_atual', -1)">-1</button>
                    <button class="btn-heal" onclick="alterarStatToken('${id}', 'pv_atual', 1)">+1</button>
                </div>
                ${s.pf_max > 0 ? `
                <div class="hp-control-group" style="flex:1; margin:0;">
                    <button class="btn-dmg" style="border-color:#00f; background:#003;" onclick="alterarStatToken('${id}', 'pf_atual', -1)">-1</button>
                    <button class="btn-heal" style="border-color:#00f; background:#003;" onclick="alterarStatToken('${id}', 'pf_atual', 1)">+1</button>
                </div>` : ''}
            </div>
            <button class="btn-trash" onclick="removerTokenDoGrid('${id}')" style="width:100%; margin-top:10px; background:#300;">🗑️ Excluir Token</button>
        </div>`;
    }

    html += `<button onclick="document.getElementById('token-info-modal').style.display='none'" style="width:100%; margin-top:10px; background:#222; border:1px solid #555; color:#ccc;">Fechar</button>`;
    
    modal.innerHTML = html;
    modal.style.display = 'block';
}

function criarModalInfo() {
    const m = document.createElement('div'); m.id='token-info-modal'; m.className='token-info-modal';
    document.body.appendChild(m); return m;
}

// --- AÇÕES DO MESTRE ---
window.toggleInfoVis = function(id, f) {
    const r = window.ref(window.db, `${REF_TABLETOP}/tokens/${id}/stats/vis/${f}`);
    window.get(r).then(s => { window.set(r, !s.val()); document.getElementById('token-info-modal').style.display='none'; });
};

window.alterarStatToken = function(id, stat, delta) {
    const r = window.ref(window.db, `${REF_TABLETOP}/tokens/${id}/stats`);
    window.get(r).then(snap => { 
        const s = snap.val();
        const max = stat === 'pv_atual' ? s.pv_max : s.pf_max;
        let v = (s[stat]||0)+delta; 
        if(v<0)v=0; if(v>max)v=max; 
        
        const updates = {};
        updates[stat] = v;
        window.update(r, updates);
        
        // Animação visual na barra (Feedback imediato)
        const el = document.getElementById(id);
        if(el && stat === 'pv_atual') {
            const bar = el.querySelector('.fill-hp');
            if(bar) {
                bar.classList.add(delta < 0 ? 'dano' : 'cura');
                setTimeout(() => bar.classList.remove('dano', 'cura'), 300);
            }
        }
        document.getElementById('token-info-modal').style.display='none';
    });
};

window.removerTokenDoGrid = function(id) {
    if(confirm("Tem certeza que deseja excluir este token?")) { 
        window.remove(window.ref(window.db, `${REF_TABLETOP}/tokens/${id}`)); 
        document.getElementById('token-info-modal').style.display='none'; 
    }
};

window.criarTokenMonstro = function(keyIgnorada, dados) {
    // Recebe escala do modal ou padrão 1
    const tamanho = parseInt(dados.tamanho) || 1;
    const imgSrc = dados.imagem || 'img/monsters/default.png';
    const tokenId = 'mob_' + Date.now();
    const novoToken = {
        tipo: 'mob', nome: dados.nome, imagem: imgSrc, 
        tamanho: tamanho, // Salva escala
        x: 100, y: 100,
        stats: { ...dados, vis: { hp:false, ac:false, atk:false, dmg:false, desc:false } }
    };
    window.update(window.ref(window.db, `${REF_TABLETOP}/tokens/${tokenId}`), novoToken);
    alert("Monstro Criado!");
};

window.criarTokenPC = function(nome, img) {
    const id = 'pc_' + Date.now();
    const t = {
        tipo: 'pc', nome: nome, imagem: img, tamanho: 1, x: 150, y: 150,
        stats: { pv_atual:6, pv_max:6 } 
    };
    window.update(window.ref(window.db, `${REF_TABLETOP}/tokens/${id}`), t);
    document.getElementById('modal-criar-token-pc').style.display = 'none';
};

// ... (Funções de Upload e Drag iguais a V5.0) ...
// (Mantenha o uploadMapa, toggleMapaVisivel, startPanMap etc do código anterior, 
//  só alterei o onValue e renderizarTokens que são o coração do problema)

window.uploadMapa = function() {
    const f = document.getElementById('map-upload-input').files[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = (e) => { window.update(window.ref(window.db, `${REF_TABLETOP}/config`), { imagem: e.target.result, visivel: false }); };
    r.readAsDataURL(f);
};
window.toggleMapaVisivel = function() {
    window.get(window.ref(window.db, `${REF_TABLETOP}/config/visivel`)).then(s => { window.update(window.ref(window.db, `${REF_TABLETOP}/config`), { visivel: !s.val() }); });
};
window.toggleVTTMinimizado = function() {
    const a = document.getElementById('tabletop-area');
    const b = document.getElementById('btn-vtt-toggle');
    vttMinimizado = !vttMinimizado;
    if(vttMinimizado) { a.style.display='none'; document.body.classList.remove('vtt-ativo'); b.innerText="🗺️ Abrir"; }
    else { a.style.display='flex'; document.body.classList.add('vtt-ativo'); b.innerText="⬇️ Minimizar"; }
};

// Drag & Pan (Importante manter)
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