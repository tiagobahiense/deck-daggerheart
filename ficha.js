// =========================================================
// FICHA DIGITAL - PRANCHETA V4.1 (Fixed Events)
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
let eventosInicializados = false;

// Variáveis de desenho
let isDrawing = false;
let startX, startY;
let tempBox = null;

// Abertura da Ficha
window.abrirFichaPersonagem = function() {
    const prof = localStorage.getItem('profissaoSelecionada') || 'Guerreiro';
    imgFichaAtual = FICHAS_IMAGENS[prof] || FICHAS_IMAGENS['Guerreiro'];
    paginasTotais = imgFichaAtual.length;
    paginaFichaAtual = 0;

    carregarFichaDe(window.nomeJogador);
    
    const modal = document.getElementById('sheet-modal');
    modal.style.display = 'flex';
    
    atualizarPaginaFicha();
    
    // Garante que os eventos de clique funcionem agora que o modal está visível
    inicializarEventosFicha();
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
    // Botões visuais
    if(ferramenta === 'texto' || ferramenta === 'marcador') {
        const btns = document.querySelectorAll('.tool-btn');
        // Hack simples para achar o botão certo pelo title ou ordem
        for(let btn of btns) {
            if(btn.title && btn.title.toLowerCase().includes(ferramenta)) {
                btn.classList.add('active');
            }
        }
    }
};

window.mudarCorTexto = function(cor) {
    corAtual = cor;
    document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active-color'));
    event.currentTarget.classList.add('active-color');
};

// --- INICIALIZAÇÃO SEGURA DOS EVENTOS ---
function inicializarEventosFicha() {
    const container = document.getElementById('sheet-container');
    if (!container) return; // Se ainda não carregou, sai

    // Remove listeners antigos para evitar duplicação (hack simples: substituir o elemento por ele mesmo limpa eventos inline, mas listeners addEventListener precisam de cuidado. Aqui usamos onmousedown direto, então basta sobrescrever)
    
    container.onmousedown = (e) => {
        // Se clicar no guia, ignora
        if(e.target.closest('#tutorial-overlay')) return;
        
        // Se clicar em input existente, ignora
        if(e.target.classList.contains('input-wrapper') || e.target.classList.contains('drag-overlay') || e.target.tagName === 'TEXTAREA') return;

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

        const widthPct = (Math.abs(endX - startX) / rect.width) * 100;
        const heightPct = (Math.abs(endY - startY) / rect.height) * 100;
        const leftPct = (Math.min(startX, endX) / rect.width) * 100;
        const topPct = (Math.min(startY, endY) / rect.height) * 100;

        if (ferramentaAtual === 'texto') {
            if (tempBox) tempBox.remove();
            if (widthPct > 1 && heightPct > 1) { // Mínimo de tamanho para evitar cliques acidentais
                criarNovoElemento('texto', { top: topPct, left: leftPct, width: widthPct, height: heightPct });
            }
        } else if (ferramentaAtual === 'marcador') {
            // Marcador é criado no clique (mousedown+mouseup no mesmo lugar ou perto)
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
    if(!layer) return;
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
            
            input.onblur = () => {
                wrapper.classList.remove('is-editing');
                if (input.value !== el.valor) {
                    el.valor = input.value;
                    salvarElementoNoFirebase(el);
                }
            };

            wrapper.appendChild(input);

            const overlay = document.createElement('div');
            overlay.className = 'drag-overlay';
            wrapper.appendChild(overlay);

            overlay.ondblclick = () => {
                wrapper.classList.add('is-editing');
                input.focus();
            };

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
// LÓGICA DO TUTORIAL (GLOBAL)
// =========================================================

window.toggleTutorial = function() {
    const overlay = document.getElementById('tutorial-overlay');
    if (!overlay) {
        console.error("Overlay do tutorial não encontrado!");
        return;
    }

    const currentDisplay = window.getComputedStyle(overlay).display;
    if (currentDisplay === 'none') {
        overlay.style.display = 'flex';
    } else {
        overlay.style.display = 'none';
    }
};