// =========================================================
// TABLETOP SYSTEM (GRID & TOKENS)
// =========================================================

const REF_TABLETOP = 'mesa_rpg/tabuleiro';
const GRID_SIZE = 50; // Tamanho do quadrado em PX

// Estado Local
let mapScale = 1;
let isDraggingToken = false;
let currentTokenId = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

// --- INICIALIZAÇÃO ---
window.iniciarTabletop = function() {
    const area = document.getElementById('tabletop-area');
    if(!area) return;

    // Listener do Firebase para o Tabuleiro
    window.onValue(window.ref(window.db, REF_TABLETOP), (snap) => {
        const dados = snap.val();
        if(dados && dados.config && dados.config.imagem) {
            renderizarMapa(dados.config);
            if(dados.tokens) renderizarTokens(dados.tokens);
        } else {
            area.style.display = 'none'; // Se não tem mapa, esconde
        }
    });
};

// --- RENDERIZAÇÃO ---
function renderizarMapa(config) {
    const area = document.getElementById('tabletop-area');
    const container = document.getElementById('map-container');
    const img = document.getElementById('map-bg-img');
    
    // Se o mestre definiu visivel false e eu sou jogador -> esconde
    const isMestre = window.nomeJogador === "Mestre";
    if (!config.visivel && !isMestre) {
        area.style.display = 'none';
        return;
    }

    area.style.display = 'block';
    
    // Só atualiza a imagem se mudou (para não piscar)
    if (img.getAttribute('src') !== config.imagem) {
        img.src = config.imagem;
    }
}

function renderizarTokens(tokensData) {
    const container = document.getElementById('map-container');
    
    // Remove tokens que não existem mais
    const tokensAtuais = document.querySelectorAll('.token');
    tokensAtuais.forEach(el => {
        if(!tokensData[el.id]) el.remove();
    });

    // Cria ou atualiza tokens
    Object.keys(tokensData).forEach(id => {
        const t = tokensData[id];
        let el = document.getElementById(id);

        if (!el) {
            el = document.createElement('div');
            el.id = id;
            el.className = `token ${t.tipo === 'pc' ? 'token-jogador' : 'token-monstro'}`;
            el.style.backgroundImage = `url('${t.imagem}')`;
            
            // Barra de Vida
            el.innerHTML = `<div class="token-hp-bar"><div class="token-hp-fill"></div></div>`;
            
            // Eventos de Drag (Apenas se tiver permissão)
            el.addEventListener('mousedown', (e) => startDragToken(e, id, t));
            el.addEventListener('touchstart', (e) => startDragToken(e, id, t), {passive: false});
            
            // Clique para ver info (Mestre)
            el.addEventListener('dblclick', () => {
                if(window.nomeJogador === 'Mestre' && t.tipo === 'mob') {
                    // Lógica futura para abrir ficha do monstro
                    alert("Monstro: " + t.nome);
                }
            });

            container.appendChild(el);
        }

        // Posiciona e Redimensiona
        el.style.width = (t.tamanho * GRID_SIZE) + 'px';
        el.style.height = (t.tamanho * GRID_SIZE) + 'px';
        
        // Se eu NÃO estou arrastando este token agora, atualize a posição via servidor
        if (currentTokenId !== id) {
            el.style.left = t.x + 'px';
            el.style.top = t.y + 'px';
        }

        // Atualiza Vida
        const bar = el.querySelector('.token-hp-fill');
        if(t.pv_max > 0) {
            const pct = Math.max(0, Math.min(100, (t.pv_atual / t.pv_max) * 100));
            bar.style.width = pct + '%';
            bar.style.backgroundColor = pct < 30 ? '#ff0000' : '#00ff00';
        }
    });
}

// --- DRAG AND DROP (MOVIMENTAÇÃO) ---
function startDragToken(e, id, dadosToken) {
    const isMestre = window.nomeJogador === "Mestre";
    const isDono = dadosToken.dono === window.nomeJogador;

    if (!isMestre && !isDono) return; // Não pode mover

    e.preventDefault();
    isDraggingToken = true;
    currentTokenId = id;
    
    const el = document.getElementById(id);
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // Calcula offset relativo ao token
    const rect = el.getBoundingClientRect();
    dragOffsetX = clientX - rect.left;
    dragOffsetY = clientY - rect.top;

    // Listeners globais para mover
    document.addEventListener('mousemove', moveDragToken);
    document.addEventListener('mouseup', endDragToken);
    document.addEventListener('touchmove', moveDragToken, {passive: false});
    document.addEventListener('touchend', endDragToken);
}

