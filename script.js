let catalogoCartas = [];
let maoDoJogador = [];
let reservaDoJogador = []; 
let slotsFixos = { 
    'Ancestralidade': null, 
    'Comunidade': null, 
    'Fundamental': null,
    'Especializacao': null,
    'Maestria': null
};

// Controles de estado
let cartaEmTransitoIndex = null; 
let origemTransito = null; 
let slotDestinoAtual = null;

const LIMITE_MAO = 5;
const audio = document.getElementById('bg-music');

/* --- INICIALIZAÇÃO --- */
function iniciarExperiencia() {
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex'; // Mudou para flex para layout vertical
    setTimeout(() => document.getElementById('app-container').style.opacity = '1', 50);
    
    // Configura volume inicial baixo (conforme definido no HTML value="0.05")
    setVolume(); 
    audio.play().catch(e => console.log("Permissão de áudio necessária"));
    
    carregarDados();
}

async function carregarDados() {
    try {
        const resp = await fetch('./lista_cartas.json');
        catalogoCartas = await resp.json();
    } catch (e) { console.error("Erro ao carregar JSON", e); }
}

/* --- GRIMÓRIO E SELEÇÃO --- */
function abrirGrimorio(tipoFiltro, slotDestino = null) {
    const modal = document.getElementById('grimorio-modal');
    const grid = document.getElementById('grid-cartas');
    const titulo = document.getElementById('modal-titulo');
    
    slotDestinoAtual = slotDestino;

    grid.innerHTML = '';
    modal.style.display = 'flex';
    
    let cartasFiltradas = [];

    if (tipoFiltro === 'Geral') {
        titulo.innerText = "Grimório (Deck Principal)";
        cartasFiltradas = catalogoCartas.filter(c => 
            c.categoria !== 'Classes' && c.categoria !== 'Ancestralidade' && c.categoria !== 'Comunidade'
        );
    } else {
        titulo.innerText = `Selecionar: ${tipoFiltro}`;
        cartasFiltradas = catalogoCartas.filter(c => c.categoria === tipoFiltro);
    }

    cartasFiltradas.forEach(carta => {
        const div = document.createElement('div');
        div.className = 'carta-modal';
        div.style.backgroundImage = `url('${carta.caminho}')`;
        div.onclick = () => selecionarCartaDoGrimorio(carta, tipoFiltro);
        grid.appendChild(div);
    });
}

function fecharGrimorio() {
    document.getElementById('grimorio-modal').style.display = 'none';
}

function selecionarCartaDoGrimorio(carta, tipoFiltro) {
    const destinoParaSalvar = slotDestinoAtual; 
    fecharGrimorio();
    slotDestinoAtual = null; 

    if (destinoParaSalvar) {
        preencherSlotFixo(carta, destinoParaSalvar);
    } else {
        adicionarNaMao(carta);
    }
}

/* --- SLOTS FIXOS E LIMPEZA --- */
function preencherSlotFixo(carta, idSlot) {
    slotsFixos[idSlot] = carta;
    
    const slotDiv = document.getElementById(`slot-${idSlot}`);
    
    const imgExistente = slotDiv.querySelector('img');
    if (imgExistente) imgExistente.remove();

    const img = document.createElement('img');
    img.src = carta.caminho;
    slotDiv.appendChild(img);

    // Mostra botão de limpar
    const btn = slotDiv.querySelector('.btn-limpar');
    if (btn) btn.style.display = 'flex';
}

function limparSlot(idSlot, event) {
    if (event) event.stopPropagation(); 

    slotsFixos[idSlot] = null;
    const slotDiv = document.getElementById(`slot-${idSlot}`);
    
    const img = slotDiv.querySelector('img');
    if (img) img.remove();

    const btn = slotDiv.querySelector('.btn-limpar');
    if (btn) btn.style.display = 'none';
}

/* --- LÓGICA MÃO & RESERVA --- */
function adicionarNaMao(carta) {
    if (maoDoJogador.length < LIMITE_MAO) {
        maoDoJogador.push(carta);
        renderizarTudo();
    } else {
        if(confirm("Sua mão está cheia (5 cartas). Deseja enviar esta carta para a Reserva?")) {
            reservaDoJogador.push(carta);
            renderizarTudo();
            mostrarMensagem("Carta enviada para a Reserva.");
        }
    }
}

function clicarNaMao(index) {
    cartaEmTransitoIndex = index;
    origemTransito = 'mao';
    const carta = maoDoJogador[index];
    
    document.getElementById('preview-decisao').style.backgroundImage = `url('${carta.caminho}')`;
    document.getElementById('decisao-modal').style.display = 'flex';
}

function clicarNaReserva(index) {
    if (maoDoJogador.length < LIMITE_MAO) {
        const carta = reservaDoJogador[index];
        reservaDoJogador.splice(index, 1);
        maoDoJogador.push(carta);
        renderizarTudo();
    } else {
        mostrarMensagem("Mão cheia! Libere espaço primeiro.");
    }
}

/* --- AÇÕES DE DECISÃO --- */
function moverParaReserva() {
    if (origemTransito === 'mao' && cartaEmTransitoIndex !== null) {
        const carta = maoDoJogador[cartaEmTransitoIndex];
        maoDoJogador.splice(cartaEmTransitoIndex, 1);
        reservaDoJogador.push(carta);
        fecharDecisao();
        renderizarTudo();
    }
}

function devolverAoDeck() {
    if (origemTransito === 'mao' && cartaEmTransitoIndex !== null) {
        maoDoJogador.splice(cartaEmTransitoIndex, 1);
        fecharDecisao();
        renderizarTudo();
    }
}

function fecharDecisao() {
    document.getElementById('decisao-modal').style.display = 'none';
    cartaEmTransitoIndex = null;
    origemTransito = null;
}

/* --- RENDERIZAÇÃO --- */
function renderizarTudo() {
    renderizarMao();
    renderizarReserva();
}

function renderizarMao() {
    const container = document.getElementById('cartas-mao');
    container.innerHTML = '';
    maoDoJogador.forEach((carta, index) => {
        const el = document.createElement('div');
        el.className = 'carta';
        el.style.backgroundImage = `url('${carta.caminho}')`;
        const centro = (maoDoJogador.length - 1) / 2;
        const rotacao = (index - centro) * 4; 
        el.style.transform = `rotate(${rotacao}deg)`;
        el.onclick = () => clicarNaMao(index);
        container.appendChild(el);
    });
}

function renderizarReserva() {
    const container = document.getElementById('cartas-reserva');
    container.innerHTML = '';
    container.style.opacity = reservaDoJogador.length === 0 ? '0' : '1';
    reservaDoJogador.forEach((carta, index) => {
        const el = document.createElement('div');
        el.className = 'carta-reserva';
        el.style.backgroundImage = `url('${carta.caminho}')`;
        el.onclick = () => clicarNaReserva(index);
        container.appendChild(el);
    });
}

/* --- EXTRAS --- */
function mostrarMensagem(texto) {
    const msgDiv = document.getElementById('system-message');
    msgDiv.innerText = texto;
    msgDiv.style.opacity = '1';
    setTimeout(() => msgDiv.style.opacity = '0', 3000);
}

function toggleMusic() {
    const btn = document.getElementById('btn-music');
    if (audio.paused) { audio.play(); btn.innerText = "🔊"; } 
    else { audio.pause(); btn.innerText = "🔇"; }
}

function setVolume() { 
    audio.volume = document.getElementById('volume').value; 
}