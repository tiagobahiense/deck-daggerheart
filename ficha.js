// =========================================================
// SISTEMA DE FICHA DE PERSONAGEM + MAPEADOR
// =========================================================

// Configuração das Imagens (Baseado nos seus arquivos)
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

// Configuração dos Campos (AQUI É ONDE VOCÊ VAI COLAR O CÓDIGO GERADO)
// Por enquanto está vazio. Use a ferramenta para preencher!
const FICHAS_CAMPOS = {
    'Guardião': {
        // Exemplo: 0: [ {id: 'nome', top: 10, left: 20...} ]
    }
};

let paginaFichaAtual = 0;
let classeFichaAtual = '';
let modoMapeamento = false;

// --- FUNÇÕES PRINCIPAIS ---

window.abrirFichaPersonagem = function() {
    // Tenta pegar a classe do LocalStorage
    const classe = localStorage.getItem('profissaoSelecionada');
    
    if (!classe || !FICHAS_IMAGENS[classe]) {
        alert("Erro: Classe não selecionada ou ficha não encontrada.");
        return;
    }

    classeFichaAtual = classe;
    paginaFichaAtual = 0;
    
    document.getElementById('sheet-modal').style.display = 'flex';
    atualizarVisualizacaoFicha();
};

window.fecharFicha = function() {
    document.getElementById('sheet-modal').style.display = 'none';
    if(modoMapeamento) window.ativarModoMapeamento(); // Desliga mapeamento ao fechar
};

window.mudarPaginaFicha = function(dir) {
    const totalPaginas = FICHAS_IMAGENS[classeFichaAtual].length;
    paginaFichaAtual += dir;
    
    if(paginaFichaAtual < 0) paginaFichaAtual = 0;
    if(paginaFichaAtual >= totalPaginas) paginaFichaAtual = totalPaginas - 1;
    
    atualizarVisualizacaoFicha();
};

function atualizarVisualizacaoFicha() {
    const img = document.getElementById('sheet-bg');
    const paginas = FICHAS_IMAGENS[classeFichaAtual];
    
    // Atualiza Imagem
    img.src = paginas[paginaFichaAtual];
    
    // Atualiza Contador
    document.getElementById('sheet-page-indicator').innerText = `Página ${paginaFichaAtual + 1} de ${paginas.length}`;
    
    // Limpa campos antigos
    document.getElementById('sheet-inputs-layer').innerHTML = '';
    
    // Renderiza campos salvos (Se existirem no futuro)
    renderizarCamposSalvos();
}

function renderizarCamposSalvos() {
    // Lógica futura para carregar campos do FICHAS_CAMPOS
    // Vamos focar no mapeamento primeiro.
}

// ========================================================
// 🛠️ FERRAMENTA DE MAPEAMENTO (MODO CONSTRUTOR)
// ========================================================

window.ativarModoMapeamento = function() {
    modoMapeamento = !modoMapeamento;
    const container = document.getElementById('sheet-container');
    const btn = document.querySelector('.btn-mapear');
    
    if (modoMapeamento) {
        alert(`MODO MAPEAMENTO ATIVADO PARA: ${classeFichaAtual.toUpperCase()}\n\n1. Clique e arraste para criar um campo.\n2. Escolha o tipo (Texto/Check).\n3. Dê um ID único (ex: 'forca', 'vida').\n4. Copie o JSON do Console (F12).`);
        container.style.cursor = 'crosshair';
        container.onmousedown = iniciarDesenho;
        btn.classList.add('ativo');
        btn.innerText = '🔴 GRAVANDO...';
    } else {
        container.style.cursor = 'default';
        container.onmousedown = null;
        btn.classList.remove('ativo');
        btn.innerText = '🛠️ Mapear';
    }
};

let startX, startY, tempBox;

function iniciarDesenho(e) {
    if (!modoMapeamento) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    startX = e.clientX - rect.left;
    startY = e.clientY - rect.top;
    
    // Cria box visual
    tempBox = document.createElement('div');
    tempBox.style.position = 'absolute';
    tempBox.style.border = '2px solid red';
    tempBox.style.background = 'rgba(255, 0, 0, 0.3)';
    tempBox.style.left = startX + 'px';
    tempBox.style.top = startY + 'px';
    document.getElementById('sheet-inputs-layer').appendChild(tempBox);
    
    document.onmousemove = (ev) => redimensionar(ev, rect);
    document.onmouseup = (ev) => finalizarDesenho(ev, rect);
}

function redimensionar(e, rect) {
    if (!tempBox) return;
    const currentX = e.clientX - rect.left;
    const currentY = e.clientY - rect.top;
    tempBox.style.width = (currentX - startX) + 'px';
    tempBox.style.height = (currentY - startY) + 'px';
}

function finalizarDesenho(e, rect) {
    document.onmousemove = null;
    document.onmouseup = null;
    if (!tempBox) return;
    
    // Calcula porcentagens (Responsividade)
    const wPct = (parseFloat(tempBox.style.width) / rect.width) * 100;
    const hPct = (parseFloat(tempBox.style.height) / rect.height) * 100;
    const xPct = (startX / rect.width) * 100;
    const yPct = (startY / rect.height) * 100;
    
    const tipo = prompt("Tipo do campo:\n1 para TEXTO (Nome, Atributos)\n2 para CHECKBOX (Bolinhas, Quadrados)");
    if (!tipo) { tempBox.remove(); return; }
    
    const idCampo = prompt("ID do campo (ex: forca, pericia_fuga, vida_max):");
    if (!idCampo) { tempBox.remove(); return; }
    
    const tipoStr = tipo === '1' ? 'texto' : 'check';
    
    // GERA O CÓDIGO NO CONSOLE
    const codigoJSON = `{ id: '${idCampo}', tipo: '${tipoStr}', top: ${yPct.toFixed(2)}, left: ${xPct.toFixed(2)}, width: ${wPct.toFixed(2)}, height: ${hPct.toFixed(2)} },`;
    
    console.log(`%c COPIE A LINHA ABAIXO PARA A PÁGINA ${paginaFichaAtual} DE ${classeFichaAtual}:`, 'color: yellow; font-size: 14px;');
    console.log(codigoJSON);
    
    // Deixa verde para confirmar
    tempBox.style.border = '2px solid #00ff00';
    tempBox.style.background = 'rgba(0, 255, 0, 0.3)';
    tempBox.innerText = idCampo;
    tempBox.style.fontSize = '10px';
    tempBox.style.color = '#000';
    tempBox = null;
}