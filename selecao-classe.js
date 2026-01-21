/**
 * SISTEMA DE SELEÇÃO DE CLASSES - Daggerheart
 * Versão Otimizada: Preload + Transição Direta + Ativação de Aura (Corrigido)
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
let imagensPrecarregadas = []; 

// ================================================================
// FUNÇÃO INICIALIZADORA
// ================================================================
window.inicializarSelecaoClasse = function() {
    console.log("⚔️ Inicializando Seleção de Classe...");
    
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    
    if (loginScreen) loginScreen.style.display = 'none';
    if (appContainer) appContainer.style.display = 'none';
    
    const modal = document.getElementById('classe-selection-modal');
    if (modal) {
        modal.style.display = 'flex';
        modal.classList.add('ativo');
    }
    
    precarregarImagens();
    gerarDots();
    atualizarInterfaceClasse();

    document.addEventListener('keydown', controleTeclado);
};

function precarregarImagens() {
    console.log("🔄 Precarregando imagens...");
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

    imgPerfil.style.opacity = 0;
    lblNome.style.opacity = 0;
    if (btnNome) btnNome.style.opacity = 0;
    
    setTimeout(() => {
        imgPerfil.src = classe.perfil;
        lblNome.innerText = classe.nome;
        if (btnNome) {
            btnNome.innerText = classe.nome;
            btnNome.style.opacity = 1;
        }
        
        document.querySelectorAll('.dot').forEach((d, i) => {
            if (i === indiceAtual) d.classList.add('active');
            else d.classList.remove('active');
        });
        
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
// SALVAMENTO E TRANSIÇÃO DIRETA
// ================================================================

window.confirmarSelecaoClasse = async function() {
    const classeSelecionada = CLASSES[indiceAtual];
    
    if (!confirm(`Confirmar o destino: ${classeSelecionada.nome.toUpperCase()}?`)) {
        return;
    }
    
    document.removeEventListener('keydown', controleTeclado);

    if (window.nomeJogador && window.db) {
        try {
            // 1. Salvar no Banco
            const caminho = `mesa_rpg/jogadores/${window.nomeJogador}/slots/Fundamental`;
            const dadosClasse = {
                categoria: "Classes",
                profissao: classeSelecionada.nome,
                nivel: 1,
                caminho_perfil: classeSelecionada.perfil 
            };
            
            await window.set(window.ref(window.db, caminho), dadosClasse);
            localStorage.setItem('profissaoSelecionada', classeSelecionada.nome);
            
            console.log("✅ Classe salva. Iniciando jogo...");

            // 2. Transição Visual
            const modal = document.getElementById('classe-selection-modal');
            if (modal) {
                modal.style.display = 'none';
                modal.classList.remove('ativo');
            }

            const appContainer = document.getElementById('app-container');
            if (appContainer) {
                appContainer.style.display = 'flex';
                setTimeout(() => appContainer.style.opacity = '1', 50);
            }

            // 3. ATIVAR EFEITOS DA CLASSE (AURA E COR) -> AQUI ESTÁ A CORREÇÃO!
            if (typeof window.ativarProfissao === 'function') {
                console.log(`✨ Ativando aura para: ${classeSelecionada.nome}`);
                window.ativarProfissao(classeSelecionada.nome);
            }

            // 4. Inicializar mecânicas do jogo
            if (typeof window.monitorarEstadoEmTempoReal === 'function') {
                window.monitorarEstadoEmTempoReal();
            }
            if (typeof window.renderizar === 'function') {
                window.renderizar();
            }
            
            // 5. Música
            const audio = document.getElementById('bg-music');
            if (audio && audio.paused) {
                audio.volume = 0.05;
                audio.play().catch(e => console.log("Audio autoplay bloqueado"));
                const btnMusic = document.getElementById('btn-music');
                if(btnMusic) btnMusic.innerText = '🔊';
            }

        } catch (error) {
            console.error("❌ Erro ao salvar:", error);
            alert("Erro ao salvar: " + error.message);
        }
    } else {
        alert("Erro de sessão. Tente logar novamente.");
        window.location.reload();
    }
};

window.obterProfissaoSelecionada = function() {
    return localStorage.getItem('profissaoSelecionada');
};