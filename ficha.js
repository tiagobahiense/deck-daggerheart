// =========================================================
// FICHA DIGITAL - SISTEMA DE PRANCHETA (REALTIME)
// =========================================================

// Configuração das Imagens (Conforme sua lista de arquivos)
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
let elementosFicha = {}; // Cache local dos dados

// --- ABRIR E FECHAR ---

window.abrirFichaPersonagem = function() {
    // 1. Descobre a classe do jogador
    const classe = localStorage.getItem('profissaoSelecionada');
    
    if (!classe || !FICHAS_IMAGENS[classe]) {
        alert("⚠️ Você precisa selecionar uma classe antes de abrir a ficha.");
        return;
    }

    classeFichaAtual = classe;
    paginaFichaAtual = 0;
    
    // 2. Abre o modal e carrega a imagem
    document.getElementById('sheet-modal').style.display = 'flex';
    atualizarImagemFicha();
    
    // 3. Seleciona ferramenta padrão
    selecionarFerramenta('texto');
    
    // 4. Inicia escuta do Firebase (Carrega dados salvos)
    carregarElementosDoFirebase();
};

window.fecharFicha = function() {
    document.getElementById('sheet-modal').style.display = 'none';
};

// --- NAVEGAÇÃO DE PÁGINAS ---

window.mudarPaginaFicha = function(dir) {
    const total = FICHAS_IMAGENS[classeFichaAtual].length;
    paginaFichaAtual += dir;
    
    // Loop ou trava nas pontas (optei por travar)
    if(paginaFichaAtual < 0) paginaFichaAtual = 0;
    if(paginaFichaAtual >= total) paginaFichaAtual = total - 1;
    
    atualizarImagemFicha();
    renderizarElementosNaTela(); // Redesenha apenas os elementos desta página
};

function atualizarImagemFicha() {
    const img = document.getElementById('sheet-bg');
    const paginas = FICHAS_IMAGENS[classeFichaAtual];
    
    // Preload básico para evitar piscar
    const tempImg = new Image();
    tempImg.src = paginas[paginaFichaAtual];
    tempImg.onload = () => {
        img.src = paginas[paginaFichaAtual];
    };
    
    document.getElementById('sheet-page-indicator').innerText = `Página ${paginaFichaAtual + 1} de ${paginas.length}`;
}

// --- BARRA DE FERRAMENTAS ---

window.selecionarFerramenta = function(ferramenta) {
    ferramentaAtual = ferramenta;
    
    // Atualiza visual dos botões (classe .active)
    const btns = document.querySelectorAll('.tool-btn');
    btns.forEach(btn => btn.classList.remove('active'));
    
    if(ferramenta === 'texto') btns[0].classList.add('active');
    if(ferramenta === 'marcador') btns[1].classList.add('active');
};

// --- INTERAÇÃO: CRIAR ELEMENTOS (CLIQUE) ---

window.cliqueNaFicha = function(e) {
    // Se clicou num input ou marcador existente, não cria outro por cima
    if(e.target.classList.contains('user-input') || 
       e.target.classList.contains('delete-handle') || 
       e.target.classList.contains('user-marker')) return;

    const container = document.getElementById('sheet-container');
    const rect = container.getBoundingClientRect();
    
    // Calcula posição relativa em % (Crucial para responsividade!)
    // Se a tela mudar de tamanho, o input continua no lugar certo.
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

    // Salva imediatamente no Firebase (o listener vai desenhar na tela)
    salvarElementoNoFirebase(novoElemento);
};

// --- FIREBASE: SALVAR E CARREGAR ---

function salvarElementoNoFirebase(elemento) {
    // Usa as globais window.nomeJogador e window.db do script.js
    if (!window.nomeJogador || !window.db) {
        console.error("Erro: Jogador não identificado ou DB desconectado.");
        return;
    }
    
    // Caminho: mesa_rpg/jogadores/NOME/ficha/ID
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
    
    // Ouve mudanças em tempo real (qualquer alteração no banco reflete aqui)
    window.onValue(window.ref(window.db, refPath), (snapshot) => {
        if (snapshot.exists()) {
            elementosFicha = snapshot.val();
        } else {
            elementosFicha = {};
        }
        renderizarElementosNaTela();
    });
}

// --- RENDERIZAÇÃO (DESENHAR NA TELA) ---

function renderizarElementosNaTela() {
    const layer = document.getElementById('sheet-inputs-layer');
    layer.innerHTML = ''; // Limpa tela para redesenhar

    Object.values(elementosFicha).forEach(el => {
        // Só desenha se o elemento pertencer à página atual
        if (el.pagina !== paginaFichaAtual) return;

        if (el.tipo === 'texto') {
            criarVisualTexto(el, layer);
        } else if (el.tipo === 'marcador') {
            criarVisualMarcador(el, layer);
        }
    });
}

function criarVisualTexto(dados, container) {
    const wrapper = document.createElement('div');
    wrapper.className = 'user-input-wrapper';
    wrapper.style.position = 'absolute';
    wrapper.style.left = dados.x + '%';
    wrapper.style.top = dados.y + '%';

    // Campo de texto
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'user-input';
    input.value = dados.valor;
    input.placeholder = "Digitar...";
    
    // Foca automaticamente se acabou de criar (estiver vazio)
    if(dados.valor === '') {
        setTimeout(() => input.focus(), 50);
    }
    
    // Salva ao digitar (Debounce para não sobrecarregar o banco)
    let timeout;
    input.oninput = (e) => {
        // Atualiza cache local visualmente
        dados.valor = e.target.value;
        
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            salvarElementoNoFirebase(dados);
        }, 500); // Salva 0.5s depois de parar de digitar
    };

    // Botão X para deletar
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
    wrapper.style.position = 'absolute';
    wrapper.style.left = dados.x + '%';
    wrapper.style.top = dados.y + '%';

    // Bolinha preta
    const marker = document.createElement('div');
    marker.className = 'user-marker';
    
    // Botão X para deletar
    const delBtn = document.createElement('div');
    delBtn.className = 'delete-handle';
    delBtn.innerText = 'x';
    delBtn.style.top = '-15px'; // Um pouco acima da bolinha
    delBtn.onclick = (e) => {
        e.stopPropagation(); // Não clica na ficha
        deletarElementoNoFirebase(dados.id);
    };

    wrapper.appendChild(marker);
    wrapper.appendChild(delBtn);
    container.appendChild(wrapper);
}

// Limpar tudo da página atual
window.limparPaginaAtual = function() {
    if(!confirm("Tem certeza que deseja apagar TUDO desta página?")) return;
    
    Object.values(elementosFicha).forEach(el => {
        if (el.pagina === paginaFichaAtual) {
            deletarElementoNoFirebase(el.id);
        }
    });
};