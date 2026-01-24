// =========================================================
// TABLETOP SYSTEM V10.0 (FIT CONTAINER & VISIBILITY)
// =========================================================

const REF_TABLETOP = 'mesa_rpg/tabuleiro';
const GRID_SIZE = 50;

let isDraggingToken = false;
let currentTokenId = null;
let dragStartPos = { x: 0, y: 0 };
let vttMinimizado = false;

// --- INICIALIZAÇÃO ---
window.iniciarTabletop = function() {
    const area = document.getElementById('tabletop-area');
    const btnMinimizar = document.getElementById('btn-vtt-toggle');
    const imgEl = document.getElementById('map-bg-img');
    
    if(!area) return;

    // Listener de Resize para recalcular escala
    window.addEventListener('resize', resizeMapToFit);

    window.onValue(window.ref(window.db, REF_TABLETOP), (snap) => {
        const dados = snap.val() || {};
        const config = dados.config || {};
        const tokens = dados.tokens || {};
        const isMestre = window.nomeJogador === "Mestre";

        // 1. Imagem
        if(config.imagem && imgEl.src !== config.imagem) {
            imgEl.src = config.imagem;
            imgEl.onload = () => resizeMapToFit();
        }

        // 2. Exibição
        if (isMestre) {
            area.style.display = 'block'; 
            // O mestre vê sempre, o resize cuida do tamanho (janela ou full)
            requestAnimationFrame(resizeMapToFit);
        } else {
            // Jogador
            if (config.visivel) {
                if(btnMinimizar) btnMinimizar.style.display = 'block';
                
                if (!vttMinimizado) {
                    area.style.display = 'block';
                    document.body.classList.add('vtt-ativo'); 
                    requestAnimationFrame(resizeMapToFit);
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

// --- ESCALA PERFEITA (FIT CONTAINER) ---
function resizeMapToFit() {
    const area = document.getElementById('tabletop-area');
    const scaler = document.getElementById('map-scaler');
    const img = document.getElementById('map-bg-img');
    
    if (!img.naturalWidth || area.style.display === 'none') return;

    // Dimensões da Imagem
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;

    // Dimensões do Container Disponível
    // Se for fullscreen (Player ou GM Expandido), usa janela.
    // Se for GM Janela, usa o pai do area.
    const isFullscreen = document.body.classList.contains('gm-mode-fullscreen') || document.body.classList.contains('modo-jogador');
    
    let containerW, containerH;

    if (isFullscreen) {
        containerW = window.innerWidth;
        containerH = window.innerHeight;
    } else {
        // Modo janela do GM (pega o tamanho da div central)
        const parent = area.parentElement;
        containerW = parent.clientWidth;
        containerH = parent.clientHeight;
    }

    // Calcula escala para "Caber" (Contain)
    const scale = Math.min(containerW / imgW, containerH / imgH);

    // Aplica no Scaler
    scaler.style.width = imgW + 'px';
    scaler.style.height = imgH + 'px';
    scaler.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

// --- RENDERIZAÇÃO ---
function renderizarTokens(tokensData) {
    const container = document.getElementById('map-container');
    const isMestre = window.nomeJogador === "Mestre";
    const existing = document.querySelectorAll('.token');
    
    existing.forEach(el => { if(!tokensData[el.id]) el.remove(); });

    Object.keys(tokensData).forEach(id => {
        const t = tokensData[id];
        
        // Visibilidade
        if (!isMestre && t.visivel === false) {
            const el = document.getElementById(id); if(el) el.remove(); return;
        }

        let el = document.getElementById(id);
        if (!el) {
            el = document.createElement('div');
            el.id = id;
            el.className = `token ${t.tipo === 'pc' ? 'token-jogador' : 'token-monstro'}`;
            // Barras apenas se tiver status
            el.innerHTML = `<div class="token-bars-container"><div class="fill-hp"></div><div class="fill-pf" style="margin-top:2px;"></div></div>`;
            
            // Eventos
            el.addEventListener('mousedown', (e) => { e.stopPropagation(); startDragToken(e, id); });
            el.addEventListener('click', (e) => { e.stopPropagation(); if(!isMestre) abrirInfoToken(id); });
            el.addEventListener('dblclick', (e) => { e.stopPropagation(); if(isMestre) abrirInfoToken(id); });
            el.addEventListener('touchstart', (e) => { e.stopPropagation(); startDragToken(e, id); }, {passive:false});

            container.appendChild(el);
        }

        // Classe Oculto
        if(isMestre && t.visivel === false) el.classList.add('oculto');
        else el.classList.remove('oculto');

        // Posição
        if (currentTokenId !== id) {
            el.style.left = t.x + 'px';
            el.style.top = t.y + 'px';
        }

        // Estilo
        const sizeMult = t.tamanho || 1;
        el.style.width = (sizeMult * GRID_SIZE) + 'px';
        el.style.height = (sizeMult * GRID_SIZE) + 'px';
        el.style.backgroundImage = `url('${t.imagem || 'img/monsters/default.png'}')`;

        // Barras
        const s = t.stats || {};
        const hpBar = el.querySelector('.fill-hp');
        const pfBar = el.querySelector('.fill-pf');
        
        if(hpBar && s.pv_max > 0) hpBar.style.width = Math.min(100, (s.pv_atual/s.pv_max)*100) + '%';
        if(pfBar) {
            if(s.pf_max > 0) {
                pfBar.style.display = 'block';
                pfBar.style.width = Math.min(100, (s.pf_atual/s.pf_max)*100) + '%';
            } else pfBar.style.display = 'none';
        }
    });
}

// --- MODAL DE GESTÃO ---
window.abrirInfoToken = function(id) {
    const isMestre = window.nomeJogador === "Mestre";
    window.get(window.ref(window.db, `${REF_TABLETOP}/tokens/${id}`)).then(snap => {
        if(!snap.exists()) return;
        const t = snap.val();
        const s = t.stats || {};
        const vis = s.vis || { hp:false, ac:false, atk:false, dmg:false, desc:false };
        
        const modal = document.getElementById('token-info-modal') || criarModalInfo();
        
        let html = `<h3 style="margin:0 0 10px 0; color:var(--gold); text-align:center;">${t.nome}</h3>`;

        const row = (lbl, val, k) => {
            if(!isMestre && !vis[k]) return `<div class="info-row"><span><strong>${lbl}:</strong> ???</span></div>`;
            const eye = isMestre ? `<span class="eye-btn ${vis[k]?'visible':''}" onclick="toggleVis('${id}', '${k}')">👁️</span>` : '';
            return `<div class="info-row"><span><strong>${lbl}:</strong> ${val}</span>${eye}</div>`;
        };

        html += row("PV", `${s.pv_atual}/${s.pv_max}`, 'hp');
        if(s.pf_max>0) html += row("PF", `${s.pf_atual}/${s.pf_max}`, 'hp');
        html += row("Defesa", s.dificuldade, 'ac');
        html += row("Ataque", s.ataque, 'atk');
        html += row("Dano", s.dano, 'dmg');

        if(isMestre) {
            html += `<div class="hp-control-group">
                <button class="btn-ctrl btn-ctrl-red" onclick="mudarStat('${id}','pv_atual',-1)">-1 PV</button>
                <button class="btn-ctrl btn-ctrl-green" onclick="mudarStat('${id}','pv_atual',1)">+1 PV</button>
            </div>`;
            
            html += `<div style="margin-top:10px; display:flex; gap:10px; align-items:center; justify-content:center;">
                <span style="color:#aaa;">Tam:</span>
                <button onclick="mudarTam('${id}',-0.5)" style="width:30px;">-</button>
                <span style="color:var(--gold);">${t.tamanho||1}</span>
                <button onclick="mudarTam('${id}',0.5)" style="width:30px;">+</button>
            </div>`;

            html += `<div style="margin-top:10px; text-align:center;">
                <span style="color:#aaa; font-size:0.8rem; margin-right:5px;">Visibilidade:</span>
                <span class="eye-btn ${t.visivel!==false?'visible':''}" style="font-size:1.5rem;" onclick="toggleTokenVis('${id}')">👁️</span>
            </div>`;

            html += `<button class="btn-delete-token" onclick="removerTokenDoGrid('${id}')">🗑️ EXCLUIR TOKEN</button>`;
        }

        html += `<button onclick="document.getElementById('token-info-modal').style.display='none'" style="width:100%; margin-top:15px; padding:8px; background:#222; border:1px solid #555; color:#ccc;">Fechar</button>`;
        
        modal.innerHTML = html;
        modal.style.display = 'block';
    });
};

function criarModalInfo() {
    const m = document.createElement('div'); m.id='token-info-modal'; m.className='token-info-modal';
    document.body.appendChild(m); return m;
}

// --- AÇÕES ---
window.toggleVis = function(id, k) {
    const r = window.ref(window.db, `${REF_TABLETOP}/tokens/${id}/stats/vis/${k}`);
    window.get(r).then(s => { window.set(r, !s.val()); document.getElementById('token-info-modal').style.display='none'; });
};
window.toggleTokenVis = function(id) {
    const r = window.ref(window.db, `${REF_TABLETOP}/tokens/${id}/visivel`);
    window.get(r).then(s => { 
        const val = s.val(); 
        window.set(r, val === false ? true : false); 
        document.getElementById('token-info-modal').style.display='none'; 
    });
};
window.mudarStat = function(id, k, d) {
    const r = window.ref(window.db, `${REF_TABLETOP}/tokens/${id}/stats`);
    window.get(r).then(s => {
        let v = (s.val()[k]||0)+d; const max = k==='pv_atual'?s.val().pv_max:s.val().pf_max;
        if(v<0)v=0; if(v>max)v=max;
        window.update(r, {[k]:v}); document.getElementById('token-info-modal').style.display='none';
    });
};
window.mudarTam = function(id, d) {
    const r = window.ref(window.db, `${REF_TABLETOP}/tokens/${id}/tamanho`);
    window.get(r).then(s => {
        let v = (parseFloat(s.val())||1)+d; if(v<0.5)v=0.5;
        window.set(r, v); document.getElementById('token-info-modal').style.display='none';
    });
};
window.removerTokenDoGrid = function(id) {
    if(confirm("Excluir token permanentemente?")) {
        window.remove(window.ref(window.db, `${REF_TABLETOP}/tokens/${id}`));
        document.getElementById('token-info-modal').style.display='none';
    }
};

// --- DRAG ---
function startDragToken(e, id) {
    const isMestre = window.nomeJogador === "Mestre";
    // Mestre move tudo, Player só se tiver permissão (aqui simplificado: mestre only por enquanto ou check PC)
    // Se quiser liberar PC: if(!isMestre && !id.startsWith('pc_')) return;
    
    isDraggingToken=true; currentTokenId=id;
    
    // Calcula offset relativo à escala
    const el = document.getElementById(id);
    const rect = el.getBoundingClientRect();
    dragStartPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    
    window.addEventListener('mousemove', moveDragToken); window.addEventListener('mouseup', endDragToken);
    window.addEventListener('touchmove', moveDragToken, {passive:false}); window.addEventListener('touchend', endDragToken);
}

function moveDragToken(e) {
    if(!isDraggingToken) return;
    e.preventDefault();
    const el = document.getElementById(currentTokenId);
    
    // PRECISA LEVAR EM CONTA A ESCALA DO MAP-SCALER
    const scaler = document.getElementById('map-scaler');
    const style = window.getComputedStyle(scaler);
    const matrix = new WebKitCSSMatrix(style.transform);
    const scale = matrix.a || 1; // Pega o scale X atual

    // Container (map-container)
    const container = document.getElementById('map-container');
    const bounds = container.getBoundingClientRect();
    
    const cx = e.touches?e.touches[0].clientX:e.clientX;
    const cy = e.touches?e.touches[0].clientY:e.clientY;

    // Matemática mágica para compensar o zoom
    const x = (cx - bounds.left - dragStartPos.x) / scale;
    const y = (cy - bounds.top - dragStartPos.y) / scale;

    el.style.left = x + 'px';
    el.style.top = y + 'px';
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

// --- UTILS ---
window.toggleGMFulscreen = function() {
    document.body.classList.toggle('gm-mode-fullscreen');
    setTimeout(resizeMapToFit, 100);
};
window.toggleVTTMinimizado = function() {
    const area = document.getElementById('tabletop-area');
    const btn = document.getElementById('btn-vtt-toggle');
    vttMinimizado = !vttMinimizado;
    if(vttMinimizado) {
        area.style.display = 'none';
        document.body.classList.remove('vtt-ativo');
        btn.innerText = "🗺️ Abrir";
    } else {
        area.style.display = 'block';
        document.body.classList.add('vtt-ativo');
        btn.innerText = "⬇️ Minimizar";
        requestAnimationFrame(resizeMapToFit);
    }
};
// Upload e Criação (Helpers)
window.uploadMapa = function() { const f=document.getElementById('map-upload-input').files[0]; if(f){const r=new FileReader(); r.onload=e=>window.update(window.ref(window.db,`${REF_TABLETOP}/config`),{imagem:e.target.result,visivel:false}); r.readAsDataURL(f);} };
window.toggleMapaVisivel = function() { window.get(window.ref(window.db,`${REF_TABLETOP}/config/visivel`)).then(s=>window.update(window.ref(window.db,`${REF_TABLETOP}/config`),{visivel:!s.val()})); };
window.criarTokenMonstro = function(k,d) { const id='mob_'+Date.now(); const t={tipo:'mob',nome:d.nome,imagem:d.imagem||'',tamanho:d.tamanho||1,x:100,y:100,visivel:true,stats:{...d}}; window.update(window.ref(window.db,`${REF_TABLETOP}/tokens/${id}`),t); alert("Criado!"); };
window.criarTokenPC = function(n,i) { const id='pc_'+Date.now(); const t={tipo:'pc',nome:n,imagem:i,tamanho:1,x:150,y:150,visivel:true,stats:{pv_atual:6,pv_max:6}}; window.update(window.ref(window.db,`${REF_TABLETOP}/tokens/${id}`),t); document.getElementById('modal-criar-token-pc').style.display='none'; };