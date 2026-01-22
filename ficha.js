// =========================================================
// FICHA DIGITAL - PRANCHETA V6.0 (UX Refinado)
// =========================================================

const FICHAS_IMAGENS = {
    'Bardo': ['img/fichas/ficha-bardo01.jpg', 'img/fichas/ficha-bardo02.jpg'],
    'Druida': ['img/fichas/ficha-druida01.jpg', 'img/fichas/ficha-druida02.jpg', 'img/fichas/ficha-druida03.jpg', 'img/fichas/ficha-druida04.jpg'],
    'Feiticeiro': ['img/fichas/ficha-feiticeiro01.jpg', 'img/fichas/ficha-feiticeiro02.jpg'],
    'Guardião': ['img/fichas/ficha-guardiao01.jpg', 'img/fichas/ficha-guardiao02.jpg'],
    'Guerreiro': ['img/fichas/ficha-guerreiro01.jpg', 'img/fichas/ficha-guerreiro02.jpg'],
    'Ladino': ['img/fichas/ficha-ladino01.jpg', 'img/fichas/ficha-ladino02.jpg'],
    'Mago': ['img/fichas/ficha-mago01.jpg', 'img/fichas/ficha-mago02.jpg'],
    'Patrulheiro': ['img/fichas/ficha-patrulheiro01.jpg', 'img/fichas/ficha-patrulheiro02.jpg', 'img/fichas/ficha-patrulheiro03.jpg', 'img/fichas/ficha-patrulheiro04.jpg'],
    'Serafim': ['img/fichas/ficha-serafim01.jpg', 'img/fichas/ficha-serafim02.jpg']
};

const TEXT_COLORS = { 
    'black': '#000000', 
    'red': '#cc0000', 
    'orange': '#ff8800', 
    'green': '#00cc44' 
};

let paginaFichaAtual = 0;
let ferramentaAtual = 'texto';
let elementosFicha = {}; 
let paginasTotais = 1;
let imgFichaAtual = [];

// Variáveis de interação
let isDrawing = false;
let isDragging = false;
let isResizing = false;
let startX, startY;
let initialTop, initialLeft, initialWidth, initialHeight;
let tempBox = null;

// --- INICIALIZAÇÃO ---
window.abrirFichaPersonagem = function() {
    const prof = localStorage.getItem('profissaoSelecionada') || 'Guerreiro';
    imgFichaAtual = FICHAS_IMAGENS[prof] || FICHAS_IMAGENS['Guerreiro'];
    paginasTotais = imgFichaAtual.length;
    paginaFichaAtual = 0;

    carregarFichaDe(window.nomeJogador);
    document.getElementById('sheet-modal').style.display = 'flex';
    atualizarPaginaFicha();
    inicializarEventosContainer();
};

window.fecharFicha = function() {
    document.getElementById('sheet-modal').style.display = 'none';
};

window.mudarPaginaFicha = function(dir) {
    paginaFichaAtual += dir;
    if (paginaFichaAtual < 0) paginaFichaAtual = 0;
    if (paginaFichaAtual >= paginasTotais) paginaFichaAtual = paginasTotais - 1;
    atualizarPaginaFicha();
};

function atualizarPaginaFicha() {
    document.getElementById('sheet-bg').src = imgFichaAtual[paginaFichaAtual];
    document.getElementById('sheet-page-indicator').innerText = `${paginaFichaAtual + 1}/${paginasTotais}`;
    renderizarElementosFicha();
}

window.selecionarFerramenta = function(ferramenta) {
    ferramentaAtual = ferramenta;
    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
    
    // Procura o botão que contém a chamada da função para ativar visualmente
    const botoes = document.querySelectorAll('.tool-btn');
    botoes.forEach(btn => {
        if(btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(ferramenta)) {
            btn.classList.add('active');
        }
    });
};

// --- LOGICA DE CRIAÇÃO (Container) ---
function inicializarEventosContainer() {
    const container = document.getElementById('sheet-container');
    if (!container) return;

    // Remove listeners antigos substituindo o node (limpeza segura)
    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);
    
    const activeContainer = document.getElementById('sheet-container');

    activeContainer.onmousedown = (e) => {
        // Ignora se clicou em overlay de tutorial ou elementos existentes
        if(e.target.closest('#tutorial-overlay')) return;
        if(e.target.closest('.input-wrapper') || e.target.closest('.marker-wrapper')) return;

        isDrawing = true;
        const rect = activeContainer.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;

        if (ferramentaAtual === 'texto') {
            tempBox = document.createElement('div');
            tempBox.className = 'temp-box';
            tempBox.style.left = startX + 'px';
            tempBox.style.top = startY + 'px';
            activeContainer.appendChild(tempBox);
        }
    };

    activeContainer.onmousemove = (e) => {
        if (!isDrawing) return;
        const rect = activeContainer.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        if (ferramentaAtual === 'texto' && tempBox) {
            tempBox.style.width = Math.abs(currentX - startX) + 'px';
            tempBox.style.height = Math.abs(currentY - startY) + 'px';
            tempBox.style.left = Math.min(currentX, startX) + 'px';
            tempBox.style.top = Math.min(currentY, startY) + 'px';
        }
    };

    activeContainer.onmouseup = (e) => {
        if (!isDrawing) return;
        isDrawing = false;
        
        const rect = activeContainer.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;

        const widthPct = (Math.abs(endX - startX) / rect.width) * 100;
        const heightPct = (Math.abs(endY - startY) / rect.height) * 100;
        const leftPct = (Math.min(startX, endX) / rect.width) * 100;
        const topPct = (Math.min(startY, endY) / rect.height) * 100;

        if (ferramentaAtual === 'texto') {
            if (tempBox) tempBox.remove();
            if (widthPct > 2 && heightPct > 2) { 
                criarNovoElemento('texto', { top: topPct, left: leftPct, width: widthPct, height: heightPct });
            }
        } else if (ferramentaAtual === 'marcador') {
            criarNovoElemento('marcador', { top: (endY/rect.height)*100, left: (endX/rect.width)*100 });
        }
    };
}

