// Sistema de Seleção de Classe com Carrossel - Imagens do PDF

const profissaoPrincipal = {
    'Guardião': { cor: 'rgb(0, 200, 255)', rgb: [0, 200, 255] },
    'Bardo': { cor: 'rgb(200, 0, 255)', rgb: [200, 0, 255] },
    'Mago': { cor: 'rgb(100, 200, 255)', rgb: [100, 200, 255] },
    'Feiticeiro': { cor: 'rgb(150, 0, 200)', rgb: [150, 0, 200] },
    'Guerreiro': { cor: 'rgb(255, 100, 0)', rgb: [255, 100, 0] },
    'Ladino': { cor: 'rgb(100, 200, 0)', rgb: [100, 200, 0] },
    'Serafim': { cor: 'rgb(255, 215, 0)', rgb: [255, 215, 0] },
    'Druida': { cor: 'rgb(0, 255, 100)', rgb: [0, 255, 100] },
    'Patrulheiro': { cor: 'rgb(255, 200, 0)', rgb: [255, 200, 0] }
};

// Imagens do PDF de classes agrupadas por profissão
const classesImagensPorProfissao = {
    'Guardião': ['guardiao1', 'guardiao2'],
    'Bardo': ['bardo1', 'bardo2'],
    'Mago': ['mago1', 'mago2'],
    'Feiticeiro': ['feiticeiro1', 'feiticeiro2'],
    'Guerreiro': ['guerreiro1', 'guerreiro2'],
    'Ladino': ['ladino1', 'ladino2'],
    'Serafim': ['serafim1', 'serafim2'],
    'Druida': ['druida1', 'druida2', 'druida3', 'druida4', 'druida5', 'druida6'],
    'Patrulheiro': ['patrulheiro1', 'patrulheiro2', 'patrulheiro3', 'patrulheiro4']
};

// Lista de profissões em ordem
const listaProfissoes = ['Guardião', 'Bardo', 'Mago', 'Feiticeiro', 'Guerreiro', 'Ladino', 'Serafim', 'Druida', 'Patrulheiro'];

let classeSelectionState = {
    profissaoAtualSelecionada: null,
    indiceClasseAtual: 0,           // Índice da profissão atual (0-8)
    indicePaginaAtual: 0,            // Índice da página/imagem dentro da profissão
    totalClasses: 9,
    imagensAtualProfissao: [],       // Array de nomes de imagens para a profissão atual
    paginasCarregadas: {}
};

// Inicializar modal de seleção de classe
window.inicializarSelecaoClasse = function() {
    const modal = document.getElementById('classe-selection-modal');
    if (!modal) {
        console.error('Modal de seleção de classe não encontrado!');
        return;
    }

    classeSelectionState.indiceClasseAtual = 0;
    classeSelectionState.indicePaginaAtual = 0;

    // Adicionar event listeners
    document.addEventListener('keydown', window.tratarTeclasSelecaoClasse);

    // Inicializar carrossel
    window.atualizarCarrosselClasse();
    
    // Mostrar modal
    modal.classList.add('ativo');
};

// Função central de atualização do carrossel
window.atualizarCarrosselClasse = function() {
    const profissaoAtual = listaProfissoes[classeSelectionState.indiceClasseAtual];
    
    // Carregar imagens da profissão atual
    classeSelectionState.imagensAtualProfissao = classesImagensPorProfissao[profissaoAtual];
    
    // Atualizar informações
    window.atualizarInfoClasse();
    
    // Atualizar imagem
    window.atualizarImagemClasse();
    
    // Atualizar indicadores (dots)
    window.atualizarIndicadoresClasse();
};

// Atualizar informações do carrossel
window.atualizarInfoClasse = function() {
    const profissaoAtual = listaProfissoes[classeSelectionState.indiceClasseAtual];
    const totalPaginas = classeSelectionState.imagensAtualProfissao.length;
    
    const titulo = document.querySelector('.slide-info-title');
    const subtitulo = document.querySelector('.slide-info-subtitle');
    
    if (titulo) {
        titulo.textContent = profissaoAtual.toUpperCase();
    }
    
    if (subtitulo) {
        subtitulo.textContent = `${classeSelectionState.indicePaginaAtual + 1} de ${totalPaginas}`;
    }
};

// Atualizar imagem do carrossel
window.atualizarImagemClasse = function() {
    const profissaoAtual = listaProfissoes[classeSelectionState.indiceClasseAtual];
    const imagemAtual = classeSelectionState.imagensAtualProfissao[classeSelectionState.indicePaginaAtual];
    
    if (!imagemAtual) return;

    const caminhoImagem = `img/classes-pdf/${imagemAtual}.jpg`;
    const imgElement = document.querySelector('.slide-imagem-classe');
    
    if (imgElement) {
        imgElement.src = caminhoImagem;
        imgElement.alt = `${profissaoAtual} - ${imagemAtual}`;
        
        // Configurar preview overlay
        const previewOverlay = document.getElementById('preview-classe-overlay');
        const previewImg = document.getElementById('preview-classe-img');
        if (previewOverlay && previewImg) {
            previewImg.src = caminhoImagem;
            
            // Atualizar preview ao passar mouse
            imgElement.onmouseenter = () => {
                previewOverlay.style.display = 'flex';
            };
            imgElement.onmouseleave = () => {
                previewOverlay.style.display = 'none';
            };
        }
    }

    // Atualizar cor do botão de confirmação
    const btnConfirmar = document.querySelector('.btn-confirmar-classe');
    if (btnConfirmar) {
        btnConfirmar.style.backgroundColor = profissaoPrincipal[profissaoAtual].cor;
        btnConfirmar.style.color = profissaoAtual === 'Serafim' ? '#000' : '#fff';
    }
};

