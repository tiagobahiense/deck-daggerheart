// =========================================================
// FICHA DIGITAL - PRANCHETA V2.1
// (Auto-Resize, Zoom Marcador, Correção de Cliques)
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

// --- EVENTOS DO MOUSE (DRAG & DROP) ---
function configurarEventosMouse() {
    const container = document.getElementById('sheet-container');
    
    container.onmousedown = null;
    container.onmousemove = null;
    container.onmouseup = null;

    container.onmousedown = (e) => {
        // Se clicar no botão do menu, não faz nada aqui (já tem onclick no botão)
        if(e.target.tagName === 'BUTTON' || e.target.closest('.element-context-menu')) return;

        const rect = container.getBoundingClientRect();
        
        // Clicou num elemento existente (Mover/Selecionar)
        const clickedWrapper = e.target.closest('.element-wrapper');
        
        if (clickedWrapper) {
            const id = clickedWrapper.id.replace('wrap_', '');
            selecionarElemento(id);
            
            // Inicia movimento apenas se clicar na borda/wrapper, não no texto editável
            if (e.target.tagName !== 'TEXTAREA') {
                isMoving = true;
                movingElementId = id;
                movingStartLeft = parseFloat(clickedWrapper.style.left);
                movingStartTop = parseFloat(clickedWrapper.style.top);
                startX = e.clientX;
                startY = e.clientY;
            }
            return;
        }

        // Clicou no vazio (Criar)
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

        if (isMoving && movingElementId) {
            const wrapper = document.getElementById('wrap_' + movingElementId);
            if(wrapper) {
                const dx = e.clientX - startX;
                const dy = e.clientY - startY;
                const dxPct = (dx / rect.width) * 100;
                const dyPct = (dy / rect.height) * 100;
                
                wrapper.style.left = (movingStartLeft + dxPct) + '%';
                wrapper.style.top = (movingStartTop + dyPct) + '%';
            }
        }
    };

    container.onmouseup = (e) => {
        const rect = container.getBoundingClientRect();

        if (isMoving && movingElementId) {
            isMoving = false;
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

        if (ferramentaAtual === 'marcador') {
            // Se clicou em botão ou menu, aborta
            if(e.target.tagName === 'BUTTON' || e.target.closest('.element-wrapper')) return;

            const xPct = ((e.clientX - rect.left) / rect.width) * 100;
            const yPct = ((e.clientY - rect.top) / rect.height) * 100;
            
            // Tamanho inicial menor (1.5%)
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
        fontSize: tipo === 'texto' ? 1.6 : 1.5 // Texto 1.6vh, Marcador 1.5%
    };
    salvarElementoNoFirebase(novoElemento);
}

// --- AÇÕES DO MENU (AGORA COM STOP PROPAGATION) ---
window.alterarTamanhoElemento = function(id, delta) {
    if (!elementosFicha[id]) return;
    
    // Se for texto, altera fontSize. Se for marcador, altera W (largura/zoom)
    let prop = elementosFicha[id].tipo === 'texto' ? 'fontSize' : 'w';
    let val = elementosFicha[id][prop] || (prop === 'fontSize' ? 1.6 : 1.5);
    
    val += delta;
    if (val < 0.5) val = 0.5;
    
    elementosFicha[id][prop] = val;
    
    // Atualiza visual na hora
    const wrap = document.getElementById('wrap_' + id);
    const input = document.getElementById('input_' + id);
    
    if (elementosFicha[id].tipo === 'texto' && input) {
        input.style.fontSize = val + 'vh';
        // Auto-resize após mudar fonte
        autoResizeTextarea(input, wrap, id);
    } else if (elementosFicha[id].tipo === 'marcador' && wrap) {
        wrap.style.width = val + '%';
        wrap.style.height = val + '%'; // Mantém proporção
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
            // Para marcador, altura = largura (quadrado/circulo)
            // Mas como é %, precisamos garantir aspecto. O CSS cuida disso com width/height 100% no filho.
            // Aqui definimos o tamanho do wrapper.
            // Nota: % de altura e largura podem distorcer se a tela não for quadrada.
            // Simplificação: vamos usar o W salvo para os dois.
            wrapper.style.width = el.w + '%'; 
            wrapper.style.aspectRatio = '1/1';
            wrapper.style.transform = 'translate(-50%, -50%)'; // Centralizar
        }
        
        if (elementoSelecionadoId === el.id) wrapper.classList.add('selected');

        // MENU DE CONTEXTO
        // IMPORTANTE: onclick="event.stopPropagation()" em cada botão
        const menuHTML = `
            <div class="element-context-menu">
                <button class="ctx-btn" onclick="event.stopPropagation(); alterarTamanhoElemento('${el.id}', ${el.tipo==='texto'?0.2:0.5})" title="Aumentar">+</button>
                <button class="ctx-btn" onclick="event.stopPropagation(); alterarTamanhoElemento('${el.id}', ${el.tipo==='texto'?-0.2:-0.5})" title="Diminuir">-</button>
                <button class="ctx-btn del" onclick="event.stopPropagation(); deletarViaMenu('${el.id}')" title="Apagar">🗑️</button>
            </div>
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
                autoResizeTextarea(input, wrapper, el.id); // Expandir se necessário
                clearTimeout(timeout);
                timeout = setTimeout(() => salvarElementoNoFirebase(el), 500);
            };
            
            // Auto resize inicial
            setTimeout(() => autoResizeTextarea(input, wrapper, el.id), 0);
            
            wrapper.appendChild(input);
        } 
        else if (el.tipo === 'marcador') {
            const marker = document.createElement('div');
            marker.className = 'user-marker';
            wrapper.appendChild(marker);
        }

        layer.appendChild(wrapper);
    });
}

// Lógica de Expansão Automática para Texto
function autoResizeTextarea(input, wrapper, id) {
    // Reseta altura para medir o scrollHeight correto
    input.style.height = 'auto'; 
    
    // Se o conteúdo for maior que o container atual
    if (input.scrollHeight > input.clientHeight) {
        // Converte pixel para porcentagem relativa ao container pai (sheet-container)
        const containerHeight = document.getElementById('sheet-container').clientHeight;
        const newHeightPct = (input.scrollHeight / containerHeight) * 100;
        
        // Aplica nova altura e salva
        wrapper.style.height = newHeightPct + '%';
        
        if(elementosFicha[id]) {
            elementosFicha[id].h = newHeightPct;
            // Opcional: Salvar no DB aqui ou deixar para o debounce do oninput
        }
    }
    input.style.height = '100%'; // Restaura para ocupar o wrapper
}

window.limparPaginaAtual = function() {
    if(!confirm("Limpar esta página inteira?")) return;
    Object.values(elementosFicha).forEach(el => {
        if (el.pagina === paginaFichaAtual) deletarElementoNoFirebase(el.id);
    });
};