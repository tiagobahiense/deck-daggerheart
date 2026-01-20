import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, child, remove, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, browserSessionPersistence, setPersistence, fetchSignInMethodsForEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);

// EMAIL OFICIAL DO MESTRE
const EMAIL_MESTRE = "tgbahiense@gmail.com";

// 🔧 FUNÇÃO DE DEBUG
function debug(mensagem, dados = null) {
    console.log(`🔍 DEBUG: ${mensagem}`, dados || '');
}

let currentUser = null;
let nomeJogador = "";
let catalogoCartas = [];
let maoDoJogador = [];
let reservaDoJogador = [];
let slotsFixos = { 'Ancestralidade': null, 'Comunidade': null, 'Fundamental': null, 'Especializacao': null, 'Maestria': null };
let cartaEmTransitoIndex = null;
let origemTransito = null;
let slotDestinoAtual = null;
const LIMITE_MAO = 5;
const audio = document.getElementById('bg-music');

// --- OBSERVER (LAZY LOAD) ---
const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const cardDiv = entry.target;
            const src = cardDiv.dataset.src;
            if (src) {
                cardDiv.style.backgroundImage = `url('${src}')`;
                cardDiv.classList.remove('lazy-card');
                observer.unobserve(cardDiv);
            }
        }
    });
}, {
    rootMargin: '100px 0px',
    threshold: 0.01
});

// --- UTILITÁRIOS ---
window.togglePassword = function(id) {
    const input = document.getElementById(id);
    input.type = input.type === "password" ? "text" : "password";
}

window.voltarParaSelecao = function() {
    debug('Voltando para seleção');
    document.getElementById('fase-login-jogador').style.display = 'none';
    document.getElementById('fase-login-narrador').style.display = 'none';
    document.getElementById('fase-personagem').style.display = 'none';
    document.getElementById('fase-selecao').style.display = 'block';
}

window.forcarLogout = function() {
    debug('Forçando logout');
    signOut(auth).then(() => {
        alert("Logout realizado. A página será recarregada.");
        location.reload();
    });
}

// --- NAVEGAÇÃO SEGURA ---
window.irParaLoginNarrador = function() {
    debug('Abrindo tela de login do narrador');
    document.getElementById('fase-selecao').style.display = 'none';
    document.getElementById('fase-login-narrador').style.display = 'block';
}

window.irParaLoginJogador = function() {
    debug('Abrindo tela de login do jogador');
    document.getElementById('fase-selecao').style.display = 'none';
    document.getElementById('fase-login-jogador').style.display = 'block';
}

// --- FUNÇÕES DE LOGIN ---
window.fazerLoginNarrador = function() {
    const email = document.getElementById('narrador-email').value.trim().toLowerCase();
    const pass = document.getElementById('narrador-pass').value;
    const msg = document.getElementById('error-msg-narrador');

    debug('Tentativa de login narrador', { email });

    if(!email || !pass) {
        msg.innerText = "Preencha email e senha.";
        return;
    }

    msg.innerText = "Autenticando...";

    signInWithEmailAndPassword(auth, email, pass)
    .then((userCredential) => {
        const emailLogado = userCredential.user.email.toLowerCase().trim();
        const emailMestre = EMAIL_MESTRE.toLowerCase().trim();

        debug('Login bem-sucedido', {
            emailLogado,
            emailMestre,
            saoIguais: emailLogado === emailMestre
        });

        if(emailLogado === emailMestre) {
            msg.innerText = "✅ Acesso concedido! Redirecionando...";
            debug('Redirecionando para admin.html');

            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 500);
        } else {
            msg.innerText = `❌ Erro: ${emailLogado} não é narrador.`;
            debug('Email não autorizado como narrador');
            signOut(auth);
        }
    })
    .catch((error) => {
        debug('Erro no login', error);
        msg.innerText = "❌ Login inválido: " + error.message;
    });
}