// Próxima página (próxima imagem da mesma profissão)
window.proximaPaginaClasse = function() {
    const totalPaginas = classeSelectionState.imagensAtualProfissao.length;
    classeSelectionState.indicePaginaAtual = (classeSelectionState.indicePaginaAtual + 1) % totalPaginas;
    window.atualizarCarrosselClasse();
};

// Página anterior (imagem anterior da mesma profissão)
window.paginaAnteriorClasse = function() {
    const totalPaginas = classeSelectionState.imagensAtualProfissao.length;
    classeSelectionState.indicePaginaAtual = (classeSelectionState.indicePaginaAtual - 1 + totalPaginas) % totalPaginas;
    window.atualizarCarrosselClasse();
};

// Próxima classe (próxima profissão)
window.proximaClasse = function() {
    classeSelectionState.indiceClasseAtual = (classeSelectionState.indiceClasseAtual + 1) % classeSelectionState.totalClasses;
    classeSelectionState.indicePaginaAtual = 0; // Resetar página ao trocar profissão
    window.atualizarCarrosselClasse();
};

// Classe anterior (profissão anterior)
window.classeAnterior = function() {
    classeSelectionState.indiceClasseAtual = (classeSelectionState.indiceClasseAtual - 1 + classeSelectionState.totalClasses) % classeSelectionState.totalClasses;
    classeSelectionState.indicePaginaAtual = 0; // Resetar página ao trocar profissão
    window.atualizarCarrosselClasse();
};

// Ir para uma classe específica
window.irParaClasse = function(indice) {
    if (indice >= 0 && indice < classeSelectionState.totalClasses) {
        classeSelectionState.indiceClasseAtual = indice;
        classeSelectionState.indicePaginaAtual = 0;
        window.atualizarCarrosselClasse();
    }
};

// Atualizar indicadores (dots)
window.atualizarIndicadoresClasse = function() {
    const container = document.querySelector('.carousel-indicators');
    if (!container) return;

    // Limpar indicadores existentes
    container.innerHTML = '';

    // Criar novo dot para cada profissão
    for (let i = 0; i < classeSelectionState.totalClasses; i++) {
        const dot = document.createElement('div');
        dot.className = 'indicator-dot';
        if (i === classeSelectionState.indiceClasseAtual) {
            dot.classList.add('ativo');
        }
        dot.addEventListener('click', () => window.irParaClasse(i));
        container.appendChild(dot);
    }
};

// Confirmar seleção de classe
window.confirmarSelecaoClasse = async function() {
    const profissaoSelecionada = listaProfissoes[classeSelectionState.indiceClasseAtual];
    
    // Salvar profissão selecionada
    classeSelectionState.profissaoAtualSelecionada = profissaoSelecionada;
    localStorage.setItem('profissaoSelecionada', profissaoSelecionada);
    
    // Salvar profissão no Firebase (no slot Fundamental se não existir)
    if (typeof window.nomeJogador !== 'undefined' && window.nomeJogador) {
        try {
            const { getDatabase, ref, get, set } = await import("https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js");
            const db = getDatabase();
            const slotRef = ref(db, `mesa_rpg/jogadores/${window.nomeJogador}/slots/Fundamental`);
            const slotSnap = await get(slotRef);
            
            if (!slotSnap.exists() || !slotSnap.val().profissao) {
                // Salvar apenas a profissão no slot Fundamental para referência
                await set(ref(db, `mesa_rpg/jogadores/${window.nomeJogador}/profissao`), profissaoSelecionada);
            }
        } catch (error) {
            console.error("Erro ao salvar profissão no Firebase:", error);
        }
    }
    
    // Fechar modal
    const modal = document.getElementById('classe-selection-modal');
    if (modal) {
        modal.classList.remove('ativo');
    }

    // Ativar profissão (effects, aura, etc)
    if (window.ativarProfissao) {
        window.ativarProfissao(profissaoSelecionada);
    }

    // Renderizar tabuleiro principal
    if (window.renderizar) {
        window.renderizar();
    }

    // Remover listener de teclado
    document.removeEventListener('keydown', window.tratarTeclasSelecaoClasse);
};

// Tratar teclas no carrossel
window.tratarTeclasSelecaoClasse = function(evento) {
    const modal = document.getElementById('classe-selection-modal');
    if (!modal || !modal.classList.contains('ativo')) {
        return;
    }

    switch(evento.key) {
        case 'ArrowLeft':
            evento.preventDefault();
            window.paginaAnteriorClasse();
            break;
        case 'ArrowRight':
            evento.preventDefault();
            window.proximaPaginaClasse();
            break;
        case 'ArrowUp':
            evento.preventDefault();
            window.classeAnterior();
            break;
        case 'ArrowDown':
            evento.preventDefault();
            window.proximaClasse();
            break;
        case 'Enter':
            evento.preventDefault();
            window.confirmarSelecaoClasse();
            break;
        case 'Escape':
            evento.preventDefault();
            if (modal) {
                modal.classList.remove('ativo');
            }
            document.removeEventListener('keydown', window.tratarTeclasSelecaoClasse);
            break;
    }
};

// Resetar seleção de classe
window.resetarSelecaoClasse = function() {
    classeSelectionState.profissaoAtualSelecionada = null;
    classeSelectionState.indiceClasseAtual = 0;
    classeSelectionState.indicePaginaAtual = 0;
    localStorage.removeItem('profissaoSelecionada');
};

// Obter profissão selecionada
window.obterProfissaoSelecionada = function() {
    return classeSelectionState.profissaoAtualSelecionada || localStorage.getItem('profissaoSelecionada');
};

// Obter cor da profissão
window.obterCorProfissao = function(profissao) {
    return profissaoPrincipal[profissao]?.cor || null;
};