// --- FIREBASE OPS ---
function criarNovoElemento(tipo, coords) {
    const id = Date.now().toString();
    const novo = {
        id: id,
        tipo: tipo,
        pagina: paginaFichaAtual,
        top: coords.top,
        left: coords.left,
        width: coords.width || 0,
        height: coords.height || 0,
        valor: '',
        color: 'black',
        fontSize: 1.5 
    };
    if(window.nomeJogador) window.set(window.ref(window.db, `mesa_rpg/jogadores/${window.nomeJogador}/ficha/${id}`), novo);
}

function salvarElementoNoFirebase(el) {
    if(window.nomeJogador) window.set(window.ref(window.db, `mesa_rpg/jogadores/${window.nomeJogador}/ficha/${el.id}`), el);
}

function deletarElementoNoFirebase(id) {
    if(window.nomeJogador) window.remove(window.ref(window.db, `mesa_rpg/jogadores/${window.nomeJogador}/ficha/${id}`));
}

function carregarFichaDe(nome) {
    if(!window.ref || !window.db) return;
    window.onValue(window.ref(window.db, `mesa_rpg/jogadores/${nome}/ficha`), (snap) => {
        elementosFicha = snap.val() || {};
        renderizarElementosFicha();
    });
}

// --- RENDERIZAÇÃO E EVENTOS ESPECÍFICOS DE ELEMENTOS ---
function renderizarElementosFicha() {
    const layer = document.getElementById('sheet-inputs-layer');
    if(!layer) return;
    layer.innerHTML = '';

    Object.values(elementosFicha).forEach(el => {
        if (el.pagina !== paginaFichaAtual) return;

        // --- CAIXA DE TEXTO ---
        if (el.tipo === 'texto') {
            const wrapper = document.createElement('div');
            wrapper.className = 'input-wrapper';
            wrapper.style.top = el.top + '%';
            wrapper.style.left = el.left + '%';
            wrapper.style.width = el.width + '%';
            wrapper.style.height = el.height + '%';

            // --- Menu Flutuante ---
            const menu = document.createElement('div');
            menu.className = 'floating-menu';
            
            // Botão Delete
            const btnDel = document.createElement('div');
            btnDel.className = 'float-btn del';
            btnDel.innerText = 'X';
            btnDel.onclick = (e) => { e.stopPropagation(); deletarElementoNoFirebase(el.id); };
            
            // Fontes
            const btnUp = document.createElement('div');
            btnUp.className = 'float-btn';
            btnUp.innerText = 'A+';
            btnUp.onclick = (e) => { e.stopPropagation(); el.fontSize = (el.fontSize || 1.5) + 0.2; salvarElementoNoFirebase(el); };

            const btnDown = document.createElement('div');
            btnDown.className = 'float-btn';
            btnDown.innerText = 'A-';
            btnDown.onclick = (e) => { e.stopPropagation(); el.fontSize = Math.max(0.5, (el.fontSize || 1.5) - 0.2); salvarElementoNoFirebase(el); };

            // Cores
            const containerCores = document.createElement('div');
            containerCores.style.display = 'flex';
            containerCores.style.gap = '3px';
            containerCores.style.marginLeft = '5px';

            ['black', 'red', 'orange', 'green'].forEach(c => {
                const dot = document.createElement('div');
                dot.className = 'color-dot';
                dot.style.background = TEXT_COLORS[c];
                dot.onclick = (e) => { e.stopPropagation(); el.color = c; salvarElementoNoFirebase(el); };
                containerCores.appendChild(dot);
            });

            menu.append(btnDel, btnDown, btnUp, containerCores);
            wrapper.appendChild(menu);

            // --- Textarea ---
            const input = document.createElement('textarea');
            input.className = 'sheet-input';
            input.value = el.valor || '';
            input.style.fontSize = (el.fontSize || 1.5) + 'vh';
            input.style.color = TEXT_COLORS[el.color || 'black'];
            
            input.onblur = () => {
                // Sai do modo edição
                wrapper.classList.remove('is-editing');
                if (input.value !== el.valor) {
                    el.valor = input.value;
                    salvarElementoNoFirebase(el);
                }
            };

            wrapper.appendChild(input);

            // --- Resize Handle ---
            const resizer = document.createElement('div');
            resizer.className = 'resize-handle';
            resizer.onmousedown = (e) => startResize(e, el);
            wrapper.appendChild(resizer);

            // --- Eventos do Wrapper (Drag vs Edit) ---
            
            // 1. Mouse Down: Inicia Drag (se não estiver redimensionando ou clicando no menu)
            wrapper.onmousedown = (e) => {
                // Se clicar no menu, input ou resizer, ignora drag do wrapper
                if (e.target.classList.contains('float-btn') || 
                    e.target.classList.contains('color-dot') || 
                    e.target.classList.contains('resize-handle') ||
                    e.target.tagName === 'TEXTAREA' && wrapper.classList.contains('is-editing')) {
                    return;
                }
                
                startDrag(e, el);
            };

            // 2. Double Click: Entra no modo Edição
            wrapper.ondblclick = (e) => {
                e.stopPropagation();
                wrapper.classList.add('is-editing');
                input.focus();
            };

            layer.appendChild(wrapper);
        } 
        
        // --- MARCADOR ---
        else if (el.tipo === 'marcador') {
            const wrapper = document.createElement('div');
            wrapper.className = 'marker-wrapper';
            wrapper.style.top = `calc(${el.top}% - 7px)`; 
            wrapper.style.left = `calc(${el.left}% - 7px)`;

            const marker = document.createElement('div');
            marker.className = 'user-marker';
            wrapper.appendChild(marker);
            
            const btnDel = document.createElement('div');
            btnDel.className = 'marker-delete';
            btnDel.innerText = 'X';
            btnDel.onclick = (e) => { e.stopPropagation(); deletarElementoNoFirebase(el.id); };
            
            wrapper.appendChild(btnDel);
            layer.appendChild(wrapper);
        }
    });
}

