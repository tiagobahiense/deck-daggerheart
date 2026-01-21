// =========================================================
// FICHA DIGITAL - PRANCHETA REALTIME v2.0
// (Drag, Drop, Resize, Delete, Move)
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

let ferramentaAtual = 'texto';
let paginaFichaAtual = 0;
let classeFichaAtual = '';
let elementosFicha = {};
let elementoSelecionadoId = null;

// Estados do Mouse
let isCreating = false; // Criando novo elemento
let isMoving = false;   // Movendo elemento existente
let startX = 0, startY = 0;
let tempBox = null;
let movingElementId = null;
let movingStartLeft = 0;
let movingStartTop = 0;

// --- INICIALIZAÇÃO ---
window.abrirFichaPersonagem = function() {
    const classe = localStorage.getItem('profissaoSelecionada');
    if (!classe || !FICHAS_IMAGENS[classe]) { alert("Selecione uma classe válida primeiro."); return; }

    classeFichaAtual = classe;
    paginaFichaAtual = 0;
    elementoSelecionadoId = null;
    
    document.getElementById('sheet-modal').style.display = 'flex';
    atualizarImagemFicha();
    selecionarFerramenta('texto');
    carregarElementosDoFirebase();
    configurarEventosMouse();
    configurarTeclado();
};

window.fecharFicha = function() { document.getElementById('sheet-modal').style.display = 'none'; };

// --- NAVEGAÇÃO ---
window.mudarPaginaFicha = function(dir) {
    const total = FICHAS_IMAGENS[classeFichaAtual].length;
    paginaFichaAtual += dir;
    if(paginaFichaAtual < 0) paginaFichaAtual = 0;
    if(paginaFichaAtual >= total) paginaFichaAtual = total - 1;
    
    deselecionarTudo();
    atualizarImagemFicha();
    renderizarElementosNaTela();
};

function atualizarImagemFicha() {
    const img = document.getElementById('sheet-bg');
    const paginas = FICHAS_IMAGENS[classeFichaAtual];
    img.src = paginas[paginaFichaAtual];
    document.getElementById('sheet-page-indicator').innerText = `Página ${paginaFichaAtual + 1} de ${paginas.length}`;
}

// --- FERRAMENTAS ---
window.selecionarFerramenta = function(f) {
    ferramentaAtual = f;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    if(f==='texto') document.querySelectorAll('.tool-btn')[0].classList.add('active');
    if(f==='marcador') document.querySelectorAll('.tool-btn')[1].classList.add('active');
};

// --- CONTROLE DE SELEÇÃO E DELEÇÃO (TECLADO) ---
function configurarTeclado() {
    document.addEventListener('keydown', (e) => {
        // Se tem algo selecionado e apertou Delete ou Backspace
        if (elementoSelecionadoId && (e.key === 'Delete' || e.key === 'Backspace')) {
            // Evita deletar se estiver digitando dentro de um input
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
            
            deletarElementoNoFirebase(elementoSelecionadoId);
            deselecionarTudo();
        }
    });
}

function selecionarElemento(id) {
    // Remove classe selected do anterior
    if(elementoSelecionadoId) {
        const elAntigo = document.getElementById('wrap_' + elementoSelecionadoId);
        if(elAntigo) elAntigo.classList.remove('selected');
    }
    
    elementoSelecionadoId = id;
    const elNovo = document.getElementById('wrap_' + id);
    if(elNovo) elNovo.classList.add('selected');
}

function deselecionarTudo() {
    if(elementoSelecionadoId) {
        const el = document.getElementById('wrap_' + elementoSelecionadoId);
        if(el) el.classList.remove('selected');
    }
    elementoSelecionadoId = null;
}

