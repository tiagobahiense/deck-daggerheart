// =========================================================
// TABLETOP SYSTEM V13.2 (GRID MAIOR & REMOVE MAP)
// =========================================================

const REF_TABLETOP = 'mesa_rpg/tabuleiro';
const GRID_SIZE = 100; // AUMENTADO de 50 para 70 para tokens maiores

let isDraggingToken = false;
let isPanningMap = false;
let currentTokenId = null;
let dragStartPos = { x: 0, y: 0 };
let mapOffset = { x: 0, y: 0 };
let vttMinimizado = false;

let posicoesAnteriores = {}; 
let localDragStart = { x: 0, y: 0 };

window.iniciarTabletop = function() {
    const area = document.getElementById('tabletop-area');
    const mapContainer = document.getElementById('map-container');
    const btnMinimizar = document.getElementById('btn-vtt-toggle');
    
    if(!area || !mapContainer) return;

    area.addEventListener('mousedown', startPanMap);
    window.addEventListener('mousemove', movePanMap);
    window.addEventListener('mouseup', endPanMap);
    window.addEventListener('resize', resizeMapToFit);

    // Listener Principal do Firebase
    window.onValue(window.ref(window.db, REF_TABLETOP), (snap) => {
        const dados = snap.val() || {};
        const config = dados.config || {};
        const tokens = dados.tokens || {};
        const isMestre = window.nomeJogador === "Mestre";

        const imgEl = document.getElementById('map-bg-img');
        const btnVis = document.getElementById('btn-visibilidade-mapa'); // Novo ID

        // --- LÓGICA DE IMAGEM E CONTROLES ---
        if (!config.imagem) {
            // Se NÃO tem imagem
            imgEl.src = "";
            mapContainer.style.display = 'none'; // Esconde o grid/container
            
            if(isMestre && btnVis) {
                btnVis.innerHTML = "🚫 Sem Mapa";
                btnVis.style.borderColor = "#555";
                btnVis.style.color = "#777";
                btnVis.disabled = true;
            }
        } else {
            // Se TEM imagem
            mapContainer.style.display = 'block';

            // Carrega imagem se mudou
            if (imgEl.src !== config.imagem) {
                imgEl.src = config.imagem;
                imgEl.onload = () => {
                    mapContainer.style.width = imgEl.naturalWidth + 'px';
                    mapContainer.style.height = imgEl.naturalHeight + 'px';
                    resizeMapToFit();
                };
            } else if (imgEl.naturalWidth > 0) {
                 mapContainer.style.width = imgEl.naturalWidth + 'px';
                 mapContainer.style.height = imgEl.naturalHeight + 'px';
            }

            // Atualiza Botão de Visibilidade (Feedback Visual)
            if(isMestre && btnVis) {
                btnVis.disabled = false;
                if(config.visivel) {
                    btnVis.innerHTML = "👁️ Visível (Público)";
                    btnVis.style.borderColor = "#00ff00"; // Verde
                    btnVis.style.color = "#00ff00";
                    btnVis.classList.add('btn-pulsante'); // Opcional: efeito visual
                } else {
                    btnVis.innerHTML = "🙈 Oculto (Privado)";
                    btnVis.style.borderColor = "#ff0000"; // Vermelho
                    btnVis.style.color = "#ff4444";
                    btnVis.classList.remove('btn-pulsante');
                }
            }
        }

        // --- EXIBIÇÃO DA ÁREA (Lógica Jogador vs Mestre) ---
        if (isMestre) {
            area.style.display = 'block'; 
            if(config.imagem) requestAnimationFrame(resizeMapToFit);
        } else {
            // Jogador só vê se tiver imagem E estiver visível
            if (config.imagem && config.visivel) {
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

function resizeMapToFit() {
    const area = document.getElementById('tabletop-area');
    const scaler = document.getElementById('map-scaler');
    const img = document.getElementById('map-bg-img');
    
    // Proteção contra imagem vazia
    if (!img || !img.naturalWidth || area.style.display === 'none') return;

    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    const isFullscreen = document.body.classList.contains('gm-mode-fullscreen') || document.body.classList.contains('modo-jogador');
    
    let containerW, containerH;
    if (isFullscreen) { containerW = window.innerWidth; containerH = window.innerHeight; }
    else { const p = area.parentElement; if(p){ containerW = p.clientWidth; containerH = p.clientHeight; } else return; }

    const scale = Math.min(containerW / imgW, containerH / imgH);
    scaler.style.width = imgW + 'px'; scaler.style.height = imgH + 'px';
    scaler.style.transform = `translate(-50%, -50%) scale(${scale})`;
}

function renderizarTokens(tokensData) {
    const container = document.getElementById('map-container');
    const isMestre = window.nomeJogador === "Mestre";
    const existing = document.querySelectorAll('.token');
    
    existing.forEach(el => { if(!tokensData[el.id]) el.remove(); });

    Object.keys(tokensData).forEach(id => {
        const t = tokensData[id];
        if (!isMestre && t.visivel === false) { const el = document.getElementById(id); if(el) el.remove(); return; }

        let el = document.getElementById(id);
        if (!el) {
            el = document.createElement('div'); el.id = id;
            el.className = `token ${t.tipo === 'pc' ? 'token-jogador' : 'token-monstro'}`;
            let toolbar = isMestre ? `<div class="token-toolbar"><div class="btn-mini-tool" onclick="toggleVis('${id}')">👁️</div><div class="btn-mini-tool" onclick="abrirInfoToken('${id}', true)">ℹ️</div><div class="btn-mini-tool delete" onclick="removerTokenDoGrid('${id}')">✖</div></div>` : '';
            el.innerHTML = `${toolbar}<div class="token-bars-container"><div class="fill-hp"></div><div class="fill-pf" style="margin-top:2px;"></div></div>`;
            
            let clickTime;
            el.addEventListener('mousedown', (e) => { e.stopPropagation(); clickTime = Date.now(); startDragToken(e, id, t); });
            el.addEventListener('mouseup', (e) => { if (Date.now()-clickTime<200 && !isDraggingToken && !isMestre) abrirInfoToken(id, false); });
            el.addEventListener('dblclick', (e) => { e.stopPropagation(); if(isMestre) abrirInfoToken(id, true); });
            el.addEventListener('touchstart', (e) => { e.stopPropagation(); startDragToken(e, id, t); }, {passive:false});
            container.appendChild(el);
        }

        if(isMestre && t.visivel===false) el.classList.add('oculto'); else el.classList.remove('oculto');

        // Sincronia de Rastro
        if (posicoesAnteriores[id] && currentTokenId !== id) {
            const old = posicoesAnteriores[id];
            if (Math.abs(old.x - t.x) > 1 || Math.abs(old.y - t.y) > 1) {
                limparRastroAntigo(); 
                criarRastroSeguro(old.x, old.y, t.x, t.y);
            }
        }
        
        // Atualiza posição se não estiver arrastando
        if (currentTokenId !== id) {
            el.style.left = t.x + 'px';
            el.style.top = t.y + 'px';
            posicoesAnteriores[id] = { x: t.x, y: t.y };
        }

        const sizeMult = t.tamanho || 1;
        // AQUI USA O GRID_SIZE NOVO (70px)
        el.style.width = (sizeMult * GRID_SIZE) + 'px'; el.style.height = (sizeMult * GRID_SIZE) + 'px';
        el.style.backgroundImage = `url('${t.imagem || 'img/monsters/default.png'}')`;

        const s = t.stats || {};
        const hpBar = el.querySelector('.fill-hp'); const pfBar = el.querySelector('.fill-pf');
        if(hpBar && s.pv_max > 0) hpBar.style.width = Math.min(100, (s.pv_atual/s.pv_max)*100) + '%';
        if(pfBar) { if(s.pf_max > 0) { pfBar.style.display='block'; pfBar.style.width = Math.min(100, (s.pf_atual/s.pf_max)*100) + '%'; } else pfBar.style.display='none'; }
    });
}

function limparRastroAntigo() {
    const rastros = document.querySelectorAll('.trail-segment');
    rastros.forEach(r => r.remove());
}

function criarRastroSeguro(x1, y1, x2, y2) {
    const container = document.getElementById('map-container');
    const step = GRID_SIZE; // Usa 70px agora
    const stepsX = Math.round(Math.abs(x2 - x1) / step);
    const stepsY = Math.round(Math.abs(y2 - y1) / step);
    const dirX = x2 > x1 ? 1 : -1;
    const dirY = y2 > y1 ? 1 : -1;

    let currentX = x1;
    let currentY = y1;

    for(let i = 0; i < stepsX; i++) { currentX += step * dirX; criarBolinha(currentX, currentY); }
    for(let j = 0; j < stepsY; j++) { currentY += step * dirY; criarBolinha(currentX, currentY); }

    function criarBolinha(bx, by) {
        if(Math.abs(bx - x2) < 5 && Math.abs(by - y2) < 5) return;
        const div = document.createElement('div');
        div.className = 'trail-segment';
        div.style.left = bx + 'px'; div.style.top = by + 'px';
        container.appendChild(div);
        setTimeout(() => { if(div.parentNode) div.remove(); }, 10000);
    }
}

function startDragToken(e, id, t) {
    const isMestre = window.nomeJogador === "Mestre";
    
    if (!isMestre) {
        const nomeToken = (t.nome || "").trim().toUpperCase();
        const nomeJogador = (window.nomeJogador || "").trim().toUpperCase();
        if (t.tipo !== 'pc' || nomeToken !== nomeJogador) return; 
    }
    
    isDraggingToken = true; 
    currentTokenId = id;
    const el = document.getElementById(id);
    const rect = el.getBoundingClientRect();
    
    localDragStart = { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
    limparRastroAntigo();

    dragStartPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    
    window.addEventListener('mousemove', moveDragToken); 
    window.addEventListener('mouseup', endDragToken);
    window.addEventListener('touchmove', moveDragToken, {passive:false}); 
    window.addEventListener('touchend', endDragToken);
}

function moveDragToken(e) {
    if(!isDraggingToken) return;
    e.preventDefault();
    const el = document.getElementById(currentTokenId);
    const scaler = document.getElementById('map-scaler');
    const style = window.getComputedStyle(scaler);
    const matrix = new WebKitCSSMatrix(style.transform);
    const scale = matrix.a || 1;
    const container = document.getElementById('map-container');
    const bounds = container.getBoundingClientRect();
    const cx = e.touches?e.touches[0].clientX:e.clientX;
    const cy = e.touches?e.touches[0].clientY:e.clientY;
    const x = (cx - bounds.left - dragStartPos.x) / scale;
    const y = (cy - bounds.top - dragStartPos.y) / scale;
    el.style.left = x + 'px'; el.style.top = y + 'px';
}

function endDragToken() {
    if(!isDraggingToken) return;
    const el = document.getElementById(currentTokenId);
    // Snap para o novo GRID_SIZE (70)
    let x = Math.round(parseFloat(el.style.left)/GRID_SIZE)*GRID_SIZE;
    let y = Math.round(parseFloat(el.style.top)/GRID_SIZE)*GRID_SIZE;
    
    el.style.left = x + 'px'; el.style.top = y + 'px';
    
    criarRastroSeguro(localDragStart.x, localDragStart.y, x, y);
    window.update(window.ref(window.db, `${REF_TABLETOP}/tokens/${currentTokenId}`), {x:x, y:y});
    
    isDraggingToken=false;
    window.removeEventListener('mousemove', moveDragToken); window.removeEventListener('mouseup', endDragToken);
    window.removeEventListener('touchmove', moveDragToken); window.removeEventListener('touchend', endDragToken);
}

// Utils e Controles
function startPanMap(e) { if(document.body.classList.contains('gm-mode-fullscreen'))return; if(e.target.id!=='tabletop-area' && !e.target.classList.contains('grid-overlay'))return; isPanningMap=true; dragStartPos={x:e.clientX, y:e.clientY}; const c=document.getElementById('map-scaler'); mapOffset={x:c.offsetLeft, y:c.offsetTop}; }
function movePanMap(e) { if(!isPanningMap)return; const c=document.getElementById('map-scaler'); c.style.left=(mapOffset.x+(e.clientX-dragStartPos.x))+'px'; c.style.top=(mapOffset.y+(e.clientY-dragStartPos.y))+'px'; }
function endPanMap() { isPanningMap=false; }

window.toggleGMFulscreen = function() { document.body.classList.toggle('gm-mode-fullscreen'); setTimeout(resizeMapToFit, 100); };
window.toggleVTTMinimizado = function() { const a=document.getElementById('tabletop-area'); const b=document.getElementById('btn-vtt-toggle'); vttMinimizado=!vttMinimizado; if(vttMinimizado){a.style.display='none';document.body.classList.remove('vtt-ativo');b.innerText="🗺️ Abrir Tabuleiro";}else{a.style.display='block';document.body.classList.add('vtt-ativo');b.innerText="⬇️ Minimizar Tabuleiro";requestAnimationFrame(resizeMapToFit);} };

// --- FUNÇÕES DE MAPA (NOVAS) ---
window.uploadMapa = function() { 
    const f=document.getElementById('map-upload-input').files[0]; 
    if(f){
        const r=new FileReader(); 
        r.onload=e=>window.update(window.ref(window.db,`${REF_TABLETOP}/config`),{imagem:e.target.result,visivel:false}); 
        r.readAsDataURL(f);
    } 
};

window.toggleMapaVisivel = function() { 
    const configRef = window.ref(window.db,`${REF_TABLETOP}/config`);
    window.get(configRef).then(s => {
        const atual = s.val() || {};
        if(!atual.imagem) { alert("Envie um mapa primeiro!"); return; }
        window.update(configRef, {visivel: !atual.visivel});
    });
};

window.removerMapa = function() {
    if(confirm("Tem certeza? Isso removerá a imagem do tabuleiro para todos. Os tokens permanecerão.")) {
        window.update(window.ref(window.db, `${REF_TABLETOP}/config`), {
            imagem: null,
            visivel: false
        });
    }
};

window.criarTokenMonstro = function(k,d) { const id='mob_'+Date.now(); const t={tipo:'mob',nome:d.nome,imagem:d.imagem||'',tamanho:d.tamanho||1,x:140,y:140,visivel:true,stats:{...d}}; window.update(window.ref(window.db,`${REF_TABLETOP}/tokens/${id}`),t); alert("Criado!"); };
window.criarTokenPC = function(n,i) { const id='pc_'+Date.now(); const t={tipo:'pc',nome:n,imagem:i,tamanho:1,x:210,y:210,visivel:true,stats:{pv_atual:6,pv_max:6}}; window.update(window.ref(window.db,`${REF_TABLETOP}/tokens/${id}`),t); document.getElementById('modal-criar-token-pc').style.display='none'; };

// Modais e Stats (Mantidos iguais, apenas ajuste de lógica geral se necessário)
window.abrirInfoToken = function(id, editavel) {
    window.get(window.ref(window.db, `${REF_TABLETOP}/tokens/${id}`)).then(snap => {
        if(!snap.exists()) return;
        const t = snap.val(); const s = t.stats || {}; const vis = s.vis || { hp:false, ac:false, atk:false, dmg:false, desc:false };
        const modal = document.getElementById('token-info-modal') || criarModalInfo();
        let html = `<h3 style="margin:0 0 10px 0; color:var(--gold); text-align:center;">${t.nome}</h3>`;
        const row = (l,v,k) => { 
            if(!editavel && !vis[k]) return `<div class="info-row"><span><strong>${l}:</strong> ???</span></div>`;
            const eye = editavel ? `<span class="eye-btn ${vis[k]?'visible':''}" onclick="toggleVis('${id}','${k}')">👁️</span>` : '';
            return `<div class="info-row"><span><strong>${l}:</strong> ${v}</span>${eye}</div>`;
        };
        html += row("PV", `${s.pv_atual}/${s.pv_max}`, 'hp');
        if(s.pf_max>0) html += row("PF", `${s.pf_atual}/${s.pf_max}`, 'hp');
        html += row("Defesa", s.dificuldade, 'ac'); html += row("Ataque", s.ataque, 'atk'); html += row("Dano", s.dano, 'dmg');
        if(editavel) {
            html += `<div class="hp-control-group"><button class="btn-ctrl" style="border-color:red" onclick="mudarStat('${id}','pv_atual',-1)">-1 PV</button><button class="btn-ctrl" style="border-color:green" onclick="mudarStat('${id}','pv_atual',1)">+1 PV</button></div>`;
            html += `<div style="margin-top:10px; display:flex; gap:10px; align-items:center; justify-content:center;">
                <span style="color:#aaa;">Tam:</span>
                <button class="btn-ctrl" onclick="mudarTam('${id}',-0.5)" style="width:30px;">-</button>
                <span style="color:var(--gold);">${t.tamanho||1}x</span>
                <button class="btn-ctrl" onclick="mudarTam('${id}',0.5)" style="width:30px;">+</button>
            </div>`;
            html += `<div style="margin-top:10px;text-align:center;"><span class="eye-btn ${t.visivel!==false?'visible':''}" style="font-size:1.5rem;" onclick="toggleTokenVis('${id}')">👁️</span></div>`;
            html += `<button class="btn-delete-token" onclick="removerTokenDoGrid('${id}')">🗑️ EXCLUIR</button>`;
        }
        html += `<button onclick="document.getElementById('token-info-modal').style.display='none'" style="width:100%; margin-top:15px; padding:8px;">Fechar</button>`;
        modal.innerHTML = html; modal.style.display = 'block';
    });
};
function criarModalInfo() { const m=document.createElement('div'); m.id='token-info-modal'; m.className='token-info-modal'; document.body.appendChild(m); return m; }
window.toggleVis = function(id, k) { const r = window.ref(window.db, `${REF_TABLETOP}/tokens/${id}/stats/vis/${k}`); window.get(r).then(s => window.set(r, !s.val())); document.getElementById('token-info-modal').style.display='none'; };
window.toggleTokenVis = function(id) { const r = window.ref(window.db, `${REF_TABLETOP}/tokens/${id}/visivel`); window.get(r).then(s => window.set(r, s.val()===false?true:false)); document.getElementById('token-info-modal').style.display='none'; };
window.mudarStat = function(id, k, d) { const r = window.ref(window.db, `${REF_TABLETOP}/tokens/${id}/stats`); window.get(r).then(s => { let v = (s.val()[k]||0)+d; if(v<0)v=0; if(v>s.val().pv_max)v=s.val().pv_max; window.update(r, {[k]:v}); document.getElementById('token-info-modal').style.display='none'; }); };
window.mudarTam = function(id, d) { const r = window.ref(window.db, `${REF_TABLETOP}/tokens/${id}/tamanho`); window.get(r).then(s => { let v = (parseFloat(s.val())||1)+d; if(v<0.5)v=0.5; window.set(r, v); document.getElementById('token-info-modal').style.display='none'; }); };
window.removerTokenDoGrid = function(id) { if(confirm("Excluir?")) window.remove(window.ref(window.db, `${REF_TABLETOP}/tokens/${id}`)); document.getElementById('token-info-modal').style.display='none'; };