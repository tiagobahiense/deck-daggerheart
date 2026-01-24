// =========================================================
// SELEÇÃO DE CLASSE & CARROSSEL (CORRIGIDO PARA SUAS PASTAS)
// =========================================================

/* IMPORTANTE: Baseado nos seus prints:
   - Perfis estão na pasta: img/classes-perfil/ (ex: bardoperfil.png)
   - PDFs estão na pasta: img/classes-pdf/ (ex: bardo1.jpg)
   
   Se as imagens não aparecerem, verifique se são .png ou .jpg e ajuste abaixo.
   Estou assumindo: Perfis = .png, PDFs = .jpg (padrão comum)
*/

const classesDisponiveis = [
    { 
        nome: 'Bardo', 
        img: 'img/classes-perfil/bardoperfil.png', 
        pdfs: ['img/classes-pdf/bardo1.jpg', 'img/classes-pdf/bardo2.jpg'] 
    },
    { 
        nome: 'Druida', 
        img: 'img/classes-perfil/druidaperfil.png', 
        pdfs: ['img/classes-pdf/druida1.jpg', 'img/classes-pdf/druida2.jpg', 'img/classes-pdf/druida3.jpg', 'img/classes-pdf/druida4.jpg', 'img/classes-pdf/druida5.jpg', 'img/classes-pdf/druida6.jpg'] 
    },
    { 
        nome: 'Feiticeiro', 
        img: 'img/classes-perfil/feiticeiroperfil.png', 
        pdfs: ['img/classes-pdf/feiticeiro1.jpg', 'img/classes-pdf/feiticeiro2.jpg'] 
    },
    { 
        nome: 'Guardião', 
        img: 'img/classes-perfil/guardiaoperfil.png', 
        pdfs: ['img/classes-pdf/guardiao1.jpg', 'img/classes-pdf/guardiao2.jpg'] 
    },
    { 
        nome: 'Guerreiro', 
        img: 'img/classes-perfil/guerreiroperfil.png', 
        pdfs: ['img/classes-pdf/guerreiro1.jpg', 'img/classes-pdf/guerreiro2.jpg'] 
    },
    { 
        nome: 'Ladino', 
        img: 'img/classes-perfil/ladinoperfil.png', 
        pdfs: ['img/classes-pdf/ladino1.jpg', 'img/classes-pdf/ladino2.jpg'] 
    },
    { 
        nome: 'Mago', 
        img: 'img/classes-perfil/magoperfil.png', 
        pdfs: ['img/classes-pdf/mago1.jpg', 'img/classes-pdf/mago2.jpg'] 
    },
    { 
        nome: 'Patrulheiro', 
        img: 'img/classes-perfil/patrulheiroperfil.png', 
        pdfs: ['img/classes-pdf/patrulheiro1.jpg', 'img/classes-pdf/patrulheiro2.jpg', 'img/classes-pdf/patrulheiro3.jpg', 'img/classes-pdf/patrulheiro4.jpg'] 
    },
    { 
        nome: 'Serafim', 
        img: 'img/classes-perfil/serafimperfil.png', 
        pdfs: ['img/classes-pdf/serafim1.jpg', 'img/classes-pdf/serafim2.jpg'] 
    }
];

window.classesDisponiveis = classesDisponiveis;

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
    
    // Reset visual
    img.style.opacity = 0;
    
    // Pequeno delay para transição suave
    setTimeout(() => {
        img.src = cls.img;
        // Se a imagem falhar, avisa no console
        img.onerror = () => console.warn(`Imagem não encontrada: ${cls.img}`);
        img.style.opacity = 1;
    }, 200);

    document.getElementById('nome-classe-selecao').innerText = cls.nome;
    document.getElementById('btn-nome-classe').innerText = cls.nome;
}

// === LÓGICA DO MODAL DE DETALHES ===
window.verDetalhesClasse = function() {
    console.log("Abrindo detalhes da classe...");
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
        img.onerror = () => {
            console.warn(`PDF/Imagem não encontrado: ${cls.pdfs[paginaPDFAtual]}`);
            img.alt = "Imagem não encontrada (Verifique o nome do arquivo na pasta)";
        };
        contador.innerText = `${paginaPDFAtual + 1}/${cls.pdfs.length}`;
    } else {
        img.alt = "Sem descrição disponível";
        contador.innerText = "-";
    }
}

// === CONFIRMAÇÃO E SALVAMENTO ===
window.confirmarSelecaoClasse = function() {
    finalizarEscolha();
};

window.confirmarSelecaoClasseDeDentro = function() {
    window.fecharDetalhesClasse();
    finalizarEscolha();
};

function finalizarEscolha() {
    const cls = classesDisponiveis[indiceClasse];
    const nomeClasse = cls.nome; 

    localStorage.setItem('profissaoSelecionada', nomeClasse);
    document.getElementById('classe-selection-modal').style.display = 'none';
    
    if(window.nomeJogador && window.set && window.ref && window.db) {
        // Tenta encontrar a carta fundamental na lista V2, senão usa o perfil
        fetch('./lista_cartas_v2.json')
            .then(res => res.json())
            .then(cartas => {
                const cartaFundamental = cartas.find(c => 
                    c.categoria === 'Classes' && 
                    c.profissao === nomeClasse && 
                    c.nome.toLowerCase().includes('fundamental')
                );

                const dadosSalvar = {
                    nome: cartaFundamental ? cartaFundamental.nome : `Fundamental - ${nomeClasse}`,
                    caminho: cartaFundamental ? cartaFundamental.caminho : cls.img,
                    caminho_perfil: cls.img, 
                    profissao: nomeClasse
                };

                window.set(window.ref(window.db, `mesa_rpg/jogadores/${window.nomeJogador}/slots/Fundamental`), dadosSalvar);
            });
    }

    if(window.ativarProfissao) window.ativarProfissao(nomeClasse);
    if(window.renderizar) window.renderizar();
}