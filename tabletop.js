// =========================================================
// TABLETOP SYSTEM V9.0 (PERFECT SYNC & TOOLS)
// =========================================================

const REF_TABLETOP = 'mesa_rpg/tabuleiro';
const GRID_SIZE = 50;

let isDraggingToken = false;
let isPanningMap = false;
let currentTokenId = null;
let dragStartPos = { x: 0, y: 0 };
let mapOffset = { x: 0, y: 0 }; // Apenas para modo janela
let vttMinimizado = false;

// --- INICIALIZAÇÃO ---
window.iniciarTabletop = function() {
    const area = document.getElementById('tabletop-area');
    const imgEl = document.getElementById('map-bg-img');
    const btnMinimizar = document.getElementById('btn-vtt-toggle');
    
    if(!area) return;

    // Pan do Mapa (Apenas modo Janela do GM)
    area.addEventListener('mousedown', startPanMap);
    window.addEventListener('mousemove', movePanMap);
    window.addEventListener('mouseup', endPanMap);
    
    // Listener de Resize para ajustar escala
    window.addEventListener('resize', resizeMapToFit);

    window.onValue(window.ref(window.db, REF_TABLETOP), (snap) => {
        const dados = snap.val() || {};
        const config = dados.config || {};
        const isMestre = window.nomeJogador === "Mestre";

        // 1. Configuração da Imagem
        if(config.imagem && imgEl.src !== config.imagem) {
            imgEl.src = config.imagem;
            imgEl.onload = () => {
                resizeMapToFit(); // Recalcula escala ao carregar
            };
        }

        // 2. Controle de Exibição
        if (isMestre) {
            area.style.display = 'block'; // GM controla via CSS fullscreen
        } else {
            // Jogador
            if (config.visivel) {
                if(btnMinimizar) btnMinimizar.style.display = 'block';
                if (!vttMinimizado) {
                    area.style.display = 'block';
                    document.body.classList.add('vtt-ativo');
                    resizeMapToFit(); // Garante ajuste
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

        renderizarTokens(dados.tokens || {});
    });
};

// --- ESCALA INTELIGENTE (O SEGREDO DO ALINHAMENTO) ---
function resizeMapToFit() {
    const area = document.getElementById('tabletop-area');
    const scaler = document.getElementById('map-scaler');
    const img = document.getElementById('map-bg-img');
    const isMestre = window.nomeJogador === "Mestre";
    const isFullscreen = document.body.classList.contains('gm-mode-fullscreen') || !isMestre; // Jogador é sempre fullscreen virtual

    if (!img.naturalWidth || area.style.display === 'none') return;

    // Reseta transformações para ler tamanho natural
    if (isFullscreen) {
        const winW = window.innerWidth;
        const winH = window.innerHeight;
        const imgW = img.naturalWidth;
        const imgH = img.naturalHeight;

        // Calcula a escala para "caber" (contain)
        const scale = Math.min(winW / imgW, winH / imgH);

        scaler.style.width = imgW + 'px';
        scaler.style.height = imgH + 'px';
        scaler.style.transform = `translate(-50%, -50%) scale(${scale})`;
        scaler.style.top = '50%';
        scaler.style.left = '50%';
    } else {
        // Modo Janela do GM (Sem escala, com Pan)
        scaler.style.transform = 'translate(0, 0) scale(1)';
        scaler.style.width = img.naturalWidth + 'px';
        scaler.style.height = img.naturalHeight + 'px';
        // A posição top/left será controlada pelo Pan
    }
}

// --- RENDERIZAÇÃO ---
function renderizarTokens(tokensData) {
    const container = document.getElementById('map-container');
    const isMestre = window.nomeJogador === "Mestre";
    const existing = document.querySelectorAll('.token');
    
    existing.forEach(el => { if(!tokensData[el.id]) el.remove(); });

    Object.keys(tokensData).forEach(id => {
        const t = tokensData[id];
        
        // Visibilidade para Jogador
        if (!isMestre && t.visivel === false) {
            const el = document.getElementById(id); if(el) el.remove(); return;
        }

        let el = document.getElementById(id);
        if (!el) {
            el = document.createElement('div');
            el.id = id;
            el.className = `token ${t.tipo === 'pc' ? 'token-jogador' : 'token-monstro'}`;
            
            // HTML Interno (Barras + Toolbar do Mestre)
            let toolbar = '';
            if(isMestre) {
                toolbar = `
                <div class="token-toolbar">
                    <div class="btn-mini-tool" onclick="toggleVis('${id}')" title="Visibilidade">👁️</div>
                    <div class="btn-mini-tool" onclick="abrirInfoToken('${id}', true)" title="Info/Status">ℹ️</div>
                    <div class="btn-mini-tool delete" onclick="removerTokenDoGrid('${id}')" title="Excluir">✖</div>
                </div>`;
            }
            
            el.innerHTML = `${toolbar}<div class="token-bars-container"><div class="fill-hp"></div><div class="fill-pf" style="margin-top:2px;"></div></div>`;
            
            // Eventos
            el.addEventListener('mousedown', (e) => { e.stopPropagation(); startDragToken(e, id, t); });
            el.addEventListener('click', (e) => {
                // Jogador clica para ver info simples
                if(!isDraggingToken && !isMestre) abrirInfoToken(id, false); 
            });
            // Duplo clique mestre abre gestão completa
            el.addEventListener('dblclick', (e) => { 
                e.stopPropagation(); 
                if(isMestre) abrirInfoToken(id, true); 
            });

            container.appendChild(el);
        }

        // Estilos
        if(isMestre && t.visivel === false) el.classList.add('oculto');
        else el.classList.remove('oculto');

        // Posição (só atualiza se não estiver arrastando)
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

// --- MODAL DE INFO / GESTÃO ---
window.abrirInfoToken = function(id, editavel) {
    // Pega dados atualizados do Firebase (ou cache local se preferir, mas get é seguro)
    window.get(window.ref(window.db, `${REF_TABLETOP}/tokens/${id}`)).then(snap => {
        if(!snap.exists()) return;
        const t = snap.val();
        const modal = document.getElementById('token-info-modal') || criarModalInfo();
        const s = t.stats || {};
        
        let html = `<h3 style="color:var(--gold);text-align:center;margin:0 0 10px 0;">${t.nome}</h3>`;
        
        // Info Básica
        html += `<div class="info-row"><span>PV:</span> <strong>${s.pv_atual}/${s.pv_max}</strong></div>`;
        if(s.pf_max > 0) html += `<div class="info-row"><span>PF:</span> <strong>${s.pf_atual}/${s.pf_max}</strong></div>`;
        html += `<div class="info-row"><span>Defesa:</span> ${s.dificuldade}</div>`;
        html += `<div class="info-row"><span>Ataque:</span> ${s.ataque}</div>`;
        html += `<div class="info-row"><span>Dano:</span> ${s.dano}</div>`;
        if(s.detalhes) html += `<div style="margin-top:10px;font-style:italic;font-size:0.9rem;">${s.detalhes}</div>`;

        // Controles de Edição (Apenas Mestre)
        if (editavel) {
            html += `<hr style="border-color:#444; margin:15px 0;">`;
            html += `<div style="text-align:center; color:#aaa; font-size:0.8rem; margin-bottom:5px;">Controles de Vida</div>`;
            html += `<div class="hp-controls">
                <button class="btn-ctrl" style="border-color:red" onclick="mudarStat('${id}','pv_atual',-1)">-1 PV</button>
                <button class="btn-ctrl" style="border-color:green" onclick="mudarStat('${id}','pv_atual',1)">+1 PV</button>
            </div>`;
            if(s.pf_max > 0) {
                html += `<div class="hp-controls">
                    <button class="btn-ctrl" style="border-color:#00f" onclick="mudarStat('${id}','pf_atual',-1)">-1 PF</button>
                    <button class="btn-ctrl" style="border-color:#00f" onclick="mudarStat('${id}','pf_atual',1)">+1 PF</button>
                </div>`;
            }
            html += `<div style="margin-top:15px; display:flex; gap:10px; align-items:center; justify-content:center;">
                <span style="color:#aaa;">Tamanho:</span>
                <button onclick="mudarTam('${id}',-0.5)" style="width:30px;">-</button>
                <span style="color:var(--gold);">${t.tamanho||1}</span>
                <button onclick="mudarTam('${id}',0.5)" style="width:30px;">+</button>
            </div>`;
        }

        html += `<button onclick="document.getElementById('token-info-modal').style.display='none'" style="width:100%; margin-top:15px; padding:10px;">Fechar</button>`;
        modal.innerHTML = html;
        modal.style.display = 'block';
    });
};

function criarModalInfo() {
    const m = document.createElement('div'); m.id='token-info-modal'; m.className='token-info-modal';
    document.body.appendChild(m); return m;
}

// --- HELPERS ---
window.toggleVis = function(id) {
    const r = window.ref(window.db, `${REF_TABLETOP}/tokens/${id}/visivel`);
    window.get(r).then(s => window.set(r, !s.val()));
};
window.mudarStat = function(id, stat, d) {
    const r = window.ref(window.db, `${REF_TABLETOP}/tokens/${id}/stats`);
    window.get(r).then(s => {
        let v = (s.val()[stat]||0)+d;
        const max = stat==='pv_atual' ? s.val().pv_max : s.val().pf_max;
        if(v<0)v=0; if(v>max)v=max;
        window.update(r, {[stat]: v});
        window.abrirInfoToken(id, true); // Reabre para atualizar numeros
    });
};
window.mudarTam = function(id, d) {
    const r = window.ref(window.db, `${REF_TABLETOP}/tokens/${id}/tamanho`);
    window.get(r).then(s => {
        let v = (parseFloat(s.val())||1)+d; if(v<0.5)v=0.5;
        window.set(r, v);
        window.abrirInfoToken(id, true);
    });
};
window.removerTokenDoGrid = function(id) {
    if(confirm("Excluir token?")) window.remove(window.ref(window.db, `${REF_TABLETOP}/tokens/${id}`));
};

// --- MODO FULLSCREEN GM ---
window.toggleGMFulscreen = function() {
    document.body.classList.toggle('gm-mode-fullscreen');
    resizeMapToFit(); // Recalcula escala ao entrar/sair
};

// --- UPLOAD E CRIAÇÃO ---
window.uploadMapa = function() {
    const f = document.getElementById('map-upload-input').files[0];
    if(f) {
        const r = new FileReader();
        r.onload = (e) => window.update(window.ref(window.db, `${REF_TABLETOP}/config`), { imagem: e.target.result, visivel: false });
        r.readAsDataURL(f);
    }
};
window.toggleMapaVisivel = function() {
    window.get(window.ref(window.db, `${REF_TABLETOP}/config/visivel`)).then(s => window.update(window.ref(window.db, `${REF_TABLETOP}/config`), { visivel: !s.val() }));
};
window.criarTokenMonstro = function(k, d) {
    const id = 'mob_'+Date.now();
    const t = { tipo:'mob', nome:d.nome, imagem:d.imagem||'', tamanho:d.tamanho||1, x:100, y:100, visivel:true, stats:{...d} };
    window.update(window.ref(window.db, `${REF_TABLETOP}/tokens/${id}`), t);
    alert("Token Criado!");
};
window.criarTokenPC = function(nome, img) {
    const id = 'pc_'+Date.now();
    const t = { tipo:'pc', nome:nome, imagem:img, tamanho:1, x:150, y:150, visivel:true, stats:{pv_atual:6, pv_max:6} };
    window.update(window.ref(window.db, `${REF_TABLETOP}/tokens/${id}`), t);
    document.getElementById('modal-criar-token-pc').style.display='none';
};

// --- DRAG ---
function startPanMap(e) {
    // Só faz pan se não estiver em fullscreen (modo janela)
    if(document.body.classList.contains('gm-mode-fullscreen')) return;
    if(e.target.id!=='tabletop-area' && !e.target.classList.contains('grid-overlay')) return;
    isPanningMap=true; dragStartPos={x:e.clientX, y:e.clientY};
    const c = document.getElementById('map-scaler'); // Move o scaler agora
    mapOffset={x:c.offsetLeft, y:c.offsetTop};
}
function movePanMap(e) {
    if(!isPanningMap) return;
    const c = document.getElementById('map-scaler');
    c.style.left = (mapOffset.x + (e.clientX-dragStartPos.x)) + 'px';
    c.style.top = (mapOffset.y + (e.clientY-dragStartPos.y)) + 'px';
}
function endPanMap() { isPanningMap=false; }

function startDragToken(e, id, t) {
    const isMestre = window.nomeJogador === "Mestre";
    if(!isMestre && t.tipo !== 'pc') return; // Player só move PC
    isDraggingToken=true; currentTokenId=id;
    const el = document.getElementById(id);
    const rect = el.getBoundingClientRect();
    dragStartPos = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    window.addEventListener('mousemove', moveDragToken); window.addEventListener('mouseup', endDragToken);
}
function moveDragToken(e) {
    if(!isDraggingToken) return;
    e.preventDefault();
    const el = document.getElementById(currentTokenId);
    // IMPORTANTE: Calcula posição relativa levando em conta a escala do pai (#map-scaler)
    const container = document.getElementById('map-container');
    const bounds = container.getBoundingClientRect();
    
    // Pega a escala atual do scaler
    const scaler = document.getElementById('map-scaler');
    const style = window.getComputedStyle(scaler);
    const matrix = new WebKitCSSMatrix(style.transform);
    const scale = matrix.a || 1; // Pega escala X

    const x = (e.clientX - bounds.left - dragStartPos.x) / scale;
    const y = (e.clientY - bounds.top - dragStartPos.y) / scale;

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
}