// --- LÓGICA DO MOUSE (CRIAR E MOVER) ---
function configurarEventosMouse() {
    const container = document.getElementById('sheet-container');
    
    container.onmousedown = (e) => {
        const rect = container.getBoundingClientRect();
        
        // Verifica se clicou em um elemento existente (Para Mover ou Selecionar)
        const clickedWrapper = e.target.closest('.element-wrapper');
        
        if (clickedWrapper) {
            // MODO: SELECIONAR / MOVER
            const id = clickedWrapper.id.replace('wrap_', '');
            selecionarElemento(id);
            
            // Só permite mover se não estiver clicando nos botões do menu
            if (e.target.tagName !== 'BUTTON' && !e.target.classList.contains('ctx-btn')) {
                isMoving = true;
                movingElementId = id;
                movingStartLeft = parseFloat(clickedWrapper.style.left);
                movingStartTop = parseFloat(clickedWrapper.style.top);
                startX = e.clientX;
                startY = e.clientY;
            }
            return;
        }

        // Se clicou no fundo: Deseleciona tudo e começa a Criar
        deselecionarTudo();
        
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;

        if (ferramentaAtual === 'texto') {
            isCreating = true;
            tempBox = document.createElement('div');
            tempBox.className = 'temp-box';
            tempBox.style.left = startX + 'px';
            tempBox.style.top = startY + 'px';
            document.getElementById('sheet-inputs-layer').appendChild(tempBox);
        }
    };

    container.onmousemove = (e) => {
        const rect = container.getBoundingClientRect();

        // LOGICA: CRIANDO CAIXA DE TEXTO
        if (isCreating && ferramentaAtual === 'texto' && tempBox) {
            const currentX = e.clientX - rect.left;
            const currentY = e.clientY - rect.top;
            
            const width = currentX - startX;
            const height = currentY - startY;
            
            tempBox.style.width = Math.abs(width) + 'px';
            tempBox.style.height = Math.abs(height) + 'px';
            tempBox.style.left = (width < 0 ? currentX : startX) + 'px';
            tempBox.style.top = (height < 0 ? currentY : startY) + 'px';
        }

        // LOGICA: MOVENDO ELEMENTO EXISTENTE
        if (isMoving && movingElementId) {
            const wrapper = document.getElementById('wrap_' + movingElementId);
            if(wrapper) {
                // Calcula delta em pixels
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                
                // Converte delta para % para somar com a posição original
                const dxPct = (dx / rect.width) * 100;
                const dyPct = (dy / rect.height) * 100;
                
                wrapper.style.left = (movingStartLeft + dxPct) + '%';
                wrapper.style.top = (movingStartTop + dyPct) + '%';
            }
        }
    };

    container.onmouseup = (e) => {
        const rect = container.getBoundingClientRect();

        // FINALIZAR MOVIMENTO
        if (isMoving && movingElementId) {
            isMoving = false;
            // Salva a nova posição no Firebase
            const wrapper = document.getElementById('wrap_' + movingElementId);
            if(wrapper && elementosFicha[movingElementId]) {
                const el = elementosFicha[movingElementId];
                el.x = parseFloat(wrapper.style.left);
                el.y = parseFloat(wrapper.style.top);
                salvarElementoNoFirebase(el);
            }
            movingElementId = null;
            return;
        }

        // FINALIZAR CRIAÇÃO (TEXTO)
        if (isCreating && ferramentaAtual === 'texto') {
            isCreating = false;
            
            const finalW = parseFloat(tempBox.style.width);
            const finalH = parseFloat(tempBox.style.height);
            const finalL = parseFloat(tempBox.style.left);
            const finalT = parseFloat(tempBox.style.top);
            
            if (tempBox) tempBox.remove();
            tempBox = null;

            if (finalW < 10 || finalH < 10) return; // Ignora cliques muito pequenos

            const xPct = (finalL / rect.width) * 100;
            const yPct = (finalT / rect.height) * 100;
            const wPct = (finalW / rect.width) * 100;
            const hPct = (finalH / rect.height) * 100;

            criarElementoFinal(xPct, yPct, wPct, hPct, 'texto');
            return;
        }

        // FINALIZAR CRIAÇÃO (MARCADOR - Clique Simples)
        if (ferramentaAtual === 'marcador') {
            const xPct = ((e.clientX - rect.left) / rect.width) * 100;
            const yPct = ((e.clientY - rect.top) / rect.height) * 100;
            
            // Tamanho fixo menor para marcador (aprox 1.5% da largura)
            criarElementoFinal(xPct, yPct, 1.5, 0, 'marcador'); 
        }
    };
}

function criarElementoFinal(x, y, w, h, tipo) {
    const idUnico = 'el_' + Date.now();
    const novoElemento = {
        id: idUnico,
        tipo: tipo,
        x: x, y: y, w: w, h: h,
        pagina: paginaFichaAtual,
        valor: tipo === 'texto' ? '' : true,
        fontSize: 1.6 // Tamanho fonte padrão (em vh)
    };
    salvarElementoNoFirebase(novoElemento);
}

