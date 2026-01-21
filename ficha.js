// =========================================================
// FICHA DIGITAL - PRANCHETA REALTIME (Versão Final Completa)
// =========================================================

// Configuração exata baseada nos seus arquivos de imagem
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

// Variáveis de Estado
let ferramentaAtual = 'texto'; // Pode ser 'texto' ou 'marcador'
let paginaFichaAtual = 0;
let classeFichaAtual = '';
let elementosFicha = {}; // Cache local dos elementos carregados do Firebase

// =========================================================
// FUNÇÕES DE ABERTURA E FECHAMENTO
// =========================================================

window.abrirFichaPersonagem = function() {
    // 1. Tenta pegar a classe do LocalStorage
    const classe = localStorage.getItem('profissaoSelecionada');
    
    // Validação: Se não tiver classe selecionada ou imagem configurada
    if (!classe || !FICHAS_IMAGENS[classe]) {
        alert("⚠️ Você precisa selecionar uma classe válida antes de abrir a ficha.");
        return;
    }

    // 2. Configura o estado inicial
    classeFichaAtual = classe;
    paginaFichaAtual = 0;
    
    // 3. Exibe o modal
    const modal = document.getElementById('sheet-modal');
    if (modal) {
        modal.style.display = 'flex';
    } else {
        console.error("Erro: Modal de ficha não encontrado no HTML.");
        return;
    }

    // 4. Carrega a imagem da primeira página
    atualizarImagemFicha();
    
    // 5. Define a ferramenta padrão como Texto
    selecionarFerramenta('texto');
    
    // 6. Inicia a conexão com o Firebase para baixar as anotações salvas
    carregarElementosDoFirebase();
};

window.fecharFicha = function() {
    const modal = document.getElementById('sheet-modal');
    if (modal) {
        modal.style.display = 'none';
    }
};

// =========================================================
// NAVEGAÇÃO ENTRE PÁGINAS
// =========================================================

window.mudarPaginaFicha = function(dir) {
    const totalPaginas = FICHAS_IMAGENS[classeFichaAtual].length;
    paginaFichaAtual += dir;
    
    // Impede que o índice saia dos limites (0 até total-1)
    if(paginaFichaAtual < 0) paginaFichaAtual = 0;
    if(paginaFichaAtual >= totalPaginas) paginaFichaAtual = totalPaginas - 1;
    
    // Atualiza a imagem de fundo
    atualizarImagemFicha();
    
    // Redesenha os elementos (apenas os da nova página aparecerão)
    renderizarElementosNaTela();
};

function atualizarImagemFicha() {
    const img = document.getElementById('sheet-bg');
    const indicador = document.getElementById('sheet-page-indicator');
    const paginas = FICHAS_IMAGENS[classeFichaAtual];
    
    if (!img) return;

    // Técnica de Preload para evitar "piscar" branco
    const tempImg = new Image();
    tempImg.src = paginas[paginaFichaAtual];
    tempImg.onload = () => {
        img.src = paginas[paginaFichaAtual];
    };
    
    // Atualiza o texto do rodapé (Ex: Página 1 de 2)
    if (indicador) {
        indicador.innerText = `Página ${paginaFichaAtual + 1} de ${paginas.length}`;
    }
}

// =========================================================
// BARRA DE FERRAMENTAS
// =========================================================

window.selecionarFerramenta = function(ferramenta) {
    ferramentaAtual = ferramenta;
    
    // Atualiza o visual dos botões (adiciona/remove classe .active)
    const btns = document.querySelectorAll('.tool-btn');
    btns.forEach(btn => btn.classList.remove('active'));
    
    // Ativa o botão correspondente
    if(ferramenta === 'texto') {
        // Assume que o primeiro botão é o de texto
        if(btns[0]) btns[0].classList.add('active');
    }
    if(ferramenta === 'marcador') {
        // Assume que o segundo botão é o de marcador
        if(btns[1]) btns[1].classList.add('active');
    }
};

// =========================================================
// INTERAÇÃO: CLIQUE NA FICHA (CRIAR ELEMENTOS)
// =========================================================

window.cliqueNaFicha = function(e) {
    // IMPORTANTE: Se o clique foi em um elemento já existente (input, marcador ou botão de deletar),
    // não faz nada. Isso evita criar um input em cima de outro.
    if(e.target.classList.contains('user-input') || 
       e.target.classList.contains('delete-handle') || 
       e.target.classList.contains('user-marker')) {
        return;
    }

    const container = document.getElementById('sheet-container');
    const rect = container.getBoundingClientRect();
    
    // Calcula a posição do clique relativa à imagem, em PORCENTAGEM.
    // Isso garante que os inputs fiquem no lugar certo mesmo se a janela for redimensionada.
    const xPct = ((e.clientX - rect.left) / rect.width) * 100;
    const yPct = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Gera um ID único para o novo elemento
    const idUnico = 'el_' + Date.now() + Math.floor(Math.random() * 1000);

    // Cria o objeto de dados do novo elemento
    const novoElemento = {
        id: idUnico,
        tipo: ferramentaAtual, // 'texto' ou 'marcador'
        x: xPct,
        y: yPct,
        pagina: paginaFichaAtual, // Salva em qual página foi criado
        valor: ferramentaAtual === 'texto' ? '' : true // Se for texto começa vazio, se for marcador é true
    };

    // Salva no Firebase. O "listener" (onValue) vai detectar essa mudança e desenhar na tela automaticamente.
    salvarElementoNoFirebase(novoElemento);
};

// =========================================================
// CONEXÃO COM FIREBASE (SALVAR/CARREGAR/DELETAR)
// =========================================================

