// Sistema de Seleção de Classe com Carrossel

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

// Mapeamento de profissão para nomes das cartas
const profissaoParaCartas = {
    'Guardião': ['Baluarte', 'Sentinela Alada'],
    'Bardo': ['Beletrista', 'Trovador'],
    'Mago': ['Discípulo da Guerra', 'Discípulo do conhecimento'],
    'Feiticeiro': 'Elementalista',
    'Guerreiro': ['Escolhido da bravura', 'Escolhido da Matança', 'VinGador'],
    'Ladino': ['Gatuno', 'Mafioso'],
    'Serafim': ['Portador Divino', 'Treinador'],
    'Druida': ['Primordialista', 'Protetor da Renovação', 'Protetor dos elementos'],
    'Patrulheiro': 'rastreador'
};

// Tipos de cartas a exibir
const tiposCartas = ['Fundamental', 'Especialização', 'Maestria'];

let classeSelectionState = {
    profissaoAtualSelecionada: null,
    indiceClasseAtual: 0,
    indicePaginaAtual: 0,
    totalClasses: 9,
    cartasAtualProfissao: [],
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

    // Abrir modal
    modal.classList.add('ativo');
    
    // Mostrar primeira classe
    window.atualizarCarrosselClasse();
};

// Atualizar display do carrossel com a classe atual
window.atualizarCarrosselClasse = function() {
    const nomesProfissoes = Object.keys(profissaoPrincipal);
    const profissaoAtual = nomesProfissoes[classeSelectionState.indiceClasseAtual];
    
    // Carregar cartas da profissão atual
    carregarCartasProfissao(profissaoAtual);
    
    // Atualizar info
    const info = document.querySelector('.slide-info-title');
    const subtitle = document.querySelector('.slide-info-subtitle');
    if (info) info.textContent = profissaoAtual.toUpperCase();
    if (subtitle) subtitle.textContent = `${classeSelectionState.indicePaginaAtual + 1} de ${classeSelectionState.cartasAtualProfissao.length}`;
    
    // Atualizar imagem e botão
    window.atualizarImagemClasse();
    
    // Atualizar indicadores de classe
    window.atualizarIndicadoresClasse();
};

// Carregar cartas da profissão (Fundamental, Especialização, Maestria)
function carregarCartasProfissao(profissao) {
    classeSelectionState.cartasAtualProfissao = [];
    
    const nomesCartas = profissaoParaCartas[profissao];
    const listaCartas = Array.isArray(nomesCartas) ? nomesCartas : [nomesCartas];
    
    // Para cada nome de carta, adicionar os 3 tipos
    listaCartas.forEach(nomeCarta => {
        tiposCartas.forEach(tipo => {
            classeSelectionState.cartasAtualProfissao.push({
                nome: `${tipo} - ${nomeCarta}`,
                tipo: tipo,
                profissao: profissao
            });
        });
    });

    // Se só tem um nome de carta, mostra as 3 em sequência
    // Se tem múltiplos, agrupa e mostra lado a lado
    
    console.log(`Cartas para ${profissao}:`, classeSelectionState.cartasAtualProfissao);
}

// Atualizar imagem da carta atual
window.atualizarImagemClasse = function() {
    const cartaAtual = classeSelectionState.cartasAtualProfissao[classeSelectionState.indicePaginaAtual];
    if (!cartaAtual) return;

    const caminhoImagem = `img/cartas/Classes/${cartaAtual.nome}.jpg`;
    const imgElement = document.querySelector('.slide-imagem-classe');
    
    if (imgElement) {
        imgElement.src = caminhoImagem;
        imgElement.alt = cartaAtual.nome;
    }

    // Atualizar cor do botão
    const btnConfirmar = document.querySelector('.btn-confirmar-classe');
    if (btnConfirmar) {
        const profissao = classeSelectionState.cartasAtualProfissao[classeSelectionState.indicePaginaAtual].profissao;
        btnConfirmar.style.backgroundColor = profissaoPrincipal[profissao].cor;
        btnConfirmar.style.color = profissao === 'Serafim' ? '#000' : '#fff';
    }
};

// Próxima página da profissão atual
window.proximaPaginaClasse = function() {
    const maxPaginas = classeSelectionState.cartasAtualProfissao.length;
    classeSelectionState.indicePaginaAtual = (classeSelectionState.indicePaginaAtual + 1) % maxPaginas;
    window.atualizarImagemClasse();
    window.atualizarSubtitulo();
};

// Página anterior da profissão atual
window.paginaAnteriorClasse = function() {
    const maxPaginas = classeSelectionState.cartasAtualProfissao.length;
    classeSelectionState.indicePaginaAtual = (classeSelectionState.indicePaginaAtual - 1 + maxPaginas) % maxPaginas;
    window.atualizarImagemClasse();
    window.atualizarSubtitulo();
};