window.fazerLoginJogador = function() {
    const email = document.getElementById('player-email').value.trim().toLowerCase();
    const pass = document.getElementById('player-pass').value;
    const msg = document.getElementById('error-msg-player');

    debug('Tentativa de login jogador', { email });

    if(email === EMAIL_MESTRE.toLowerCase().trim()) {
        msg.innerText = "❌ O Mestre não pode logar como jogador.";
        return;
    }

    if(!email || !pass) {
        msg.innerText = "Preencha email e senha.";
        return;
    }

    msg.innerText = "Verificando...";

    signInWithEmailAndPassword(auth, email, pass)
    .then((userCredential) => {
        const uid = userCredential.user.uid;
        currentUser = userCredential.user;
        debug('Jogador autenticado', { email: currentUser.email });

        // Verifica se a conta está ativa
        return get(ref(db, `mesa_rpg/accounts/${uid}/status`)).then(statusSnapshot => {
            if (statusSnapshot.exists() && statusSnapshot.val() === 'inactive') {
                signOut(auth);
                msg.innerText = "❌ Esta conta está desativada. Contate o Narrador.";
                throw new Error("Conta inativa");
            }
            document.getElementById('fase-login-jogador').style.display = 'none';
            document.getElementById('fase-personagem').style.display = 'block';
        });
    })
    .catch((error) => {
        debug('Erro no login do jogador', error);
        msg.innerText = error.message.includes("Conta inativa") ? "❌ Esta conta está desativada. Contate o Narrador." : "❌ Login inválido.";
    });
}

// --- LÓGICA DE JOGO ---
function salvarNaNuvem() {
    if (!nomeJogador || !currentUser) return;
    set(ref(db, 'mesa_rpg/jogadores/' + nomeJogador), {
        mao: maoDoJogador,
        reserva: reservaDoJogador,
        slots: slotsFixos,
        ultimoAcesso: Date.now()
    }).catch((e) => console.error("Erro ao salvar:", e));

    set(ref(db, `mesa_rpg/accounts/${currentUser.uid}/email`), currentUser.email);
    set(ref(db, `mesa_rpg/accounts/${currentUser.uid}/characters/${nomeJogador}`), true);
}

async function carregarEstadoDaNuvem() {
    const dbRef = ref(db);
    try {
        const snapshot = await get(child(dbRef, `mesa_rpg/jogadores/${nomeJogador}`));
        if (snapshot.exists()) {
            const dados = snapshot.val();
            maoDoJogador = dados.mao || [];
            reservaDoJogador = dados.reserva || [];
            if (dados.slots) slotsFixos = dados.slots;
            renderizar();
            Object.keys(slotsFixos).forEach(key => {
                if (slotsFixos[key]) {
                    const div = document.getElementById(`slot-${key}`);
                    const imgOld = div.querySelector('img');
                    if(imgOld) imgOld.remove();
                    const img = document.createElement('img');
                    img.src = slotsFixos[key].caminho;
                    div.appendChild(img);
                    const btn = div.querySelector('.btn-limpar');
                    if(btn) btn.style.display = 'flex';
                }
            });
        }
    } catch (error) { console.error("Erro ao recuperar:", error); }
}

window.iniciarExperiencia = async function() {
    const input = document.getElementById('nome-personagem');
    if (!input.value.trim()) {
        alert("Nome do personagem obrigatório!");
        return;
    }
    nomeJogador = input.value.trim().toUpperCase();

    debug('Iniciando experiência', { nomeJogador });

    if(currentUser) {
        set(ref(db, `mesa_rpg/accounts/${currentUser.uid}/email`), currentUser.email);
        set(ref(db, `mesa_rpg/accounts/${currentUser.uid}/characters/${nomeJogador}`), true);
    }

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    setTimeout(() => document.getElementById('app-container').style.opacity = '1', 50);

    window.setVolume();
    if (audio) audio.play().catch(() => console.log("Audio waiting"));

    await carregarDados();
    await carregarEstadoDaNuvem();
}

