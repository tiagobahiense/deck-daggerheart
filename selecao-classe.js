/**
 * SISTEMA DE SELEÇÃO DE CLASSES - Daggerheart
 * Novo Visual: Carrossel de Perfil -> Detalhes em PDF (Múltiplas Páginas)
 */

// CONFIGURAÇÃO DAS CLASSES E IMAGENS
// Baseado na estrutura de arquivos enviada
const CLASSES = [
    { 
        id: 'Bardo', 
        nome: 'Bardo', 
        perfil: 'img/classes-perfil/bardoperfil.png', 
        pdf: ['img/classes-pdf/bardo1.jpg', 'img/classes-pdf/bardo2.jpg']
    },
    { 
        id: 'Druida', 
        nome: 'Druida', 
        perfil: 'img/classes-perfil/druidaperfil.png', 
        pdf: [
            'img/classes-pdf/druida1.jpg', 'img/classes-pdf/druida2.jpg', 
            'img/classes-pdf/druida3.jpg', 'img/classes-pdf/druida4.jpg', 
            'img/classes-pdf/druida5.jpg', 'img/classes-pdf/druida6.jpg'
        ]
    },
    { 
        id: 'Feiticeiro', 
        nome: 'Feiticeiro', 
        perfil: 'img/classes-perfil/feiticeiroperfil.png', 
        pdf: ['img/classes-pdf/feiticeiro1.jpg', 'img/classes-pdf/feiticeiro2.jpg']
    },
    { 
        id: 'Guardiao', 
        nome: 'Guardião', 
        perfil: 'img/classes-perfil/guardiaoperfil.png', 
        pdf: ['img/classes-pdf/guardiao1.jpg', 'img/classes-pdf/guardiao2.jpg']
    },
    { 
        id: 'Guerreiro', 
        nome: 'Guerreiro', 
        perfil: 'img/classes-perfil/guerreiroperfil.png', 
        pdf: ['img/classes-pdf/guerreiro1.jpg', 'img/classes-pdf/guerreiro2.jpg']
    },
    { 
        id: 'Ladino', 
        nome: 'Ladino', 
        perfil: 'img/classes-perfil/ladinoperfil.png', 
        pdf: ['img/classes-pdf/ladino1.jpg', 'img/classes-pdf/ladino2.jpg']
    },
    { 
        id: 'Mago', 
        nome: 'Mago', 
        perfil: 'img/classes-perfil/magoperfil.png', 
        pdf: ['img/classes-pdf/mago1.jpg', 'img/classes-pdf/mago2.jpg']
    },
    { 
        id: 'Patrulheiro', 
        nome: 'Patrulheiro', 
        perfil: 'img/classes-perfil/patrulheiroperfil.png', 
        pdf: [
            'img/classes-pdf/patrulheiro1.jpg', 'img/classes-pdf/patrulheiro2.jpg', 
            'img/classes-pdf/patrulheiro3.jpg', 'img/classes-pdf/patrulheiro4.jpg'
        ]
    },
    { 
        id: 'Serafim', 
        nome: 'Serafim', 
        perfil: 'img/classes-perfil/serafimperfil.png', 
        pdf: ['img/classes-pdf/serafim1.jpg', 'img/classes-pdf/serafim2.jpg']
    }
];

let indiceAtual = 0;
let paginaPdfAtual = 0; // Controla qual página do PDF está sendo vista

// ================================================================
// FUNÇÃO INICIALIZADORA
// ================================================================
window.inicializarSelecaoClasse = function() {
    console.log("⚔️ Inicializando Nova Interface de Seleção de Classe...");
    
    // 1. Esconde a tela de login e app
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (appContainer) appContainer.style.display = 'none';
    
    // 2. Mostra o modal de seleção
    const modal = document.getElementById('classe-selection-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('ativo');
    }
    
    // 3. Inicializa
    gerarDots();
    atualizarInterfaceClasse();

    // 4. Teclado
    document.addEventListener('keydown', controleTeclado);
};

// ================================================================
// LÓGICA DO CARROSSEL (PERFIL)
// ================================================================

window.mudarClasse = function(direcao) {
    indiceAtual += direcao;
    
    if (indiceAtual < 0) {
        indiceAtual = CLASSES.length - 1;
    } else if (indiceAtual >= CLASSES.length) {
        indiceAtual = 0;
    }
    
    atualizarInterfaceClasse();
};

window.irParaClasse = function(index) {
    if (index >= 0 && index < CLASSES.length) {
        indiceAtual = index;
        atualizarInterfaceClasse();
    }
};

function atualizarInterfaceClasse() {
    const classe = CLASSES[indiceAtual];
    const imgPerfil = document.getElementById('img-classe-perfil');
    const lblNome = document.getElementById('nome-classe-selecao');
    const btnNome = document.getElementById('btn-nome-classe');
    
    if (!imgPerfil) return;

    imgPerfil.style.opacity = 0.5;
    
    setTimeout(() => {
        imgPerfil.src = classe.perfil;
        lblNome.innerText = classe.nome;
        if (btnNome) btnNome.innerText = classe.nome;
        
        document.querySelectorAll('.dot').forEach((d, i) => {
            if (i === indiceAtual) d.classList.add('active');
            else d.classList.remove('active');
        });
        
        imgPerfil.style.opacity = 1;
    }, 150);
}

