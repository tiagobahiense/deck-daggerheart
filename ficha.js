// =========================================================
// FICHA DIGITAL - PRANCHETA V5.0 (FULL RESTORE)
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

// Cores solicitadas: Preto, Vermelho, Laranja, Verde
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

// Variáveis de interação (Criar, Arrastar, Redimensionar)
let isDrawing = false;
let isDragging = false;
let isResizing = false;
let currentElementId = null; // ID do elemento sendo manipulado
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
    // Marca o botão da ferramenta
    const btn = document.querySelector(`.tool-btn[onclick*="${ferramenta}"]`);
    if(btn) btn.classList.add('active');
};

// --- LOGICA DE CRIAÇÃO (Container) ---
function inicializarEventosContainer() {
    const container = document.getElementById('sheet-container');
    if (!container) return;

    // Reset de listeners para evitar duplicação
    const newContainer = container.cloneNode(true);
    container.parentNode.replaceChild(newContainer, container);
    
    // Configura o novo container
    const activeContainer = document.getElementById('sheet-container');

    activeContainer.onmousedown = (e) => {
        // Ignora se clicou em overlay de tutorial ou nos próprios inputs
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
        fontSize: 1.5 // Tamanho padrão
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

// --- RENDERIZAÇÃO COMPLEXA (RESTORED) ---
function renderizarElementosFicha() {
    const layer = document.getElementById('sheet-inputs-layer');
    if(!layer) return;
    layer.innerHTML = '';

    Object.values(elementosFicha).forEach(el => {
        if (el.pagina !== paginaFichaAtual) return;

        // --- RENDERIZAR TEXTO ---
        if (el.tipo === 'texto') {
            const wrapper = document.createElement('div');
            wrapper.className = 'input-wrapper';
            wrapper.style.top = el.top + '%';
            wrapper.style.left = el.left + '%';
            wrapper.style.width = el.width + '%';
            wrapper.style.height = el.height + '%';

            // Menu Flutuante (Cores, Fontes, Delete)
            const menu = document.createElement('div');
            menu.className = 'floating-menu';
            
            // Botão Delete
            const btnDel = document.createElement('div');
            btnDel.className = 'float-btn del';
            btnDel.innerText = 'X';
            btnDel.title = "Excluir caixa";
            btnDel.onclick = (e) => { e.stopPropagation(); deletarElementoNoFirebase(el.id); };
            
            // Botões de Tamanho
            const btnUp = document.createElement('div');
            btnUp.className = 'float-btn';
            btnUp.innerText = 'A+';
            btnUp.onclick = (e) => { 
                e.stopPropagation(); 
                el.fontSize = (el.fontSize || 1.5) + 0.2; 
                salvarElementoNoFirebase(el); 
            };

            const btnDown = document.createElement('div');
            btnDown.className = 'float-btn';
            btnDown.innerText = 'A-';
            btnDown.onclick = (e) => { 
                e.stopPropagation(); 
                el.fontSize = Math.max(0.5, (el.fontSize || 1.5) - 0.2); 
                salvarElementoNoFirebase(el); 
            };

            // Cores: Preto, Vermelho, Laranja, Verde
            const cores = ['black', 'red', 'orange', 'green'];
            const containerCores = document.createElement('div');
            containerCores.style.display = 'flex';
            containerCores.style.gap = '3px';
            containerCores.style.marginLeft = '5px';

            cores.forEach(c => {
                const dot = document.createElement('div');
                dot.className = 'color-dot';
                dot.style.background = TEXT_COLORS[c];
                dot.onclick = (e) => {
                    e.stopPropagation();
                    el.color = c;
                    salvarElementoNoFirebase(el);
                };
                containerCores.appendChild(dot);
            });

            menu.append(btnDel, btnDown, btnUp, containerCores);
            wrapper.appendChild(menu);

            // Textarea
            const input = document.createElement('textarea');
            input.className = 'sheet-input';
            input.value = el.valor || '';
            input.style.fontSize = (el.fontSize || 1.5) + 'vh';
            input.style.color = TEXT_COLORS[el.color || 'black'];
            
            // Eventos do Input
            input.onblur = () => {
                if (input.value !== el.valor) {
                    el.valor = input.value;
                    salvarElementoNoFirebase(el);
                }
            };
            // Evita propagação de drag quando clica dentro para digitar
            input.onmousedown = (e) => { e.stopPropagation(); };

            wrapper.appendChild(input);

            // Alça de Resize
            const resizer = document.createElement('div');
            resizer.className = 'resize-handle';
            resizer.onmousedown = (e) => startResize(e, el);
            wrapper.appendChild(resizer);

            // Evento de Drag no Wrapper (borda)
            wrapper.onmousedown = (e) => startDrag(e, el);

            layer.appendChild(wrapper);
        } 
        
        // --- RENDERIZAR MARCADOR ---
        else if (el.tipo === 'marcador') {
            const wrapper = document.createElement('div');
            wrapper.className = 'marker-wrapper';
            wrapper.style.top = `calc(${el.top}% - 10px)`; // Centraliza no clique
            wrapper.style.left = `calc(${el.left}% - 10px)`;

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

// --- LÓGICA DE MOVE / RESIZE ---

function startDrag(e, el) {
    if(e.target.tagName === 'TEXTAREA' || e.target.classList.contains('float-btn') || e.target.classList.contains('color-dot')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    isDragging = true;
    currentElementId = el.id;
    
    const container = document.getElementById('sheet-container');
    const rect = container.getBoundingClientRect();
    
    startX = e.clientX;
    startY = e.clientY;
    
    // Converte % de volta para pixels para calculo suave
    initialTop = (el.top / 100) * rect.height;
    initialLeft = (el.left / 100) * rect.width;

    const onMove = (moveEvent) => {
        if (!isDragging) return;
        const dx = moveEvent.clientX - startX;
        const dy = moveEvent.clientY - startY;
        
        let newTopPx = initialTop + dy;
        let newLeftPx = initialLeft + dx;
        
        // Atualiza visualmente (performance)
        const wrapper = document.querySelector(`.input-wrapper`); // Ineficiente buscar de novo, mas ok pra MVP
        // Idealmente, achar o wrapper especifico. Vamos re-renderizar no final.
    };

    const onUp = (upEvent) => {
        if (!isDragging) return;
        isDragging = false;
        
        const dx = upEvent.clientX - startX;
        const dy = upEvent.clientY - startY;
        
        const rect = container.getBoundingClientRect();
        
        // Atualiza dados finais
        el.top = ((initialTop + dy) / rect.height) * 100;
        el.left = ((initialLeft + dx) / rect.width) * 100;
        
        salvarElementoNoFirebase(el);
        
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
}

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

    const onMove = (moveEvent) => {
        // Opcional: atualização visual em tempo real sem salvar
    };

    const onUp = (upEvent) => {
        if (!isResizing) return;
        isResizing = false;
        
        const dx = upEvent.clientX - startX;
        const dy = upEvent.clientY - startY;
        
        const rect = container.getBoundingClientRect();
        
        // Define novo tamanho, mínimo de 2%
        el.width = Math.max(2, ((initialWidth + dx) / rect.width) * 100);
        el.height = Math.max(2, ((initialHeight + dy) / rect.height) * 100);
        
        salvarElementoNoFirebase(el);
        
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
    };

    document.addEventListener('mousemove', onMove);
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