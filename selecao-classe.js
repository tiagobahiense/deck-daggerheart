// =========================================================
// SELEÇÃO DE CLASSE & CARROSSEL
// =========================================================

const classesDisponiveis = [
    { nome: 'Bardo', img: 'img/perfil/Bardo.png', pdfs: ['img/classes/Bardo-1.png', 'img/classes/Bardo-2.png'] },
    { nome: 'Druida', img: 'img/perfil/Druida.png', pdfs: ['img/classes/Druida-1.png', 'img/classes/Druida-2.png'] },
    { nome: 'Feiticeiro', img: 'img/perfil/Feiticeiro.png', pdfs: ['img/classes/Feiticeiro-1.png', 'img/classes/Feiticeiro-2.png'] },
    { nome: 'Guardião', img: 'img/perfil/Guardiao.png', pdfs: ['img/classes/Guardiao-1.png', 'img/classes/Guardiao-2.png'] },
    { nome: 'Guerreiro', img: 'img/perfil/Guerreiro.png', pdfs: ['img/classes/Guerreiro-1.png', 'img/classes/Guerreiro-2.png'] },
    { nome: 'Ladino', img: 'img/perfil/Ladino.png', pdfs: ['img/classes/Ladino-1.png', 'img/classes/Ladino-2.png'] },
    { nome: 'Mago', img: 'img/perfil/Mago.png', pdfs: ['img/classes/Mago-1.png', 'img/classes/Mago-2.png'] },
    { nome: 'Patrulheiro', img: 'img/perfil/Patrulheiro.png', pdfs: ['img/classes/Patrulheiro-1.png', 'img/classes/Patrulheiro-2.png'] },
    { nome: 'Serafim', img: 'img/perfil/Serafim.png', pdfs: ['img/classes/Serafim-1.png', 'img/classes/Serafim-2.png'] }
];

let indiceClasse = 0;
let paginaPDFAtual = 0;

window.inicializarSelecaoClasse = function() {
    document.getElementById('classe-selection-modal').style.display = 'flex';
    atualizarCarrossel();
};

window.mudarClasse = function(dir) {
    indiceClasse += dir;
    if (indiceClasse < 0) indiceClasse = classesDisponiveis.length - 1;
    if (indiceClasse >= classesDisponiveis.length) indiceClasse = 0;
    atualizarCarrossel();
};

function atualizarCarrossel() {
    const cls = classesDisponiveis[indiceClasse];
    const img = document.getElementById('img-classe-perfil');
    
    // Animação simples de troca
    img.style.opacity = 0;
    setTimeout(() => {
        img.src = cls.img;
        img.style.opacity = 1;
    }, 200);

    document.getElementById('nome-classe-selecao').innerText = cls.nome;
    document.getElementById('btn-nome-classe').innerText = cls.nome;
}

// === FUNÇÃO REATIVADA: VER DETALHES (PDF) ===
window.verDetalhesClasse = function() {
    paginaPDFAtual = 0;
    const modal = document.getElementById('modal-detalhes-classe');
    if(modal) {
        modal.style.display = 'flex';
        atualizarPDF();
    }
};

window.fecharDetalhesClasse = function() {
    document.getElementById('modal-detalhes-classe').style.display = 'none';
};

window.mudarPaginaPDF = function(dir) {
    const cls = classesDisponiveis[indiceClasse];
    if(!cls.pdfs || cls.pdfs.length === 0) return;
    
    paginaPDFAtual += dir;
    if (paginaPDFAtual < 0) paginaPDFAtual = 0;
    if (paginaPDFAtual >= cls.pdfs.length) paginaPDFAtual = cls.pdfs.length - 1;
    
    atualizarPDF();
};

function atualizarPDF() {
    const cls = classesDisponiveis[indiceClasse];
    const img = document.getElementById('img-classe-pdf');
    const contador = document.getElementById('pdf-page-counter');
    
    if (cls.pdfs && cls.pdfs.length > 0) {
        img.src = cls.pdfs[paginaPDFAtual];
        contador.innerText = `${paginaPDFAtual + 1}/${cls.pdfs.length}`;
    } else {
        img.alt = "Sem descrição disponível";
        contador.innerText = "-";
    }
}

// Lógica de Confirmação
window.confirmarSelecaoClasse = function() {
    finalizarEscolha();
};

window.confirmarSelecaoClasseDeDentro = function() {
    window.fecharDetalhesClasse();
    finalizarEscolha();
};

function finalizarEscolha() {
    const cls = classesDisponiveis[indiceClasse];
    const nomeClasse = cls.nome; // Ex: "Guerreiro"

    // Salva local
    localStorage.setItem('profissaoSelecionada', nomeClasse);
    
    // Fecha modal
    document.getElementById('classe-selection-modal').style.display = 'none';
    
    // Atualiza Firebase
    if(window.nomeJogador && window.set && window.ref && window.db) {
        // Encontra a carta fundamental correspondente
        fetch('./lista_cartas_v2.json')
            .then(res => res.json())
            .then(cartas => {
                // Procura a carta "Fundamental - Classe"
                const cartaFundamental = cartas.find(c => 
                    c.categoria === 'Classes' && 
                    c.profissao === nomeClasse && 
                    c.nome.includes('Fundamental')
                );

                const dadosSalvar = {
                    nome: cartaFundamental ? cartaFundamental.nome : `Fundamental - ${nomeClasse}`,
                    caminho: cartaFundamental ? cartaFundamental.caminho : cls.img,
                    caminho_perfil: cls.img, // Salva imagem de perfil para usar no slot se a carta falhar
                    profissao: nomeClasse
                };

                window.set(window.ref(window.db, `mesa_rpg/jogadores/${window.nomeJogador}/slots/Fundamental`), dadosSalvar);
            });
    }

    // Ativa efeitos visuais
    if(window.ativarProfissao) window.ativarProfissao(nomeClasse);
    
    // Renderiza
    if(window.renderizar) window.renderizar();
}