window.toggleMusic = function() {
    if (!audio) return;
    const btn = document.getElementById('btn-music');
    if (audio.paused) { audio.play(); btn.innerText = "🔊"; }
    else { audio.pause(); btn.innerText = "🔇"; }
}

window.setVolume = function() {
    if (!audio) return;
    audio.volume = document.getElementById('volume').value;
}

async function carregarDados() {
    try {
        const r = await fetch('./lista_cartas.json');
        catalogoCartas = await r.json();
        debug('Cartas carregadas', { total: catalogoCartas.length });
    } catch (e) {
        console.error("JSON Error", e);
    }
}

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
        div.className = 'carta-modal lazy-card';
        div.dataset.src = carta.caminho;
        div.onclick = () => selecionarCarta(carta);
        grid.appendChild(div);
        imageObserver.observe(div);
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

function adicionarNaMao(carta) {
    if (maoDoJogador.length < LIMITE_MAO) {
        carta.tokens = 0;
        carta.estado = 'ativo';
        maoDoJogador.push(carta);
        renderizar();
        salvarNaNuvem();
    } else {
        if(confirm("Mão cheia. Enviar para a Reserva?")) {
            carta.tokens = 0;
            carta.estado = 'ativo';
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
    document.getElementById('label-token-qtd').innerText = c.tokens || 0;
    document.getElementById('decisao-modal').style.display = 'flex';
}

window.alterarToken = function(delta) {
    if(cartaEmTransitoIndex !== null && origemTransito === 'mao') {
        let card = maoDoJogador[cartaEmTransitoIndex];
        if(!card.tokens) card.tokens = 0;
        let novoValor = card.tokens + delta;
        if(novoValor < 0) novoValor = 0;
        if(novoValor > 5) novoValor = 5;
        card.tokens = novoValor;
        document.getElementById('label-token-qtd').innerText = card.tokens;
        renderizar();
        salvarNaNuvem();
    }
}

window.definirEstado = function(novoEstado) {
    if(cartaEmTransitoIndex !== null && origemTransito === 'mao') {
        let card = maoDoJogador[cartaEmTransitoIndex];
        card.estado = novoEstado;
        renderizar();
        salvarNaNuvem();
        window.fecharDecisao();
    }
}

window.confirmarEdicao = function() { window.fecharDecisao(); }

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

function renderizar() {
    const divMao = document.getElementById('cartas-mao');
    if (!divMao) return;
    divMao.innerHTML = '';
    maoDoJogador.forEach((c, i) => {
        const el = document.createElement('div');
        el.className = 'carta';
        el.style.backgroundImage = `url('${c.caminho}')`;
        const centro = (maoDoJogador.length - 1) / 2;
        const rotacao = (i - centro) * 4;
        el.style.transform = `rotate(${rotacao}deg)`;

        if(c.estado === 'curto') {
            el.classList.add('indisponivel');
            el.setAttribute('data-status', 'Indisponível: Descanso Curto');
        } else if(c.estado === 'longo') {
            el.classList.add('indisponivel');
            el.setAttribute('data-status', 'Indisponível: Descanso Longo');
        }

        if(c.tokens && c.tokens > 0) {
            const badge = document.createElement('div');
            badge.className = `token-badge token-${c.tokens}`;
            badge.innerText = c.tokens;
            el.appendChild(badge);
        }

        el.onclick = () => window.abrirDecisao(i);
        divMao.appendChild(el);
    });

    const divRes = document.getElementById('cartas-reserva');
    if (!divRes) return;
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

// 🔧 REMOVENDO onAuthStateChanged QUE CAUSAVA LOOP
debug('Script carregado - Sistema de debug ativo');

// Verifica se o audio existe antes de usar
if (audio) {
    audio.volume = 0.05;
}
