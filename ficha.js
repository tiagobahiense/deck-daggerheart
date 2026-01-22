// =========================================================
// FICHA DIGITAL - PRANCHETA V3.0 (Manual Resize)
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
let activeElementId = null; // ID do elemento sendo movido ou redimensionado
let initialRect = {}; // Guarda posição/tamanho inicial para calculo

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
            // Permite apagar texto dentro do input sem apagar o elemento
            if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'TEXTAREA') return;
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
    
    container.onmousedown = (e) => {
        if(e.target.tagName === 'BUTTON' || e.target.closest('.element-context-menu') || e.target.classList.contains('delete-handle')) return;

        const rect = container.getBoundingClientRect();
        
        // 1. Verificar se clicou na ALÇA DE RESIZE
        if (e.target.classList.contains('resize-handle')) {
            const wrapper = e.target.closest('.element-wrapper');
            activeElementId = wrapper.id.replace('wrap_', '');
            isResizing = true;
            startX = e.clientX;
            startY = e.clientY;
            // Salva dimensões iniciais em PX
            initialRect = {
                w: wrapper.offsetWidth,
                h: wrapper.offsetHeight,
                l: wrapper.offsetLeft,
                t: wrapper.offsetTop
            };
            return;
        }

        // 2. Verificar se clicou em um ELEMENTO (Mover)
        const clickedWrapper = e.target.closest('.element-wrapper');
        if (clickedWrapper) {
            const id = clickedWrapper.id.replace('wrap_', '');
            selecionarElemento(id);
            
            // Só move se clicar na borda/fundo, não se estiver editando texto
            if (e.target.tagName !== 'TEXTAREA') {
                isMoving = true;
                activeElementId = id;
                startX = e.clientX;
                startY = e.clientY;
                initialRect = {
                    l: clickedWrapper.offsetLeft,
                    t: clickedWrapper.offsetTop
                };
            }
            return;
        }

        // 3. Clicou no VAZIO (Criar)
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

        // REDIMENSIONANDO
        if (isResizing && activeElementId) {
            const wrapper = document.getElementById('wrap_' + activeElementId);
            if(wrapper) {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                
                // Calcula nova largura/altura em PX
                const newW = initialRect.w + dx;
                const newH = initialRect.h + dy;
                
                // Converte para % para salvar responsivo
                const wPct = (newW / rect.width) * 100;
                const hPct = (newH / rect.height) * 100;
                
                // Aplica visualmente
                wrapper.style.width = wPct + '%';
                wrapper.style.height = hPct + '%';
            }
        }

        // MOVENDO
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

        // CRIANDO
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

        // SALVAR APÓS REDIMENSIONAR
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

        // SALVAR APÓS MOVER
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

        // FINALIZAR CRIAÇÃO (TEXTO)
        if (isCreating && ferramentaAtual === 'texto') {
            isCreating = false;
            const finalW = parseFloat(tempBox.style.width);
            const finalH = parseFloat(tempBox.style.height);
            const finalL = parseFloat(tempBox.style.left);
            const finalT = parseFloat(tempBox.style.top);
            if (tempBox) tempBox.remove();
            tempBox = null;

            if (finalW < 10 || finalH < 10) return; 

            const xPct = (finalL / rect.width) * 100;
            const yPct = (finalT / rect.height) * 100;
            const wPct = (finalW / rect.width) * 100;
            const hPct = (finalH / rect.height) * 100;

            criarElementoFinal(xPct, yPct, wPct, hPct, 'texto');
            return;
        }

        // FINALIZAR CRIAÇÃO (MARCADOR - CLIQUE SIMPLES)
        if (ferramentaAtual === 'marcador') {
            if(e.target.closest('.element-wrapper') || e.target.classList.contains('delete-handle')) return;

            const xPct = ((e.clientX - rect.left) / rect.width) * 100;
            const yPct = ((e.clientY - rect.top) / rect.height) * 100;
            
            // Cria marcador com 1.5% de tamanho inicial
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
        fontSize: tipo === 'texto' ? 1.6 : 1.5
    };
    salvarElementoNoFirebase(novoElemento);
}

// --- AÇÕES DO MENU ---
window.alterarTamanhoElemento = function(id, delta) {
    if (!elementosFicha[id]) return;
    
    // Se for texto, muda FONTE. Se for marcador, muda LARGURA (Zoom)
    if (elementosFicha[id].tipo === 'texto') {
        let size = elementosFicha[id].fontSize || 1.6;
        size += delta;
        if(size < 0.5) size = 0.5;
        elementosFicha[id].fontSize = size;
        
        // Aplica visualmente
        const input = document.getElementById('input_' + id);
        if(input) input.style.fontSize = size + 'vh';
        
    } else {
        // Marcador: Aumenta o 'w' (largura em %)
        let size = elementosFicha[id].w || 1.5;
        size += (delta * 0.5); // Aumenta de 0.1 em 0.1
        if(size < 0.5) size = 0.5;
        elementosFicha[id].w = size;
        
        const wrap = document.getElementById('wrap_' + id);
        if(wrap) {
            wrap.style.width = size + '%';
            wrap.style.height = size + '%'; // Mantém proporção
        }
    }
    
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
        
        if(el.tipo === 'texto') {
            wrapper.style.height = el.h + '%';
        } else {
            // Marcador usa W para altura tbm para ser quadrado/redondo
            // O CSS cuida do aspect-ratio se o browser suportar, mas garantimos aqui
            wrapper.style.height = 'auto'; // Deixa o conteudo definir ou usa aspect-ratio do CSS
            wrapper.style.aspectRatio = '1/1';
            wrapper.style.transform = 'translate(-50%, -50%)'; 
        }
        
        if (elementoSelecionadoId === el.id) wrapper.classList.add('selected');

        // MENU CONTEXTO
        // Usei event.stopPropagation() para não disparar clique no fundo
        const menuHTML = `
            <div class="element-context-menu" onmousedown="event.stopPropagation()">
                <button class="ctx-btn" onclick="alterarTamanhoElemento('${el.id}', ${el.tipo==='texto'?0.2:0.5})" title="Aumentar">+</button>
                <button class="ctx-btn" onclick="alterarTamanhoElemento('${el.id}', ${el.tipo==='texto'?-0.2:-0.5})" title="Diminuir">-</button>
                <button class="ctx-btn del" onclick="deletarViaMenu('${el.id}')" title="Apagar">🗑️</button>
            </div>
            <div class="resize-handle"></div>
        `;
        wrapper.innerHTML = menuHTML;

        if (el.tipo === 'texto') {
            const input = document.createElement('textarea');
            input.id = 'input_' + el.id;
            input.className = 'user-textarea';
            input.value = el.valor;
            input.style.fontSize = (el.fontSize || 1.6) + 'vh';
            
            let timeout;
            input.oninput = (e) => {
                el.valor = e.target.value;
                clearTimeout(timeout);
                timeout = setTimeout(() => salvarElementoNoFirebase(el), 500);
            };
            
            // Focar se for novo e vazio
            if(el.valor === '') setTimeout(() => input.focus(), 50);
            
            wrapper.appendChild(input);
        } 
        else if (el.tipo === 'marcador') {
            const marker = document.createElement('div');
            marker.className = 'user-marker';
            wrapper.appendChild(marker);
            
            // Botão de deletar extra (aquele X vermelho do hover)
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