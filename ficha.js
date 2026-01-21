// =========================================================
// FICHA DIGITAL - PRANCHETA REALTIME (Drag & Drop v1.5)
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

// Variáveis para lógica de Arrastar (Drag)
let isDragging = false;
let startX = 0, startY = 0;
let tempBox = null;

// --- ABRIR / FECHAR ---
window.abrirFichaPersonagem = function() {
    const classe = localStorage.getItem('profissaoSelecionada');
    if (!classe || !FICHAS_IMAGENS[classe]) { alert("Selecione uma classe válida primeiro."); return; }

    classeFichaAtual = classe;
    paginaFichaAtual = 0;
    
    document.getElementById('sheet-modal').style.display = 'flex';
    atualizarImagemFicha();
    selecionarFerramenta('texto');
    carregarElementosDoFirebase();
    
    // Ativa listeners de desenho
    configurarEventosMouse();
};

window.fecharFicha = function() { document.getElementById('sheet-modal').style.display = 'none'; };

// --- NAVEGAÇÃO ---
window.mudarPaginaFicha = function(dir) {
    const total = FICHAS_IMAGENS[classeFichaAtual].length;
    paginaFichaAtual += dir;
    if(paginaFichaAtual < 0) paginaFichaAtual = 0;
    if(paginaFichaAtual >= total) paginaFichaAtual = total - 1;
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

// --- LÓGICA DE CLIQUE E ARRASTE (DRAG TO CREATE) ---

function configurarEventosMouse() {
    const container = document.getElementById('sheet-container');
    
    // Remove listeners antigos para não duplicar
    container.onmousedown = null;
    container.onmousemove = null;
    container.onmouseup = null;

    container.onmousedown = (e) => {
        // Ignora se clicar em elemento existente
        if(e.target.closest('.element-wrapper')) return;

        const rect = container.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;

        if (ferramentaAtual === 'texto') {
            isDragging = true;
            // Cria caixa visual temporária
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
        if (!isDragging || ferramentaAtual !== 'texto' || !tempBox) return;
        
        const rect = container.getBoundingClientRect();
        const currentX = e.clientX - rect.left;
        const currentY = e.clientY - rect.top;
        
        const width = currentX - startX;
        const height = currentY - startY;
        
        // Permite arrastar para qualquer direção
        tempBox.style.width = Math.abs(width) + 'px';
        tempBox.style.height = Math.abs(height) + 'px';
        tempBox.style.left = (width < 0 ? currentX : startX) + 'px';
        tempBox.style.top = (height < 0 ? currentY : startY) + 'px';
    };

    container.onmouseup = (e) => {
        const rect = container.getBoundingClientRect();
        
        // --- CRIAÇÃO DE MARCADOR (Clique Simples) ---
        if (ferramentaAtual === 'marcador') {
            // Se clicou em elemento existente, já foi tratado no onmousedown
            if(e.target.closest('.element-wrapper')) return;

            const xPct = ((e.clientX - rect.left) / rect.width) * 100;
            const yPct = ((e.clientY - rect.top) / rect.height) * 100;
            
            criarElementoFinal(xPct, yPct, 0, 0, 'marcador');
            return;
        }

        // --- CRIAÇÃO DE TEXTO (Arrastar) ---
        if (ferramentaAtual === 'texto' && isDragging) {
            isDragging = false;
            
            // Pega dimensões finais da caixa temporária
            const finalLeft = parseFloat(tempBox.style.left);
            const finalTop = parseFloat(tempBox.style.top);
            const finalWidth = parseFloat(tempBox.style.width);
            const finalHeight = parseFloat(tempBox.style.height);
            
            // Remove visual temporário
            if(tempBox) tempBox.remove();
            tempBox = null;

            // Se for muito pequeno, ignora (foi só um clique acidental)
            if (finalWidth < 10 || finalHeight < 10) return;

            // Converte para Porcentagem (Responsividade)
            const xPct = (finalLeft / rect.width) * 100;
            const yPct = (finalTop / rect.height) * 100;
            const wPct = (finalWidth / rect.width) * 100;
            const hPct = (finalHeight / rect.height) * 100;

            criarElementoFinal(xPct, yPct, wPct, hPct, 'texto');
        }
    };
}

function criarElementoFinal(x, y, w, h, tipo) {
    const idUnico = 'el_' + Date.now() + Math.floor(Math.random() * 1000);
    const novoElemento = {
        id: idUnico,
        tipo: tipo,
        x: x, y: y, 
        w: w, h: h, // Largura e Altura (usado apenas no texto)
        pagina: paginaFichaAtual,
        valor: tipo === 'texto' ? '' : true
    };
    salvarElementoNoFirebase(novoElemento);
}

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
        if (el.tipo === 'texto') criarVisualTexto(el, layer);
        else if (el.tipo === 'marcador') criarVisualMarcador(el, layer);
    });
}

function criarVisualTexto(dados, container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'element-wrapper';
    wrapper.style.left = dados.x + '%';
    wrapper.style.top = dados.y + '%';
    wrapper.style.width = dados.w + '%';
    wrapper.style.height = dados.h + '%';

    // Usamos Textarea para permitir quebra de linha
    const input = document.createElement('textarea');
    input.className = 'user-textarea';
    input.value = dados.valor;
    input.placeholder = " Digite...";
    
    // Auto-foco se for novo (vazio)
    if(dados.valor === '') setTimeout(() => input.focus(), 50);
    
    let timeout;
    input.oninput = (e) => {
        dados.valor = e.target.value;
        clearTimeout(timeout);
        timeout = setTimeout(() => salvarElementoNoFirebase(dados), 500);
    };

    const delBtn = document.createElement('div');
    delBtn.className = 'delete-handle';
    delBtn.innerText = 'x';
    delBtn.onclick = (e) => {
        e.stopPropagation(); // Evita desenhar outro em cima
        deletarElementoNoFirebase(dados.id);
    };

    wrapper.appendChild(input);
    wrapper.appendChild(delBtn);
    container.appendChild(wrapper);
}

function criarVisualMarcador(dados, container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'element-wrapper';
    wrapper.style.left = dados.x + '%';
    wrapper.style.top = dados.y + '%';
    // Wrapper pequeno para marcadores
    wrapper.style.width = '2vh'; 
    wrapper.style.height = '2vh';
    wrapper.style.transform = 'translate(-50%, -50%)'; // Centraliza no ponto do clique

    const marker = document.createElement('div');
    marker.className = 'user-marker';
    
    const delBtn = document.createElement('div');
    delBtn.className = 'delete-handle';
    delBtn.innerText = 'x';
    delBtn.onclick = (e) => {
        e.stopPropagation();
        deletarElementoNoFirebase(dados.id);
    };

    wrapper.appendChild(marker);
    wrapper.appendChild(delBtn);
    container.appendChild(wrapper);
}

window.limparPaginaAtual = function() {
    if(!confirm("Limpar esta página inteira?")) return;
    Object.values(elementosFicha).forEach(el => {
        if (el.pagina === paginaFichaAtual) deletarElementoNoFirebase(el.id);
    });
};