// =========================================================
// FICHA DIGITAL - PRANCHETA V4.0 
// (Drag Overlay, Double-Click Edit, Color Picker)
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
let isCreating = false;
let isMoving = false;
let isResizing = false;
let startX = 0, startY = 0;
let tempBox = null;
let activeElementId = null;
let initialRect = {};

// Cores disponíveis para o texto
const TEXT_COLORS = {
    black: '#000000',
    red: '#8b0000',
    green: '#006400',
    orange: '#d2691e'
};

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

window.selecionarFerramenta = function(f) {
    ferramentaAtual = f;
    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
    if(f==='texto') document.querySelectorAll('.tool-btn')[0].classList.add('active');
    if(f==='marcador') document.querySelectorAll('.tool-btn')[1].classList.add('active');
};

function configurarTeclado() {
    document.addEventListener('keydown', (e) => {
        if (elementoSelecionadoId && (e.key === 'Delete' || e.key === 'Backspace')) {
            // Se estiver editando texto (digitando), NÃO deleta o elemento
            const wrapper = document.getElementById('wrap_' + elementoSelecionadoId);
            if (wrapper && wrapper.classList.contains('is-editing')) return;

            deletarElementoNoFirebase(elementoSelecionadoId);
            deselecionarTudo();
        }
    });
}