function moveDragToken(e) {
    if (!isDraggingToken || !currentTokenId) return;
    
    const el = document.getElementById(currentTokenId);
    const container = document.getElementById('map-container');
    const containerRect = container.getBoundingClientRect();
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    // Posição bruta relativa ao container
    let x = clientX - containerRect.left - dragOffsetX;
    let y = clientY - containerRect.top - dragOffsetY;

    el.style.left = x + 'px';
    el.style.top = y + 'px';
}

function endDragToken(e) {
    if (!isDraggingToken || !currentTokenId) return;

    const el = document.getElementById(currentTokenId);
    
    // SNAP TO GRID
    // Pega a posição atual (style.left) e arredonda para o múltiplo de GRID_SIZE
    let rawX = parseFloat(el.style.left);
    let rawY = parseFloat(el.style.top);

    let finalX = Math.round(rawX / GRID_SIZE) * GRID_SIZE;
    let finalY = Math.round(rawY / GRID_SIZE) * GRID_SIZE;

    // Salva no Firebase
    window.update(window.ref(window.db, `${REF_TABLETOP}/tokens/${currentTokenId}`), {
        x: finalX,
        y: finalY
    });

    isDraggingToken = false;
    currentTokenId = null;
    
    document.removeEventListener('mousemove', moveDragToken);
    document.removeEventListener('mouseup', endDragToken);
    document.removeEventListener('touchmove', moveDragToken);
    document.removeEventListener('touchend', endDragToken);
}

// --- FUNÇÕES DO MESTRE (CRIAR MAPA E TOKENS) ---

window.uploadMapa = function() {
    const file = document.getElementById('map-upload-input').files[0];
    if(!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        window.update(window.ref(window.db, `${REF_TABLETOP}/config`), {
            imagem: e.target.result,
            visivel: false // Começa oculto
        });
        alert("Mapa carregado! Use o botão 'Olho' para mostrar.");
    };
    reader.readAsDataURL(file);
};

window.toggleMapaVisivel = function() {
    window.get(window.ref(window.db, `${REF_TABLETOP}/config/visivel`)).then(s => {
        const atual = s.val();
        window.update(window.ref(window.db, `${REF_TABLETOP}/config`), { visivel: !atual });
    });
};

window.criarTokenMonstro = function(monstroId, dados) {
    // Cria um ID único para o token
    const tokenId = 'token_' + Date.now();
    
    const novoToken = {
        tipo: 'mob',
        dono: 'Mestre',
        nome: dados.nome,
        imagem: dados.imagem || '', // Usa imagem do monstro
        tamanho: 1, // Padrão Médio (1x1)
        pv_atual: parseInt(dados.pv_atual) || 10,
        pv_max: parseInt(dados.pv_max) || 10,
        x: 0, y: 0
    };

    window.update(window.ref(window.db, `${REF_TABLETOP}/tokens/${tokenId}`), novoToken);
    alert("Token criado no canto (0,0)!");
};

// --- FUNÇÃO DO JOGADOR (UPLOAD AVATAR) ---
window.uploadAvatarJogador = function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = (ev) => {
            const imgBase64 = ev.target.result;
            // Salva no perfil do jogador
            if(window.nomeJogador) {
                window.update(window.ref(window.db, `mesa_rpg/jogadores/${window.nomeJogador}`), { avatar: imgBase64 });
                
                // Se já existir token dele, atualiza a imagem
                // (Lógica avançada: procurar token do jogador e atualizar)
                window.criarTokenJogador(imgBase64);
            }
        };
        reader.readAsDataURL(file);
    };
    input.click();
};

window.criarTokenJogador = function(img) {
    const tokenId = 'pc_' + window.nomeJogador;
    const token = {
        tipo: 'pc',
        dono: window.nomeJogador,
        nome: window.nomeJogador,
        imagem: img,
        tamanho: 1,
        pv_atual: 10, pv_max: 10, // Exemplo, ideal pegar da ficha
        x: 50, y: 50
    };
    window.update(window.ref(window.db, `${REF_TABLETOP}/tokens/${tokenId}`), token);
};