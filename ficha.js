// =========================================================
// FICHA DIGITAL - PRANCHETA REALTIME (Versão Final)
// =========================================================

// Configuração exata baseada nos seus arquivos
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

let ferramentaAtual = 'texto'; // 'texto' ou 'marcador'
let paginaFichaAtual = 0;
let classeFichaAtual = '';
let elementosFicha = {}; // Cache local

// --- ABRIR E FECHAR ---

window.abrirFichaPersonagem = function() {
    const classe = localStorage.getItem('profissaoSelecionada');
    
    if (!classe || !FICHAS_IMAGENS[classe]) {
        alert("⚠️ Selecione uma classe primeiro para abrir a ficha.");
        return;
    }

    classeFichaAtual = classe;
    paginaFichaAtual = 0;
    
    document.getElementById('sheet-modal').style.display = 'flex';
    atualizarImagemFicha();
    selecionarFerramenta('texto');
    
    // Inicia conexão com Firebase para carregar dados
    carregarElementosDoFirebase();
};

window.fecharFicha = function() {
    document.getElementById('sheet-modal').style.display = 'none';
};

// --- NAVEGAÇÃO ---

window.mudarPaginaFicha = function(dir) {
    const total = FICHAS_IMAGENS[classeFichaAtual].length;
    paginaFichaAtual += dir;
    
    if(paginaFichaAtual < 0) paginaFichaAtual = 0;
    if(paginaFichaAtual >= total) paginaFichaAtual = total - 1;
    
    atualizarImagemFicha();
    renderizarElementosNaTela(); // Filtra elementos da página nova
};

function atualizarImagemFicha() {
    const img = document.getElementById('sheet-bg');
    const paginas = FICHAS_IMAGENS[classeFichaAtual];
    
    // Pequeno preload
    const temp = new Image();
    temp.src = paginas[paginaFichaAtual];
    
    img.src = paginas[paginaFichaAtual];
    document.getElementById('sheet-page-indicator').innerText = `Página ${paginaFichaAtual + 1} de ${paginas.length}`;
}

// --- FERRAMENTAS ---

window.selecionarFerramenta = function(ferramenta) {
    ferramentaAtual = ferramenta;
    
    // Atualiza visual dos botões
    const btns = document.querySelectorAll('.tool-btn');
    btns.forEach(btn => btn.classList.remove('active'));
    
    if(ferramenta === 'texto') btns[0].classList.add('active');
    if(ferramenta === 'marcador') btns[1].classList.add('active');
};

// --- INTERAÇÃO: CLICAR NA FICHA ---

window.cliqueNaFicha = function(e) {
    // Evita criar elemento se clicou em algo que já existe
    if(e.target.classList.contains('user-input') || 
       e.target.classList.contains('delete-handle') || 
       e.target.classList.contains('user-marker')) return;

    const container = document.getElementById('sheet-container');
    const rect = container.getBoundingClientRect();
    
    // Calcula % (Responsividade)
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    
    const idUnico = 'el_' + Date.now() + Math.floor(Math.random() * 1000);

    const novoElemento = {
        id: idUnico,
        tipo: ferramentaAtual,
        x: xPct,
        y: yPct,
        pagina: paginaFichaAtual,
        valor: ferramentaAtual === 'texto' ? '' : true
    };

    salvarElementoNoFirebase(novoElemento);
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
        if (snapshot.exists()) {
            elementosFicha = snapshot.val();
        } else {
            elementosFicha = {};
        }
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
    wrapper.className = 'user-input-wrapper';
    wrapper.style.left = dados.x + '%';
    wrapper.style.top = dados.y + '%';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'user-input';
    input.value = dados.valor;
    input.placeholder = "Digitar...";
    
    // Foca se for novo
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
    delBtn.onclick = () => deletarElementoNoFirebase(dados.id);

    wrapper.appendChild(input);
    wrapper.appendChild(delBtn);
    container.appendChild(wrapper);
}

function criarVisualMarcador(dados, container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'user-marker-wrapper';
    wrapper.style.left = dados.x + '%';
    wrapper.style.top = dados.y + '%';

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
    if(!confirm("Deseja limpar todas as anotações desta página?")) return;
    Object.values(elementosFicha).forEach(el => {
        if (el.pagina === paginaFichaAtual) deletarElementoNoFirebase(el.id);
    });
};