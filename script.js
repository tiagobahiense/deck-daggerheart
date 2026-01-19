// --- IMPORTAÇÕES DO FIREBASE VIA CDN (Funciona no Vercel) ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// --- CONFIGURAÇÃO DO FIREBASE (SUAS CHAVES REAIS) ---
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
// Estrutura dos slots fixos da mesa
let slotsFixos = { 
    'Ancestralidade': null, 
    'Comunidade': null, 
    'Fundamental': null, 
    'Especializacao': null, 
    'Maestria': null 
};

// Variáveis de controle de transição (Drag/Drop/Click logic)
let cartaEmTransitoIndex = null; 
let origemTransito = null; 
let slotDestinoAtual = null;

const LIMITE_MAO = 5;
const audio = document.getElementById('bg-music');

// --- FUNÇÃO DE SALVAMENTO NA NUVEM ---
// Essa função envia o estado atual do jogador para o Firebase sempre que algo muda
function salvarNaNuvem() {
    if (!nomeJogador) return;

    // Salva no caminho: mesa_rpg / jogadores / NOME_DO_PERSONAGEM
    set(ref(db, 'mesa_rpg/jogadores/' + nomeJogador), {
        mao: maoDoJogador,
        reserva: reservaDoJogador,
        slots: slotsFixos,
        ultimoAcesso: Date.now()
    }).catch((error) => {
        console.error("Erro ao salvar no Firebase:", error);
    });
}

// --- FUNÇÕES EXPOSTAS AO WINDOW ---
// Como usamos type="module", precisamos atrelar as funções ao 'window' 
// para que os botões do HTML (onclick="") consigam acessá-las.

// 1. Início e Login
window.iniciarExperiencia = function() {
    const input = document.getElementById('nome-personagem');
    if (!input.value.trim()) { 
        alert("Por favor, identifique seu personagem!"); 
        return; 
    }
    
    // Salva o nome em maiúsculo para evitar duplicidade tipo "grog" e "Grog"
    nomeJogador = input.value.trim().toUpperCase();
    
    // Troca de telas
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    
    // Fade in suave
    setTimeout(() => document.getElementById('app-container').style.opacity = '1', 50);
    
    // Configurações iniciais
    window.setVolume();
    // Tenta dar play no audio (navegadores podem bloquear se não houver clique antes)
    audio.play().catch(() => console.log("O áudio iniciará na primeira interação."));
    
    carregarDados();
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

// 3. Carregamento do JSON das cartas
async function carregarDados() {
    try {
        const r = await fetch('./lista_cartas.json');
        catalogoCartas = await r.json();
    } catch (e) { 
        console.error("Erro ao carregar lista_cartas.json. Verifique se o arquivo existe.", e); 
    }
}

// --- GRIMÓRIO (CATÁLOGO) ---

window.abrirGrimorio = function(tipo, slotDestino = null) {
    const modal = document.getElementById('grimorio-modal');
    const grid = document.getElementById('grid-cartas');
    const titulo = document.getElementById('modal-titulo');
    
    slotDestinoAtual = slotDestino; // Memoriza se clicou numa caixa de classe ou no deck
    grid.innerHTML = '';
    
    let lista = [];

    // Se for Geral, mostra tudo menos as cartas de identidade/classe
    if (tipo === 'Geral') {
        titulo.innerText = "Grimório Principal";
        lista = catalogoCartas.filter(c => !['Classes','Ancestralidade','Comunidade'].includes(c.categoria));
    } else {
        // Se for específico (ex: Classes), filtra pela categoria
        titulo.innerText = `Selecionar: ${tipo}`;
        lista = catalogoCartas.filter(c => c.categoria === tipo);
    }
    
    // Renderiza as cartas no modal
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
    
    if (destino) {
        // Se veio de um clique num slot fixo (Ancestralidade, Classe...)
        window.preencherSlotFixo(carta, destino);
    } else {
        // Se veio do Deck Principal
        adicionarNaMao(carta);
    }
}

// --- SLOTS FIXOS (MESA) ---

window.preencherSlotFixo = function(carta, idSlot) {
    // 1. Atualiza dados
    slotsFixos[idSlot] = carta;
    salvarNaNuvem(); 
    
    // 2. Atualiza visual
    const div = document.getElementById(`slot-${idSlot}`);
    
    // Limpa imagem anterior
    const imgOld = div.querySelector('img');
    if(imgOld) imgOld.remove();
    
    // Adiciona nova imagem
    const img = document.createElement('img');
    img.src = carta.caminho;
    div.appendChild(img);
    
    // Mostra botão de limpar
    const btn = div.querySelector('.btn-limpar');
    if(btn) btn.style.display = 'flex';
}

window.limparSlot = function(idSlot, evt) {
    if(evt) evt.stopPropagation(); // Impede que abra o grimório ao clicar no X
    
    // 1. Atualiza dados
    slotsFixos[idSlot] = null;
    salvarNaNuvem(); 
    
    // 2. Atualiza visual
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
        // Regra Daggerheart: Se a mão estiver cheia, pode ir pra reserva
        if(confirm("Sua mão está cheia (5 cartas). Deseja enviar esta carta para a Reserva (Mochila)?")) {
            reservaDoJogador.push(carta);
            renderizar();
            salvarNaNuvem(); 
        }
    }
}

// Abre o modal de decisão ao clicar na carta da mão
window.abrirDecisao = function(idx) {
    cartaEmTransitoIndex = idx;
    origemTransito = 'mao';
    const c = maoDoJogador[idx];
    
    document.getElementById('preview-decisao').style.backgroundImage = `url('${c.caminho}')`;
    document.getElementById('decisao-modal').style.display = 'flex';
}

// Traz carta da reserva para a mão
window.resgatarReserva = function(idx) {
    if (maoDoJogador.length < LIMITE_MAO) {
        const c = reservaDoJogador[idx];
        reservaDoJogador.splice(idx, 1); // Remove da reserva
        maoDoJogador.push(c); // Põe na mão
        renderizar();
        salvarNaNuvem(); 
    } else {
        alert("Sua mão está cheia! Libere espaço antes de pegar da reserva.");
    }
}

// Ação do Modal: Mover para Reserva
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

// Ação do Modal: Devolver ao Deck (Excluir)
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
// Atualiza o HTML da Mão e da Reserva baseado nos Arrays
function renderizar() {
    // 1. Renderiza Mão
    const divMao = document.getElementById('cartas-mao');
    divMao.innerHTML = '';
    
    maoDoJogador.forEach((c, i) => {
        const el = document.createElement('div');
        el.className = 'carta';
        el.style.backgroundImage = `url('${c.caminho}')`;
        
        // Cálculo para efeito de leque
        const centro = (maoDoJogador.length - 1) / 2;
        const rotacao = (i - centro) * 4; 
        el.style.transform = `rotate(${rotacao}deg)`;
        
        el.onclick = () => window.abrirDecisao(i);
        divMao.appendChild(el);
    });

    // 2. Renderiza Reserva
    const divRes = document.getElementById('cartas-reserva');
    divRes.innerHTML = '';
    
    // Esconde a caixa da reserva se estiver vazia para limpar o visual
    divRes.style.opacity = reservaDoJogador.length ? '1' : '0';
    
    reservaDoJogador.forEach((c, i) => {
        const el = document.createElement('div');
        el.className = 'carta-reserva';
        el.style.backgroundImage = `url('${c.caminho}')`;
        el.onclick = () => window.resgatarReserva(i);
        divRes.appendChild(el);
    });
}