// --- LÓGICA DE MOVE (DRAG) ---
function startDrag(e, el) {
    e.preventDefault(); 
    e.stopPropagation();
    
    isDragging = true;
    
    const container = document.getElementById('sheet-container');
    const rect = container.getBoundingClientRect();
    
    startX = e.clientX;
    startY = e.clientY;
    
    initialTop = (el.top / 100) * rect.height;
    initialLeft = (el.left / 100) * rect.width;

    const onMove = (moveEvent) => {
        if (!isDragging) return;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        
        // Visualmente move o wrapper atual sem salvar ainda (performance)
        // Como o wrapper é recriado no render, precisamos achar o elemento DOM certo
        // Uma forma simples é atualizar o style do target
        if(e.currentTarget) {
            e.currentTarget.style.top = ((initialTop + dy) / rect.height) * 100 + '%';
            e.currentTarget.style.left = ((initialLeft + dx) / rect.width) * 100 + '%';
        }
    };

    const onUp = (upEvent) => {
        if (!isDragging) return;
        isDragging = false;
        
        const dx = upEvent.clientX - startX;
        const dy = upEvent.clientY - startY;
        
        el.top = ((initialTop + dy) / rect.height) * 100;
        el.left = ((initialLeft + dx) / rect.width) * 100;
        
        salvarElementoNoFirebase(el); // Salva e re-renderiza
        
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
}

// --- LÓGICA DE RESIZE ---
function startResize(e, el) {
    e.preventDefault();
    e.stopPropagation();
    
    isResizing = true;
    
    const container = document.getElementById('sheet-container');
    const rect = container.getBoundingClientRect();
    
    startX = e.clientX;
    startY = e.clientY;
    
    initialWidth = (el.width / 100) * rect.width;
    initialHeight = (el.height / 100) * rect.height;

    const onUp = (upEvent) => {
        if (!isResizing) return;
        isResizing = false;
        
        const dx = upEvent.clientX - startX;
        const dy = upEvent.clientY - startY;
        
        el.width = Math.max(2, ((initialWidth + dx) / rect.width) * 100);
        el.height = Math.max(2, ((initialHeight + dy) / rect.height) * 100);
        
        salvarElementoNoFirebase(el);
        
        document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mouseup', onUp);
}

window.limparPaginaAtual = function() {
    if(!confirm("Limpar esta página inteira?")) return;
    Object.values(elementosFicha).forEach(el => {
        if (el.pagina === paginaFichaAtual) deletarElementoNoFirebase(el.id);
    });
};

// --- TUTORIAL ---
window.toggleTutorial = function() {
    const overlay = document.getElementById('tutorial-overlay');
    if (!overlay) return;
    const current = window.getComputedStyle(overlay).display;
    overlay.style.display = (current === 'none') ? 'flex' : 'none';
};