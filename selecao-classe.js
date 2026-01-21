/**
 * SISTEMA DE SELEÇÃO DE CLASSES - Daggerheart
 * Versão Otimizada: Preload de Imagens + Transição Direta sem Reload
 */

// CONFIGURAÇÃO DAS CLASSES
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
let paginaPdfAtual = 0;
let imagensPrecarregadas = []; // Cache para evitar delay

// ================================================================
// FUNÇÃO INICIALIZADORA
// ================================================================
window.inicializarSelecaoClasse = function() {
    console.log("⚔️ Inicializando Seleção de Classe...");
    
    // 1. Esconde login e app
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'none';
    
    // 2. Mostra modal
    const modal = document.getElementById('classe-selection-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('ativo');
    }
    
    // 3. Precarrega imagens para evitar delay (A CORREÇÃO DO CARROSSEL ESTÁ AQUI)
    precarregarImagens();

    // 4. Renderiza inicial
    gerarDots();
    atualizarInterfaceClasse();

    // 5. Teclado
    document.addEventListener('keydown', controleTeclado);
};

// Função para baixar todas as imagens de perfil em cache
function precarregarImagens() {
    console.log("🔄 Precarregando imagens de perfil...");
    CLASSES.forEach(cls => {
        const img = new Image();
        img.src = cls.perfil;
        imagensPrecarregadas.push(img);
    });
}

// ================================================================
// LÓGICA DO CARROSSEL
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

    // Fade Out (Suave)
    imgPerfil.style.opacity = 0;
    lblNome.style.opacity = 0;
    
    // Troca rápida (agora segura por causa do preload)
    setTimeout(() => {
        imgPerfil.src = classe.perfil;
        lblNome.innerText = classe.nome;
        if (btnNome) btnNome.innerText = classe.nome;
        
        // Atualiza Dots
        document.querySelectorAll('.dot').forEach((d, i) => {
            if (i === indiceAtual) d.classList.add('active');
            else d.classList.remove('active');
        });
        
        // Fade In
        imgPerfil.style.opacity = 1;
        lblNome.style.opacity = 1;
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

    if (modalDetalhes && modalDetalhes.style.display === 'flex') {
        if (e.key === 'ArrowLeft') window.mudarPaginaPDF(-1);
        if (e.key === 'ArrowRight') window.mudarPaginaPDF(1);
        if (e.key === 'Escape') window.fecharDetalhesClasse();
        if (e.key === 'Enter') window.confirmarSelecaoClasseDeDentro();
        return;
    }

    if (modalSelecao && modalSelecao.style.display !== 'none') {
        if (e.key === 'ArrowLeft') window.mudarClasse(-1);
        if (e.key === 'ArrowRight') window.mudarClasse(1);
        if (e.key === 'Enter') window.verDetalhesClasse();
    }
}

// ================================================================
// LÓGICA DE DETALHES (PDF)
// ================================================================

window.verDetalhesClasse = function() {
    const classe = CLASSES[indiceAtual];
    const modalDetalhes = document.getElementById('modal-detalhes-classe');
    
    if (!modalDetalhes) return;
    
    paginaPdfAtual = 0;
    atualizarImagemPDF();
    modalDetalhes.style.display = 'flex';
};

window.mudarPaginaPDF = function(direcao) {
    const classe = CLASSES[indiceAtual];
    const totalPaginas = classe.pdf.length;
    
    paginaPdfAtual += direcao;
    
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
    imgPdf.src = classe.pdf[paginaPdfAtual];
    
    if (contador) contador.innerText = `Página ${paginaPdfAtual + 1} de ${totalPaginas}`;
    
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
// SALVAMENTO E TRANSIÇÃO DIRETA (CORREÇÃO DO LOGIN)
// ================================================================

window.confirmarSelecaoClasse = async function() {
    const classeSelecionada = CLASSES[indiceAtual];
    
    if (!confirm(`Confirmar o destino: ${classeSelecionada.nome.toUpperCase()}?`)) {
        return;
    }
    
    document.removeEventListener('keydown', controleTeclado);

    if (window.nomeJogador && window.db) {
        try {
            // 1. Salvar no Banco de Dados
            const caminho = `mesa_rpg/jogadores/${window.nomeJogador}/slots/Fundamental`;
            const dadosClasse = {
                categoria: "Classes",
                profissao: classeSelecionada.nome,
                nivel: 1,
                caminho_perfil: classeSelecionada.perfil 
            };
            
            await window.set(window.ref(window.db, caminho), dadosClasse);
            localStorage.setItem('profissaoSelecionada', classeSelecionada.nome);
            
            console.log("✅ Classe salva e confirmada. Iniciando transição...");

            // 2. TRANSIÇÃO DIRETA (Sem reload)
            
            // a) Esconde o modal de seleção
            const modal = document.getElementById('classe-selection-modal');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('ativo');
            }

            // b) Prepara a Mesa de Jogo
            const appContainer = document.getElementById('app-container');
            if (appContainer) {
                appContainer.style.display = 'flex';
                // Pequeno delay para animação de fade-in
                setTimeout(() => appContainer.style.opacity = '1', 100);
            }

            // c) Inicializa as mecânicas do jogo (importante!)
            if (window.monitorarEstadoEmTempoReal) window.monitorarEstadoEmTempoReal();
            if (window.renderizar) window.renderizar();
            
            // d) Toca a música ambiente (se disponível e não estiver tocando)
            const audio = document.getElementById('bg-music');
            if (audio && audio.paused) {
                audio.volume = 0.05;
                audio.play().catch(e => console.log("Autoplay bloqueado pelo navegador, aguardando clique."));
                const btnMusic = document.getElementById('btn-music');
                if(btnMusic) btnMusic.innerText = '🔊';
            }

            // Opcional: Feedback visual rápido
            // alert(`Bem-vindo, ${classeSelecionada.nome}!`); // Removido para não travar a fluidez

        } catch (error) {
            console.error("❌ Erro ao salvar:", error);
            alert("Erro ao salvar: " + error.message);
        }
    } else {
        alert("Erro crítico de sessão. Tente logar novamente.");
        window.location.reload(); // Só recarrega em caso de erro grave
    }
};

// Função auxiliar
window.obterProfissaoSelecionada = function() {
    return localStorage.getItem('profissaoSelecionada');
};