function selecionarElemento(id) {
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

// --- LOGICA DE EVENTOS (CRIAR, MOVER, REDIMENSIONAR) ---
function configurarEventosMouse() {
    const container = document.getElementById('sheet-container');
    
    // REMOVE LISTENERS ANTIGOS
    container.ondblclick = null;
    container.onmousedown = null;
    container.onmousemove = null;
    container.onmouseup = null;

    // 1. DUPLO CLIQUE: ENTRAR NO MODO EDIÇÃO
    container.ondblclick = (e) => {
        // Verifica se clicou na camada de arraste (overlay)
        const overlay = e.target.closest('.drag-overlay');
        if (overlay) {
            const wrapper = overlay.closest('.element-wrapper');
            const id = wrapper.id.replace('wrap_', '');
            const input = document.getElementById('input_' + id);
            
            if(input) {
                deselecionarTudo();
                wrapper.classList.add('is-editing'); // CSS esconde o overlay e libera o input
                input.focus();
                // Hack para mover cursor para o final
                const val = input.value;
                input.value = '';
                input.value = val;
            }
        }
    };

    container.onmousedown = (e) => {
        // Ignora cliques no menu, botões ou delete
        if(e.target.tagName === 'BUTTON' || e.target.closest('.element-context-menu') || e.target.classList.contains('delete-handle')) return;

        // Se estiver editando texto (clicou no textarea), deixa o padrão do navegador (selecionar texto)
        if(e.target.tagName === 'TEXTAREA') return;

        const rect = container.getBoundingClientRect();
        
        // 2. REDIMENSIONAR (Resize Handle)
        if (e.target.classList.contains('resize-handle')) {
            const wrapper = e.target.closest('.element-wrapper');
            activeElementId = wrapper.id.replace('wrap_', '');
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            initialRect = { w: wrapper.offsetWidth, h: wrapper.offsetHeight, l: wrapper.offsetLeft, t: wrapper.offsetTop };
            return;
        }

        // 3. MOVER (Clicou no Overlay ou na Bolinha)
        // O Overlay cobre o texto, então o clique cai nele.
        const clickedWrapper = e.target.closest('.element-wrapper');
        if (clickedWrapper) {
            const id = clickedWrapper.id.replace('wrap_', '');
            selecionarElemento(id);
            
            isMoving = true;
            activeElementId = id;
            startX = e.clientX;
            startY = e.clientY;
            initialRect = { l: clickedWrapper.offsetLeft, t: clickedWrapper.offsetTop };
            return;
        }

        // 4. CRIAR NOVO (Clicou no vazio)
        deselecionarTudo();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;

        if (ferramentaAtual === 'texto') {
            isCreating = true;
            tempBox = document.createElement('div');
            tempBox.className = 'temp-box';
            tempBox.style.left = startX + 'px';
            tempBox.style.top = startY + 'px';
            tempBox.style.width = '0px';
            tempBox.style.height = '0px';
            document.getElementById('sheet-inputs-layer').appendChild(tempBox);
        }
    };

    container.onmousemove = (e) => {
        const rect = container.getBoundingClientRect();

        // Arrastando Resize
        if (isResizing && activeElementId) {
            const wrapper = document.getElementById('wrap_' + activeElementId);
            if(wrapper) {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                const newW = Math.max(20, initialRect.w + dx);
                const newH = Math.max(20, initialRect.h + dy);
                const wPct = (newW / rect.width) * 100;
                const hPct = (newH / rect.height) * 100;
                wrapper.style.width = wPct + '%';
                wrapper.style.height = hPct + '%';
            }
        }

        // Arrastando Posição (Mover)
        if (isMoving && activeElementId) {
            const wrapper = document.getElementById('wrap_' + activeElementId);
            if(wrapper) {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                const newL = initialRect.l + dx;
                const newT = initialRect.t + dy;
                const xPct = (newL / rect.width) * 100;
                const yPct = (newT / rect.height) * 100;
                wrapper.style.left = xPct + '%';
                wrapper.style.top = yPct + '%';
            }
        }

        // Criando Caixa
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
    };

    container.onmouseup = (e) => {
        const rect = container.getBoundingClientRect();

        // Finaliza Resize
        if (isResizing && activeElementId) {
            isResizing = false;
            const wrapper = document.getElementById('wrap_' + activeElementId);
            if(wrapper && elementosFicha[activeElementId]) {
                const el = elementosFicha[activeElementId];
                el.w = parseFloat(wrapper.style.width);
                el.h = parseFloat(wrapper.style.height);
                salvarElementoNoFirebase(el);
            }
            activeElementId = null;
            return;
        }

        // Finaliza Mover
        if (isMoving && activeElementId) {
            isMoving = false;
            const wrapper = document.getElementById('wrap_' + activeElementId);
            if(wrapper && elementosFicha[activeElementId]) {
                const el = elementosFicha[activeElementId];
                el.x = parseFloat(wrapper.style.left);
                el.y = parseFloat(wrapper.style.top);
                salvarElementoNoFirebase(el);
            }
            activeElementId = null;
            return;
        }

        // Finaliza Criar (Texto)
        if (isCreating && ferramentaAtual === 'texto') {
            isCreating = false;
            const finalW = parseFloat(tempBox.style.width);
            const finalH = parseFloat(tempBox.style.height);
            const finalL = parseFloat(tempBox.style.left);
            const finalT = parseFloat(tempBox.style.top);
            if (tempBox) tempBox.remove();
            tempBox = null;

            if (finalW < 15 || finalH < 15) return; 

            const xPct = (finalL / rect.width) * 100;
            const yPct = (finalT / rect.height) * 100;
            const wPct = (finalW / rect.width) * 100;
            const hPct = (finalH / rect.height) * 100;

            criarElementoFinal(xPct, yPct, wPct, hPct, 'texto');
            return;
        }

        // Finaliza Criar (Marcador)
        if (ferramentaAtual === 'marcador') {
            if(e.target.closest('.element-wrapper') || e.target.classList.contains('delete-handle')) return;
            const xPct = ((e.clientX - rect.left) / rect.width) * 100;
            const yPct = ((e.clientY - rect.top) / rect.height) * 100;
            criarElementoFinal(xPct, yPct, 1.5, 0, 'marcador'); 
        }
    };
}

function criarElementoFinal(x, y, w, h, tipo) {
    const idUnico = 'el_' + Date.now();
    const novoElemento = {
        id: idUnico, tipo: tipo, x: x, y: y, w: w, h: h,
        pagina: paginaFichaAtual,
        valor: tipo === 'texto' ? '' : true,
        fontSize: tipo === 'texto' ? 1.6 : 1.5,
        color: 'black'
    };
    salvarElementoNoFirebase(novoElemento);
}

// --- AÇÕES DO MENU ---
window.alterarTamanhoElemento = function(id, delta) {
    if (!elementosFicha[id]) return;
    
    if (elementosFicha[id].tipo === 'texto') {
        let size = elementosFicha[id].fontSize || 1.6;
        size += delta;
        if(size < 0.5) size = 0.5;
        elementosFicha[id].fontSize = size;
        const input = document.getElementById('input_' + id);
        if(input) input.style.fontSize = size + 'vh';
    } else {
        let size = elementosFicha[id].w || 1.5;
        size += (delta * 0.5);
        if(size < 0.5) size = 0.5;
        elementosFicha[id].w = size;
        const wrap = document.getElementById('wrap_' + id);
        if(wrap) { wrap.style.width = size + '%'; wrap.style.height = size + '%'; }
    }
    salvarElementoNoFirebase(elementosFicha[id]);
};

window.alterarCorElemento = function(id, corKey) {
    if (!elementosFicha[id] || elementosFicha[id].tipo !== 'texto') return;
    
    elementosFicha[id].color = corKey;
    
    const input = document.getElementById('input_' + id);
    if(input) input.style.color = TEXT_COLORS[corKey];
    
    salvarElementoNoFirebase(elementosFicha[id]);
    renderizarElementosNaTela(); // Atualiza botões do menu
    selecionarElemento(id);
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
        
        if(el.tipo === 'texto') {
            wrapper.style.height = el.h + '%';
        } else {
            wrapper.style.height = 'auto';
            wrapper.style.aspectRatio = '1/1';
            wrapper.style.transform = 'translate(-50%, -50%)'; 
        }
        
        if (elementoSelecionadoId === el.id) wrapper.classList.add('selected');

        // GERA BOTOES DE COR
        let colorButtonsHTML = '';
        if (el.tipo === 'texto') {
            const currentColor = el.color || 'black';
            colorButtonsHTML = `
                <div class="color-separator"></div>
                <div style="display: flex; gap: 3px;">
                    ${Object.keys(TEXT_COLORS).map(key => `
                        <button class="color-btn ${currentColor === key ? 'active-color' : ''}" 
                                style="background: ${TEXT_COLORS[key]};" 
                                onclick="event.stopPropagation(); alterarCorElemento('${el.id}', '${key}')" 
                                title="${key}">
                        </button>
                    `).join('')}
                </div>
            `;
        }

        const menuHTML = `
            <div class="element-context-menu" onmousedown="event.stopPropagation()" ondblclick="event.stopPropagation()">
                <button class="ctx-btn" onclick="event.stopPropagation(); alterarTamanhoElemento('${el.id}', ${el.tipo==='texto'?0.2:0.5})" title="Aumentar">+</button>
                <button class="ctx-btn" onclick="event.stopPropagation(); alterarTamanhoElemento('${el.id}', ${el.tipo==='texto'?-0.2:-0.5})" title="Diminuir">-</button>
                ${colorButtonsHTML}
                <div class="color-separator"></div>
                <button class="ctx-btn del" onclick="event.stopPropagation(); deletarViaMenu('${el.id}')" title="Apagar">🗑️</button>
            </div>
            <div class="resize-handle"></div>
        `;
        wrapper.innerHTML = menuHTML;

        if (el.tipo === 'texto') {
            // CAMPO DE TEXTO
            const input = document.createElement('textarea');
            input.id = 'input_' + el.id;
            input.className = 'user-textarea';
            input.value = el.valor;
            input.style.fontSize = (el.fontSize || 1.6) + 'vh';
            input.style.color = TEXT_COLORS[el.color || 'black'];
            
            // SAIR DA EDIÇÃO (BLUR)
            input.onblur = () => {
                wrapper.classList.remove('is-editing'); // Traz o overlay de volta
                if (input.value !== el.valor) {
                    el.valor = input.value;
                    salvarElementoNoFirebase(el);
                }
            };

            wrapper.appendChild(input);

            // CAMADA DE ARRASTE (OVERLAY) - O segredo da "mãozinha"
            const overlay = document.createElement('div');
            overlay.className = 'drag-overlay';
            wrapper.appendChild(overlay);

        } 
        else if (el.tipo === 'marcador') {
            const marker = document.createElement('div');
            marker.className = 'user-marker';
            wrapper.appendChild(marker);
            
            const delBtn = document.createElement('div');
            delBtn.className = 'delete-handle';
            delBtn.innerText = 'x';
            delBtn.onclick = (e) => { e.stopPropagation(); deletarElementoNoFirebase(el.id); };
            wrapper.appendChild(delBtn);
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