// Atualizar subtitle
window.atualizarSubtitulo = function() {
    const subtitle = document.querySelector('.slide-info-subtitle');
    if (subtitle) subtitle.textContent = `${classeSelectionState.indicePaginaAtual + 1} de ${classeSelectionState.cartasAtualProfissao.length}`;
};

// Próxima classe
window.proximaClasse = function() {
    classeSelectionState.indiceClasseAtual = (classeSelectionState.indiceClasseAtual + 1) % classeSelectionState.totalClasses;
    classeSelectionState.indicePaginaAtual = 0;
    window.atualizarCarrosselClasse();
};

// Classe anterior
window.classeAnterior = function() {
    classeSelectionState.indiceClasseAtual = (classeSelectionState.indiceClasseAtual - 1 + classeSelectionState.totalClasses) % classeSelectionState.totalClasses;
    classeSelectionState.indicePaginaAtual = 0;
    window.atualizarCarrosselClasse();
};

// Ir para classe específica
window.irParaClasse = function(indice) {
    classeSelectionState.indiceClasseAtual = indice;
    classeSelectionState.indicePaginaAtual = 0;
    window.atualizarCarrosselClasse();
};

// Atualizar indicadores (dots) de classe
window.atualizarIndicadoresClasse = function() {
    const indicadoresContainer = document.querySelector('.carousel-indicators');
    if (!indicadoresContainer) return;

    indicadoresContainer.innerHTML = '';
    for (let i = 0; i < classeSelectionState.totalClasses; i++) {
        const dot = document.createElement('div');
        dot.className = `indicator-dot ${i === classeSelectionState.indiceClasseAtual ? 'ativo' : ''}`;
        dot.onclick = () => window.irParaClasse(i);
        indicadoresContainer.appendChild(dot);
    }
};

// Confirmar seleção de classe
window.confirmarSelecaoClasse = function() {
    const nomesProfissoes = Object.keys(profissaoPrincipal);
    const profissao = nomesProfissoes[classeSelectionState.indiceClasseAtual];
    
    console.log(`Classe confirmada: ${profissao}`);
    
    classeSelectionState.profissaoAtualSelecionada = profissao;
    
    // Salvar no localStorage
    localStorage.setItem('profissaoSelecionada', profissao);
    
    // Fechar modal
    const modal = document.getElementById('classe-selection-modal');
    if (modal) {
        modal.classList.remove('ativo');
    }

    // Ativar aura da profissão
    if (typeof window.ativarProfissao === 'function') {
        window.ativarProfissao(profissao);
    }

    // Renderizar board com profissão selecionada
    if (typeof window.renderizar === 'function') {
        window.renderizar();
    }
};

// Fechar modal de seleção
window.fecharSelecaoClasse = function() {
    const modal = document.getElementById('classe-selection-modal');
    if (modal) {
        modal.classList.remove('ativo');
    }
};

// Obter profissão selecionada
window.obterProfissaoSelecionada = function() {
    return classeSelectionState.profissaoAtualSelecionada || localStorage.getItem('profissaoSelecionada');
};

// Obter cor da profissão
window.obterCorProfissao = function(profissao) {
    return profissaoPrincipal[profissao]?.cor || null;
};

// Resetar seleção de classe (para logout)
window.resetarSelecaoClasse = function() {
    classeSelectionState.profissaoAtualSelecionada = null;
    classeSelectionState.indiceClasseAtual = 0;
    classeSelectionState.indicePaginaAtual = 0;
    localStorage.removeItem('profissaoSelecionada');
};

// Suporte a teclado (setas)
document.addEventListener('keydown', function(event) {
    const modal = document.getElementById('classe-selection-modal');
    if (!modal || !modal.classList.contains('ativo')) return;

    if (event.key === 'ArrowLeft') {
        // Esquerda = página anterior ou classe anterior
        if (classeSelectionState.indicePaginaAtual > 0) {
            window.paginaAnteriorClasse();
        } else {
            window.classeAnterior();
        }
    } else if (event.key === 'ArrowRight') {
        // Direita = próxima página ou próxima classe
        if (classeSelectionState.indicePaginaAtual < classeSelectionState.cartasAtualProfissao.length - 1) {
            window.proximaPaginaClasse();
        } else {
            window.proximaClasse();
        }
    } else if (event.key === 'ArrowUp') {
        window.classeAnterior();
    } else if (event.key === 'ArrowDown') {
        window.proximaClasse();
    } else if (event.key === 'Enter') {
        window.confirmarSelecaoClasse();
    } else if (event.key === 'Escape') {
        window.fecharSelecaoClasse();
    }
});
