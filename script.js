// --- IMPORTAÇÕES DO FIREBASE ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, child } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- CONFIGURAÇÃO DO FIREBASE ---
const firebaseConfig = {
    apiKey: "AIzaSyATWkyYE6b3wyz3LdFXAmxKxNQOexa_vUY",
    authDomain: "deck-daggerheart.firebaseapp.com",
    databaseURL: "https://deck-daggerheart-default-rtdb.firebaseio.com",
    projectId: "deck-daggerheart",
    storageBucket: "deck-daggerheart.firebasestorage.app",
    messagingSenderId: "825358776791",
    appId: "1:825358776791:web:ce0ab844f58c60573c7392",
    measurementId: "G-20TB05E9N2"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// --- ESTADO GLOBAL ---
let nomeJogador = "";
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

// Variáveis de controle
let cartaEmTransitoIndex = null; 
let origemTransito = null; 
let slotDestinoAtual = null;

const LIMITE_MAO = 5;
const audio = document.getElementById('bg-music');

// --- FUNÇÃO DE SALVAMENTO ---
function salvarNaNuvem() {
    if (!nomeJogador) return;
    set(ref(db, 'mesa_rpg/jogadores/' + nomeJogador), {
        mao: maoDoJogador,
        reserva: reservaDoJogador,
        slots: slotsFixos,
        ultimoAcesso: Date.now()
    }).catch((e) => console.error("Erro ao salvar:", e));
}

// --- FUNÇÃO DE CARREGAMENTO (RECUPERAR SESSÃO) ---
async function carregarEstadoDaNuvem() {
    const dbRef = ref(db);
    try {
        const snapshot = await get(child(dbRef, `mesa_rpg/jogadores/${nomeJogador}`));
        if (snapshot.exists()) {
            const dados = snapshot.val();
            
            // Restaura as variáveis
            maoDoJogador = dados.mao || [];
            reservaDoJogador = dados.reserva || [];
            if (dados.slots) slotsFixos = dados.slots;

            // Restaura o visual da Mão e Reserva
            renderizar();

            // Restaura o visual dos Slots Fixos (Mesa)
            Object.keys(slotsFixos).forEach(key => {
                if (slotsFixos[key]) {
                    const div = document.getElementById(`slot-${key}`);
                    // Limpa se tiver algo
                    const imgOld = div.querySelector('img');
                    if(imgOld) imgOld.remove();
                    
                    // Cria imagem
                    const img = document.createElement('img');
                    img.src = slotsFixos[key].caminho;
                    div.appendChild(img);
                    
                    // Mostra botão limpar
                    const btn = div.querySelector('.btn-limpar');
                    if(btn) btn.style.display = 'flex';
                }
            });
            console.log("Sessão restaurada com sucesso!");
        }
    } catch (error) {
        console.error("Erro ao recuperar dados:", error);
    }
}

// --- FUNÇÕES EXPOSTAS AO WINDOW ---

// 1. Início e Login
window.iniciarExperiencia = async function() {
    const input = document.getElementById('nome-personagem');
    if (!input.value.trim()) { 
        alert("Por favor, identifique seu personagem!"); 
        return; 
    }
    
    nomeJogador = input.value.trim().toUpperCase();
    
    // Troca de telas
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    setTimeout(() => document.getElementById('app-container').style.opacity = '1', 50);
    
    // Configurações iniciais
    window.setVolume();
    audio.play().catch(() => console.log("Áudio aguardando interação."));
    
    // 1. Carrega o catálogo de cartas
    await carregarDados();

    // 2. Verifica se o jogador já existe e restaura as cartas
    await carregarEstadoDaNuvem();
}

// 2. Controles de Áudio
window.toggleMusic = function() {
    const btn = document.getElementById('btn-music');
    if (audio.paused) { 
        audio.play(); 
        btn.innerText = "🔊"; 
    } else { 
        audio.pause(); 
        btn.innerText = "🔇"; 
    }
}

window.setVolume = function() {
    audio.volume = document.getElementById('volume').value;
}

// 3. Carregamento do JSON
async function carregarDados() {
    try {
        const r = await fetch('./lista_cartas.json');
        catalogoCartas = await r.json();
    } catch (e) { console.error("Erro no JSON", e); }
}

// --- GRIMÓRIO ---
window.abrirGrimorio = function(tipo, slotDestino = null) {
    const modal = document.getElementById('grimorio-modal');
    const grid = document.getElementById('grid-cartas');
    const titulo = document.getElementById('modal-titulo');
    
    slotDestinoAtual = slotDestino;
    grid.innerHTML = '';
    
    let lista = [];
    if (tipo === 'Geral') {
        titulo.innerText = "Grimório Principal";
        lista = catalogoCartas.filter(c => !['Classes','Ancestralidade','Comunidade'].includes(c.categoria));
    } else {
        titulo.innerText = `Selecionar: ${tipo}`;
        lista = catalogoCartas.filter(c => c.categoria === tipo);
    }
    
    lista.forEach(carta => {
        const div = document.createElement('div');
        div.className = 'carta-modal';
        div.style.backgroundImage = `url('${carta.caminho}')`;
        div.onclick = () => selecionarCarta(carta);
        grid.appendChild(div);
    });
    
    modal.style.display = 'flex';
}

window.fecharGrimorio = function() {
    document.getElementById('grimorio-modal').style.display = 'none';
}

function selecionarCarta(carta) {
    const destino = slotDestinoAtual;
    window.fecharGrimorio();
    slotDestinoAtual = null;
    
    if (destino) window.preencherSlotFixo(carta, destino);
    else adicionarNaMao(carta);
}

// --- SLOTS FIXOS ---
window.preencherSlotFixo = function(carta, idSlot) {
    slotsFixos[idSlot] = carta;
    salvarNaNuvem(); 
    
    const div = document.getElementById(`slot-${idSlot}`);
    const imgOld = div.querySelector('img');
    if(imgOld) imgOld.remove();
    
    const img = document.createElement('img');
    img.src = carta.caminho;
    div.appendChild(img);
    
    const btn = div.querySelector('.btn-limpar');
    if(btn) btn.style.display = 'flex';
}

window.limparSlot = function(idSlot, evt) {
    if(evt) evt.stopPropagation();
    slotsFixos[idSlot] = null;
    salvarNaNuvem(); 
    
    const div = document.getElementById(`slot-${idSlot}`);
    const img = div.querySelector('img');
    if(img) img.remove();
    const btn = div.querySelector('.btn-limpar');
    if(btn) btn.style.display = 'none';
}

// --- MÃO E RESERVA ---
function adicionarNaMao(carta) {
    if (maoDoJogador.length < LIMITE_MAO) {
        maoDoJogador.push(carta);
        renderizar();
        salvarNaNuvem(); 
    } else {
        if(confirm("Mão cheia. Enviar para a Reserva?")) {
            reservaDoJogador.push(carta);
            renderizar();
            salvarNaNuvem(); 
        }
    }
}

window.abrirDecisao = function(idx) {
    cartaEmTransitoIndex = idx;
    origemTransito = 'mao';
    const c = maoDoJogador[idx];
    document.getElementById('preview-decisao').style.backgroundImage = `url('${c.caminho}')`;
    document.getElementById('decisao-modal').style.display = 'flex';
}

window.resgatarReserva = function(idx) {
    if (maoDoJogador.length < LIMITE_MAO) {
        const c = reservaDoJogador[idx];
        reservaDoJogador.splice(idx, 1);
        maoDoJogador.push(c);
        renderizar();
        salvarNaNuvem(); 
    } else {
        alert("Sua mão está cheia!");
    }
}

window.moverParaReserva = function() {
    if(origemTransito === 'mao') {
        const c = maoDoJogador[cartaEmTransitoIndex];
        maoDoJogador.splice(cartaEmTransitoIndex, 1);
        reservaDoJogador.push(c);
        window.fecharDecisao();
        renderizar();
        salvarNaNuvem(); 
    }
}

window.devolverAoDeck = function() {
    if(origemTransito === 'mao') {
        maoDoJogador.splice(cartaEmTransitoIndex, 1);
        window.fecharDecisao();
        renderizar();
        salvarNaNuvem(); 
    }
}

window.fecharDecisao = function() {
    document.getElementById('decisao-modal').style.display = 'none';
    cartaEmTransitoIndex = null;
}

// --- RENDERIZAÇÃO ---
function renderizar() {
    const divMao = document.getElementById('cartas-mao');
    divMao.innerHTML = '';
    
    maoDoJogador.forEach((c, i) => {
        const el = document.createElement('div');
        el.className = 'carta';
        el.style.backgroundImage = `url('${c.caminho}')`;
        const centro = (maoDoJogador.length - 1) / 2;
        const rotacao = (i - centro) * 4; 
        el.style.transform = `rotate(${rotacao}deg)`;
        el.onclick = () => window.abrirDecisao(i);
        divMao.appendChild(el);
    });

    const divRes = document.getElementById('cartas-reserva');
    divRes.innerHTML = '';
    divRes.style.opacity = reservaDoJogador.length ? '1' : '0';
    
    reservaDoJogador.forEach((c, i) => {
        const el = document.createElement('div');
        el.className = 'carta-reserva';
        el.style.backgroundImage = `url('${c.caminho}')`;
        el.onclick = () => window.resgatarReserva(i);
        divRes.appendChild(el);
    });
}