function salvarElementoNoFirebase(elemento) {
    // Verifica se as variáveis globais do script.js estão disponíveis
    if (!window.nomeJogador || !window.db || !window.set || !window.ref) {
        console.error("Erro Crítico: Conexão com Firebase não estabelecida ou Jogador não identificado.");
        return;
    }
    
    // Define o caminho no banco de dados: mesa_rpg/jogadores/NOME/ficha/ID
    const refPath = `mesa_rpg/jogadores/${window.nomeJogador}/ficha/${elemento.id}`;
    
    // Salva os dados
    window.set(window.ref(window.db, refPath), elemento)
        .catch(error => console.error("Erro ao salvar elemento na ficha:", error));
}

function deletarElementoNoFirebase(id) {
    if (!window.nomeJogador || !window.db || !window.remove || !window.ref) {
        console.error("Erro ao tentar deletar: Dependências do Firebase ausentes.");
        return;
    }

    const refPath = `mesa_rpg/jogadores/${window.nomeJogador}/ficha/${id}`;
    
    // Remove o nó do banco de dados
    window.remove(window.ref(window.db, refPath))
        .catch(error => console.error("Erro ao deletar elemento:", error));
}

function carregarElementosDoFirebase() {
    if (!window.nomeJogador || !window.db || !window.onValue || !window.ref) {
        console.error("Erro ao tentar carregar: Dependências do Firebase ausentes.");
        return;
    }

    const refPath = `mesa_rpg/jogadores/${window.nomeJogador}/ficha`;
    
    // Conecta um "escutador" (listener) em tempo real.
    // Sempre que algo mudar nesse caminho (adicionar, remover, editar), essa função roda.
    window.onValue(window.ref(window.db, refPath), (snapshot) => {
        if (snapshot.exists()) {
            // Se existirem dados, atualiza o cache local
            elementosFicha = snapshot.val();
        } else {
            // Se não, limpa o cache
            elementosFicha = {};
        }
        // Redesenha a tela com os dados novos
        renderizarElementosNaTela();
    });
}

// =========================================================
// RENDERIZAÇÃO (DESENHAR NA TELA)
// =========================================================

function renderizarElementosNaTela() {
    const layer = document.getElementById('sheet-inputs-layer');
    if (!layer) return;

    // Limpa a camada de inputs para evitar duplicatas
    layer.innerHTML = '';

    // Percorre todos os elementos carregados
    Object.values(elementosFicha).forEach(el => {
        // FILTRO: Só desenha se o elemento pertencer à página que o usuário está vendo agora
        if (el.pagina !== paginaFichaAtual) return;

        // Chama a função de desenho apropriada
        if (el.tipo === 'texto') {
            criarVisualTexto(el, layer);
        } else if (el.tipo === 'marcador') {
            criarVisualMarcador(el, layer);
        }
    });
}

function criarVisualTexto(dados, container) {
    // Cria o container do input
    const wrapper = document.createElement('div');
    wrapper.className = 'user-input-wrapper';
    wrapper.style.position = 'absolute';
    wrapper.style.left = dados.x + '%';
    wrapper.style.top = dados.y + '%';

    // Cria o campo de input
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'user-input';
    input.value = dados.valor; // Preenche com o texto salvo
    input.placeholder = "Digitar...";
    
    // UX: Se o texto for vazio (novo), foca automaticamente para o usuário digitar
    if(dados.valor === '') {
        setTimeout(() => input.focus(), 50);
    }
    
    // Lógica de Salvamento Automático (Debounce)
    // Espera o usuário parar de digitar por 500ms antes de enviar ao banco
    let timeout;
    input.oninput = (e) => {
        // Atualiza o valor localmente para feedback instantâneo
        dados.valor = e.target.value;
        
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            salvarElementoNoFirebase(dados);
        }, 500);
    };

    // Cria o botão de deletar (o "X" vermelho que aparece no hover)
    const delBtn = document.createElement('div');
    delBtn.className = 'delete-handle';
    delBtn.innerText = 'x';
    delBtn.onclick = () => deletarElementoNoFirebase(dados.id);

    // Monta a estrutura
    wrapper.appendChild(input);
    wrapper.appendChild(delBtn);
    container.appendChild(wrapper);
}

function criarVisualMarcador(dados, container) {
    // Cria o container do marcador
    const wrapper = document.createElement('div');
    wrapper.className = 'user-marker-wrapper';
    wrapper.style.position = 'absolute';
    wrapper.style.left = dados.x + '%';
    wrapper.style.top = dados.y + '%';

    // Cria a "bolinha" visual
    const marker = document.createElement('div');
    marker.className = 'user-marker';
    
    // Cria o botão de deletar
    const delBtn = document.createElement('div');
    delBtn.className = 'delete-handle';
    delBtn.innerText = 'x';
    delBtn.style.top = '-15px'; // Ajuste fino para ficar acima da bolinha
    
    delBtn.onclick = (e) => {
        e.stopPropagation(); // Impede que o clique atravesse e crie outro marcador
        deletarElementoNoFirebase(dados.id);
    };

    // Monta a estrutura
    wrapper.appendChild(marker);
    wrapper.appendChild(delBtn);
    container.appendChild(wrapper);
}

// =========================================================
// FUNÇÕES AUXILIARES
// =========================================================

// Botão "Lixeira": Apaga tudo da página atual
window.limparPaginaAtual = function() {
    if(!confirm("Tem certeza que deseja apagar TODAS as anotações desta página? Esta ação não pode ser desfeita.")) return;
    
    Object.values(elementosFicha).forEach(el => {
        if (el.pagina === paginaFichaAtual) {
            deletarElementoNoFirebase(el.id);
        }
    });
};