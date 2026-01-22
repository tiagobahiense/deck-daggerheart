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

const TEXT_COLORS = { 'black': '#000000', 'red': '#cc0000', 'white': '#ffffff' };

let paginaFichaAtual = 0;
let ferramentaAtual = 'texto';
let corAtual = 'black';
let elementosFicha = {}; 
let paginasTotais = 1;
let imgFichaAtual = [];

window.abrirFichaPersonagem = function() {
    const prof = localStorage.getItem('profissaoSelecionada') || 'Guerreiro';
    imgFichaAtual = FICHAS_IMAGENS[prof] || FICHAS_IMAGENS['Guerreiro'];
    paginasTotais = imgFichaAtual.length;
    paginaFichaAtual = 0;

    carregarFichaDe(window.nomeJogador);
    
    document.getElementById('sheet-modal').style.display = 'flex';
    atualizarPaginaFicha();
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
    // Apenas botões que não são o guia ganham 'active' visualmente
    if(ferramenta !== 'guia') {
        event.currentTarget.classList.add('active');
    }
};

window.mudarCorTexto = function(cor) {
    corAtual = cor;
    document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active-color'));
    event.currentTarget.classList.add('active-color');
};

// --- ARRASTAR E SOLTAR PARA CRIAR ---
const container = document.getElementById('sheet-container');
let isDrawing = false;
let startX, startY;
let tempBox = null;

if(container) {
    container.onmousedown = (e) => {
        // Se estiver clicando no tutorial ou seus filhos, ignorar
        if(e.target.closest('#tutorial-overlay')) return;
        if(e.target.classList.contains('input-wrapper') || e.target.classList.contains('drag-overlay')) return;

        isDrawing = true;
        const rect = container.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;

        if (ferramentaAtual === 'texto') {
            tempBox = document.createElement('div');
            tempBox.className = 'temp-box';
            tempBox.style.left = startX + 'px';
            tempBox.style.top = startY + 'px';
            container.appendChild(tempBox);
        }
    };

    container.onmousemove = (e) => {
        if (!isDrawing) return;
        const rect = container.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;

        if (ferramentaAtual === 'texto' && tempBox) {
            tempBox.style.width = Math.abs(currentX - startX) + 'px';
            tempBox.style.height = Math.abs(currentY - startY) + 'px';
            tempBox.style.left = Math.min(currentX, startX) + 'px';
            tempBox.style.top = Math.min(currentY, startY) + 'px';
        }
    };

    container.onmouseup = (e) => {
        if (!isDrawing) return;
        isDrawing = false;
        
        const rect = container.getBoundingClientRect();
        const endX = e.clientX - rect.left;
        const endY = e.clientY - rect.top;

        // Calcular porcentagens
        const widthPct = (Math.abs(endX - startX) / rect.width) * 100;
        const heightPct = (Math.abs(endY - startY) / rect.height) * 100;
        const leftPct = (Math.min(startX, endX) / rect.width) * 100;
        const topPct = (Math.min(startY, endY) / rect.height) * 100;

        if (ferramentaAtual === 'texto') {
            if (tempBox) tempBox.remove();
            if (widthPct > 2 && heightPct > 2) { // Tamanho mínimo
                criarNovoElemento('texto', { top: topPct, left: leftPct, width: widthPct, height: heightPct });
            }
        } else if (ferramentaAtual === 'marcador') {
            criarNovoElemento('marcador', { top: (endY/rect.height)*100, left: (endX/rect.width)*100 });
        }
    };
}

// --- FIREBASE SYNC ---
function carregarFichaDe(nome) {
    if(!window.ref || !window.db) return;
    window.onValue(window.ref(window.db, `mesa_rpg/jogadores/${nome}/ficha`), (snap) => {
        elementosFicha = snap.val() || {};
        renderizarElementosFicha();
    });
}

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
        color: corAtual
    };
    
    // Salvar no Firebase
    if(window.nomeJogador) {
        window.set(window.ref(window.db, `mesa_rpg/jogadores/${window.nomeJogador}/ficha/${id}`), novo);
    }
}

function salvarElementoNoFirebase(el) {
    if(window.nomeJogador) {
        window.set(window.ref(window.db, `mesa_rpg/jogadores/${window.nomeJogador}/ficha/${el.id}`), el);
    }
}

function deletarElementoNoFirebase(id) {
    if(window.nomeJogador) {
        window.remove(window.ref(window.db, `mesa_rpg/jogadores/${window.nomeJogador}/ficha/${id}`));
    }
}

// --- RENDERIZAÇÃO ---
function renderizarElementosFicha() {
    const layer = document.getElementById('sheet-inputs-layer');
    layer.innerHTML = '';

    Object.values(elementosFicha).forEach(el => {
        if (el.pagina !== paginaFichaAtual) return;

        const wrapper = document.createElement('div');
        wrapper.className = 'input-wrapper';
        wrapper.style.top = el.top + '%';
        wrapper.style.left = el.left + '%';
        
        if (el.tipo === 'texto') {
            wrapper.style.width = el.width + '%';
            wrapper.style.height = el.height + '%';
            
            const input = document.createElement('textarea');
            input.className = 'sheet-input';
            input.value = el.valor || '';
            input.style.fontSize = (el.fontSize || 1.5) + 'vh';
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

            // DOUBLE CLICK PARA EDITAR
            overlay.ondblclick = () => {
                wrapper.classList.add('is-editing');
                input.focus();
            };

            // ARRASTAR CAIXA (Desktop) - Requer lógica complexa de drag, simplificada aqui:
            // Implementação futura ou usar biblioteca de drag. Por enquanto apenas cria.

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

// =========================================================
// LÓGICA DO TUTORIAL (CORRIGIDA E REFORÇADA)
// =========================================================

window.toggleTutorial = function() {
    const overlay = document.getElementById('tutorial-overlay');
    if (!overlay) {
        console.error("Erro: Overlay do tutorial não encontrado no HTML!");
        return;
    }

    // Usa getComputedStyle para garantir que lê o estado real do CSS
    const currentDisplay = window.getComputedStyle(overlay).display;

    if (currentDisplay === 'none') {
        overlay.style.display = 'flex';
    } else {
        overlay.style.display = 'none';
    }
};

window.fecharTutorial = function(e) {
    // Fecha se clicar no overlay (fundo escuro) ou no botão de fechar
    const overlay = document.getElementById('tutorial-overlay');
    
    // Se o evento vier do botão X ou do fundo escuro
    if (e.target.id === 'tutorial-overlay' || e.target.classList.contains('close-tutorial-btn')) {
        overlay.style.display = 'none';
    }
};