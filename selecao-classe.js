/**
 * SISTEMA DE SELEÇÃO DE CLASSES - Daggerheart
 * Correções: 
 * 1. Preload de imagens (sem delay na troca)
 * 2. Transição direta para a mesa (sem reload/login)
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
// Array para guardar as imagens pré-carregadas na memória
let imagensPrecarregadas = []; 

// ================================================================
// FUNÇÃO INICIALIZADORA
// ================================================================
window.inicializarSelecaoClasse = function() {
    console.log("⚔️ Inicializando Seleção de Classe...");
    
    // 1. Esconde telas anteriores
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (appContainer) appContainer.style.display = 'none';
    
    // 2. Mostra modal de seleção
    const modal = document.getElementById('classe-selection-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('ativo');
    }
    
    // 3. PRELOAD: Carrega todas as imagens de perfil agora
    precarregarImagens();

    // 4. Renderiza a primeira classe
    gerarDots();
    atualizarInterfaceClasse();

    // 5. Ativa controles de teclado
    document.addEventListener('keydown', controleTeclado);
};

// Função mágica para evitar delay no carrossel
function precarregarImagens() {
    console.log("🔄 Iniciando preload das imagens de perfil...");
    CLASSES.forEach(cls => {
        const img = new Image();
        img.src = cls.perfil;
        // Armazena no array global para o Garbage Collector não limpar
        imagensPrecarregadas.push(img);
    });
}

// ================================================================
// LÓGICA DO CARROSSEL (PERFIL)
// ================================================================

window.mudarClasse = function(direcao) {
    indiceAtual += direcao;
    
    // Loop infinito do carrossel
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

    // 1. Inicia o Fade Out (Desaparece suavemente)
    imgPerfil.style.opacity = 0;
    lblNome.style.opacity = 0;
    if (btnNome) btnNome.style.opacity = 0;
    
    // 2. Aguarda um pouquinho (150ms) para a animação do CSS acontecer
    setTimeout(() => {
        // 3. Troca o conteúdo (A imagem já está em cache graças ao preload)
        imgPerfil.src = classe.perfil;
        lblNome.innerText = classe.nome;
        if (btnNome) {
            btnNome.innerText = classe.nome;
            btnNome.style.opacity = 1;
        }
        
        // Atualiza os pontos de navegação
        document.querySelectorAll('.dot').forEach((d, i) => {
            if (i === indiceAtual) d.classList.add('active');
            else d.classList.remove('active');
        });
        
        // 4. Inicia o Fade In (Aparece suavemente)
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

    // Se estiver lendo o PDF
    if (modalDetalhes && modalDetalhes.style.display === 'flex') {
        if (e.key === 'ArrowLeft') window.mudarPaginaPDF(-1);
        if (e.key === 'ArrowRight') window.mudarPaginaPDF(1);
        if (e.key === 'Escape') window.fecharDetalhesClasse();
        if (e.key === 'Enter') window.confirmarSelecaoClasseDeDentro();
        return;
    }

    // Se estiver no carrossel
    if (modalSelecao && modalSelecao.style.display !== 'none') {
        if (e.key === 'ArrowLeft') window.mudarClasse(-1);
        if (e.key === 'ArrowRight') window.mudarClasse(1);
        if (e.key === 'Enter') window.verDetalhesClasse();
    }
}

// ================================================================
// LÓGICA DE DETALHES (PDF MULTIPAGINA)
// ================================================================

window.verDetalhesClasse = function() {
    const classe = CLASSES[indiceAtual];
    const modalDetalhes = document.getElementById('modal-detalhes-classe');
    
    if (!modalDetalhes) return;
    
    // Reseta para a primeira página ao abrir
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
    
    // Esconde botões se não houver páginas anteriores/próximas
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
// SALVAMENTO E TRANSIÇÃO DIRETA (A MÁGICA ACONTECE AQUI)
// ================================================================

window.confirmarSelecaoClasse = async function() {
    const classeSelecionada = CLASSES[indiceAtual];
    
    if (!confirm(`Confirmar o destino: ${classeSelecionada.nome.toUpperCase()}?`)) {
        return;
    }
    
    // Remove listener para evitar conflitos de teclas na mesa
    document.removeEventListener('keydown', controleTeclado);

    if (window.nomeJogador && window.db) {
        try {
            // 1. Salvar no Firebase
            const caminho = `mesa_rpg/jogadores/${window.nomeJogador}/slots/Fundamental`;
            const dadosClasse = {
                categoria: "Classes",
                profissao: classeSelecionada.nome,
                nivel: 1,
                caminho_perfil: classeSelecionada.perfil 
            };
            
            await window.set(window.ref(window.db, caminho), dadosClasse);
            localStorage.setItem('profissaoSelecionada', classeSelecionada.nome);
            
            console.log("✅ Classe salva e confirmada. Iniciando transição direta...");

            // 2. TRANSIÇÃO DIRETA PARA A MESA (Sem Recarregar)
            
            // a) Esconde o modal de seleção
            const modal = document.getElementById('classe-selection-modal');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('ativo');
            }

            // b) Mostra a Mesa de Jogo (App Container)
            const appContainer = document.getElementById('app-container');
            if (appContainer) {
                appContainer.style.display = 'flex';
                // Delay minúsculo para permitir a animação CSS de opacity
                setTimeout(() => appContainer.style.opacity = '1', 50);
            }

            // c) Inicializa as mecânicas do jogo
            // Chama as funções globais do script.js para conectar ao Firebase em tempo real
            if (typeof window.monitorarEstadoEmTempoReal === 'function') {
                window.monitorarEstadoEmTempoReal();
            }
            if (typeof window.renderizar === 'function') {
                window.renderizar();
            }
            
            // d) Toca a música e configura o botão de som
            const audio = document.getElementById('bg-music');
            if (audio && audio.paused) {
                audio.volume = 0.05;
                // Autoplay pode ser bloqueado, tratamos o erro silenciosamente
                audio.play().catch(e => console.log("Áudio: Autoplay requer interação prévia."));
                
                const btnMusic = document.getElementById('btn-music');
                if(btnMusic) btnMusic.innerText = '🔊';
            }

            // Sucesso! Sem reload.

        } catch (error) {
            console.error("❌ Erro ao salvar:", error);
            alert("Erro ao salvar: " + error.message);
        }
    } else {
        alert("Erro crítico de sessão. Tente logar novamente.");
        window.location.reload(); // Só recarrega em caso de falha crítica
    }
};

// Função auxiliar para compatibilidade
window.obterProfissaoSelecionada = function() {
    return localStorage.getItem('profissaoSelecionada');
};