// --- LÓGICA DE FONTE (AUMENTAR/DIMINUIR) ---
window.alterarFonteElemento = function(id, delta) {
    if (!elementosFicha[id]) return;
    
    let size = elementosFicha[id].fontSize || 1.6;
    size += delta;
    if (size < 0.5) size = 0.5;
    if (size > 5.0) size = 5.0;
    
    elementosFicha[id].fontSize = size;
    
    // Atualiza visualmente na hora
    const el = document.getElementById('input_' + id);
    if(el) el.style.fontSize = size + 'vh';
    
    salvarElementoNoFirebase(elementosFicha[id]);
};

window.deletarViaMenu = function(id) {
    deletarElementoNoFirebase(id);
};

// --- FIREBASE ---
function salvarElementoNoFirebase(elemento) {
    if (!window.nomeJogador || !window.db) return;
    const refPath = `mesa_rpg/jogadores/${window.nomeJogador}/ficha/${elemento.id}`;
    window.set(window.ref(window.db, refPath), elemento);
}

function deletarElementoNoFirebase(id) {
    if (!window.nomeJogador || !window.db) return;
    const refPath = `mesa_rpg/jogadores/${window.nomeJogador}/ficha/${id}`;
    window.remove(window.ref(window.db, refPath));
}

function carregarElementosDoFirebase() {
    if (!window.nomeJogador || !window.db) return;
    const refPath = `mesa_rpg/jogadores/${window.nomeJogador}/ficha`;
    window.onValue(window.ref(window.db, refPath), (snapshot) => {
        elementosFicha = snapshot.exists() ? snapshot.val() : {};
        renderizarElementosNaTela();
    });
}

// --- RENDERIZAÇÃO ---
function renderizarElementosNaTela() {
    const layer = document.getElementById('sheet-inputs-layer');
    layer.innerHTML = '';

    Object.values(elementosFicha).forEach(el => {
        if (el.pagina !== paginaFichaAtual) return;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'element-wrapper';
        wrapper.id = 'wrap_' + el.id;
        wrapper.style.left = el.x + '%';
        wrapper.style.top = el.y + '%';
        wrapper.style.width = el.w + '%';
        wrapper.style.height = (el.tipo === 'texto' ? el.h + '%' : el.w + '%'); // Marcador quadrado/redondo proporcional
        
        if (elementoSelecionadoId === el.id) wrapper.classList.add('selected');

        // MENU DE CONTEXTO (Flutuante)
        const menu = document.createElement('div');
        menu.className = 'element-context-menu';
        menu.innerHTML = `
            <button class="ctx-btn" onclick="alterarFonteElemento('${el.id}', 0.2)" title="Aumentar">A+</button>
            <button class="ctx-btn" onclick="alterarFonteElemento('${el.id}', -0.2)" title="Diminuir">A-</button>
            <button class="ctx-btn del" onclick="deletarViaMenu('${el.id}')" title="Apagar">🗑️</button>
        `;
        wrapper.appendChild(menu);

        if (el.tipo === 'texto') {
            const input = document.createElement('textarea');
            input.id = 'input_' + el.id;
            input.className = 'user-textarea';
            input.value = el.valor;
            input.style.fontSize = (el.fontSize || 1.6) + 'vh';
            
            // Salva ao digitar
            let timeout;
            input.oninput = (e) => {
                el.valor = e.target.value;
                clearTimeout(timeout);
                timeout = setTimeout(() => salvarElementoNoFirebase(el), 500);
            };
            
            wrapper.appendChild(input);
        } 
        else if (el.tipo === 'marcador') {
            const marker = document.createElement('div');
            marker.className = 'user-marker';
            wrapper.appendChild(marker);
            // Ajuste visual para marcador ser pequeno
            wrapper.style.width = '2vh';
            wrapper.style.height = '2vh';
            wrapper.style.transform = 'translate(-50%, -50%)';
        }

        layer.appendChild(wrapper);
    });
}

window.limparPaginaAtual = function() {
    if(!confirm("Limpar esta página inteira?")) return;
    Object.values(elementosFicha).forEach(el => {
        if (el.pagina === paginaFichaAtual) deletarElementoNoFirebase(el.id);
    });
};