function gerarDots() {
    const container = document.getElementById('carousel-dots');
    if (!container) return;
    container.innerHTML = '';
    
    CLASSES.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = 'dot';
        dot.onclick = () => window.irParaClasse(index);
        container.appendChild(dot);
    });
}

function controleTeclado(e) {
    const modalSelecao = document.getElementById('classe-selection-modal');
    const modalDetalhes = document.getElementById('modal-detalhes-classe');

    // Se modal de detalhes está aberto
    if (modalDetalhes && modalDetalhes.style.display === 'flex') {
        if (e.key === 'ArrowLeft') window.mudarPaginaPDF(-1);
        if (e.key === 'ArrowRight') window.mudarPaginaPDF(1);
        if (e.key === 'Escape') window.fecharDetalhesClasse();
        if (e.key === 'Enter') window.confirmarSelecaoClasseDeDentro();
        return;
    }

    // Se apenas o carrossel está aberto
    if (modalSelecao && modalSelecao.style.display !== 'none') {
        if (e.key === 'ArrowLeft') window.mudarClasse(-1);
        if (e.key === 'ArrowRight') window.mudarClasse(1);
        if (e.key === 'Enter') window.verDetalhesClasse();
    }
}

// ================================================================
// LÓGICA DE DETALHES (PDF COM MÚLTIPLAS PÁGINAS)
// ================================================================

window.verDetalhesClasse = function() {
    const classe = CLASSES[indiceAtual];
    const modalDetalhes = document.getElementById('modal-detalhes-classe');
    
    if (!modalDetalhes) return;
    
    // Reseta para a primeira página
    paginaPdfAtual = 0;
    
    console.log(`🔍 Abrindo detalhes: ${classe.nome}`);
    
    atualizarImagemPDF();
    modalDetalhes.style.display = 'flex';
};

window.mudarPaginaPDF = function(direcao) {
    const classe = CLASSES[indiceAtual];
    const totalPaginas = classe.pdf.length;
    
    paginaPdfAtual += direcao;
    
    // Limites
    if (paginaPdfAtual < 0) paginaPdfAtual = 0;
    if (paginaPdfAtual >= totalPaginas) paginaPdfAtual = totalPaginas - 1;
    
    atualizarImagemPDF();
};

function atualizarImagemPDF() {
    const classe = CLASSES[indiceAtual];
    const imgPdf = document.getElementById('img-classe-pdf');
    const contador = document.getElementById('pdf-page-counter');
    const btnPrev = document.getElementById('btn-pdf-prev');
    const btnNext = document.getElementById('btn-pdf-next');
    
    if (!imgPdf) return;

    const totalPaginas = classe.pdf.length;
    
    // Atualiza Imagem
    imgPdf.src = classe.pdf[paginaPdfAtual];
    
    // Atualiza Contador
    if (contador) {
        contador.innerText = `Página ${paginaPdfAtual + 1} de ${totalPaginas}`;
    }
    
    // Mostra/Esconde botões dependendo da página
    if (btnPrev) btnPrev.style.visibility = paginaPdfAtual === 0 ? 'hidden' : 'visible';
    if (btnNext) btnNext.style.visibility = paginaPdfAtual === totalPaginas - 1 ? 'hidden' : 'visible';
}

window.fecharDetalhesClasse = function() {
    document.getElementById('modal-detalhes-classe').style.display = 'none';
};

window.confirmarSelecaoClasseDeDentro = function() {
    window.fecharDetalhesClasse();
    window.confirmarSelecaoClasse();
};

// ================================================================
// SALVAMENTO FINAL
// ================================================================

window.confirmarSelecaoClasse = async function() {
    const classeSelecionada = CLASSES[indiceAtual];
    
    if (!confirm(`Confirmar o destino: ${classeSelecionada.nome.toUpperCase()}?`)) {
        return;
    }
    
    document.removeEventListener('keydown', controleTeclado);

    if (window.nomeJogador && window.db) {
        try {
            const caminho = `mesa_rpg/jogadores/${window.nomeJogador}/slots/Fundamental`;
            
            const dadosClasse = {
                categoria: "Classes",
                profissao: classeSelecionada.nome,
                nivel: 1,
                caminho_perfil: classeSelecionada.perfil 
            };
            
            await window.set(window.ref(window.db, caminho), dadosClasse);
            localStorage.setItem('profissaoSelecionada', classeSelecionada.nome);
            
            const modal = document.getElementById('classe-selection-modal');
            if (modal) modal.style.display = 'none';
            
            alert(`Bem-vindo, ${classeSelecionada.nome}! A página será recarregada.`);
            window.location.reload(); 
            
        } catch (error) {
            console.error("❌ Erro ao salvar:", error);
            alert("Erro ao salvar: " + error.message);
        }
    } else {
        alert("Erro de sessão. Tente logar novamente.");
        window.location.reload();
    }
};

// Função auxiliar
window.obterProfissaoSelecionada = function() {
    return localStorage.getItem('profissaoSelecionada');
};