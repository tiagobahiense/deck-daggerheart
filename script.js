import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, child, remove, update, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, browserSessionPersistence, setPersistence, fetchSignInMethodsForEmail } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// Configuração do Firebase
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

// Configuração global
const EMAIL_MESTRE = "tgbahiense@gmail.com";
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

// Função de debug
function debug(mensagem, dados = null) {
    console.log(`🔍 DEBUG: ${mensagem}`, dados || '');
}

// Configuração do Lazy Load com parâmetros otimizados
const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const cardDiv = entry.target;
            const src = cardDiv.dataset.src;
            if (src) {
                cardDiv.style.backgroundImage = `url('${src}')`;
                cardDiv.classList.remove('lazy-card');
                imageObserver.unobserve(cardDiv);
            }
        }
    });
}, {
    root: null,
    rootMargin: '200px',
    threshold: 0.01
});

// Funções utilitárias
window.togglePassword = function(id) {
    const input = document.getElementById(id);
    if (input) input.type = input.type === "password" ? "text" : "password";
};

// Funções de login (mantidas como estavam)
window.fazerLoginNarrador = function() {
    const email = document.getElementById('narrador-email').value.trim().toLowerCase();
    const pass = document.getElementById('narrador-pass').value;
    const msg = document.getElementById('error-msg-narrador');

    if(!email || !pass) {
        msg.innerText = "Preencha email e senha.";
        return;
    }

    msg.innerText = "Autenticando...";

    signInWithEmailAndPassword(auth, email, pass)
    .then((userCredential) => {
        const emailLogado = userCredential.user.email.toLowerCase().trim();
        if(emailLogado === EMAIL_MESTRE.toLowerCase().trim()) {
            msg.innerText = "✅ Acesso concedido! Redirecionando...";
            setTimeout(() => window.location.href = 'admin.html', 500);
        } else {
            msg.innerText = `❌ Erro: ${emailLogado} não é narrador.`;
            signOut(auth);
        }
    })
    .catch((error) => {
        msg.innerText = "❌ Login inválido: " + error.message;
    });
};

window.fazerLoginJogador = function() {
    const email = document.getElementById('player-email').value.trim().toLowerCase();
    const pass = document.getElementById('player-pass').value;
    const msg = document.getElementById('error-msg-player');

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
        msg.innerText = error.message.includes("Conta inativa") ? "❌ Esta conta está desativada. Contate o Narrador." : "❌ Login inválido.";
    });
};

// Função para carregar as cartas do JSON
async function carregarDados() {
    try {
        const response = await fetch('./lista_cartas.json');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        catalogoCartas = await response.json();
        debug('Cartas carregadas com sucesso', { total: catalogoCartas.length });
        return catalogoCartas;
    } catch (error) {
        console.error("Erro ao carregar cartas:", error);
        alert("Erro ao carregar cartas. Verifique o console para mais detalhes.");
        return [];
    }
}

// Função para abrir o Grimório (corrigida)
window.abrirGrimorio = async function(tipo, slotDestino = null) {
    const modal = document.getElementById('grimorio-modal');
    const grid = document.getElementById('grid-cartas');
    const titulo = document.getElementById('modal-titulo');

    slotDestinoAtual = slotDestino;
    grid.innerHTML = '';

    // Garante que as cartas estão carregadas
    if (catalogoCartas.length === 0) {
        await carregarDados();
    }

    let lista = [];
    if (tipo === 'Geral') {
        titulo.innerText = "Grimório Principal";
        lista = catalogoCartas.filter(c => !['Classes','Ancestralidade','Comunidade'].includes(c.categoria));
    } else {
        titulo.innerText = `Selecionar: ${tipo}`;
        lista = catalogoCartas.filter(c => c.categoria === tipo);
    }

    debug(`Abrindo Grimório: ${tipo}`, { totalCartas: lista.length });

    if (lista.length === 0) {
        grid.innerHTML = '<p style="color: white; text-align: center;">Nenhuma carta encontrada.</p>';
    } else {
        lista.forEach(carta => {
            const div = document.createElement('div');
            div.className = 'carta-modal lazy-card';
            div.dataset.src = carta.caminho;
            div.style.backgroundImage = `url('img/card_back_placeholder.png')`; // Placeholder inicial
            div.onclick = () => selecionarCarta(carta);
            grid.appendChild(div);
            imageObserver.observe(div);
        });
    }

    modal.style.display = 'flex';
};

// Função para renderizar as cartas na mão do jogador (corrigida)
function renderizar() {
    const divMao = document.getElementById('cartas-mao');
    const divRes = document.getElementById('cartas-reserva');

    if (!divMao || !divRes) {
        debug("Elementos não encontrados para renderização");
        return;
    }

    // Renderiza mão do jogador
    divMao.innerHTML = '';
    maoDoJogador.forEach((carta, i) => {
        const el = document.createElement('div');
        el.className = 'carta';
        el.dataset.src = carta.caminho;
        el.style.backgroundImage = `url('img/card_back_placeholder.png')`; // Placeholder inicial

        const centro = (maoDoJogador.length - 1) / 2;
        const rotacao = (i - centro) * 4;
        el.style.transform = `rotate(${rotacao}deg)`;

        if (carta.estado === 'curto' || carta.estado === 'longo') {
            el.classList.add('indisponivel');
            el.setAttribute('data-status', carta.estado === 'curto' ? 'Indisponível: Descanso Curto' : 'Indisponível: Descanso Longo');
        }

        if (carta.tokens && carta.tokens > 0) {
            const badge = document.createElement('div');
            badge.className = `token-badge token-${carta.tokens}`;
            badge.innerText = carta.tokens;
            el.appendChild(badge);
        }

        el.onclick = () => window.abrirDecisao(i);
        divMao.appendChild(el);
        imageObserver.observe(el);
    });

    // Renderiza reserva
    divRes.innerHTML = '';
    divRes.style.opacity = reservaDoJogador.length ? '1' : '0';
    reservaDoJogador.forEach((carta, i) => {
        const el = document.createElement('div');
        el.className = 'carta-reserva';
        el.dataset.src = carta.caminho;
        el.style.backgroundImage = `url('img/card_back_placeholder.png')`; // Placeholder inicial
        el.onclick = () => window.resgatarReserva(i);
        divRes.appendChild(el);
        imageObserver.observe(el);
    });
}

// Função para iniciar a experiência do jogador
window.iniciarExperiencia = async function() {
    const input = document.getElementById('nome-personagem');
    if (!input.value.trim()) {
        alert("Nome do personagem obrigatório!");
        return;
    }
    nomeJogador = input.value.trim().toUpperCase();

    if (currentUser) {
        await set(ref(db, `mesa_rpg/accounts/${currentUser.uid}/email`), currentUser.email);
        await set(ref(db, `mesa_rpg/accounts/${currentUser.uid}/characters/${nomeJogador}`), true);
    }

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    setTimeout(() => document.getElementById('app-container').style.opacity = '1', 50);

    await carregarDados();
    await carregarEstadoDaNuvem();
    renderizar();
};

// Função para carregar o estado da nuvem
async function carregarEstadoDaNuvem() {
    try {
        const snapshot = await get(child(ref(db), `mesa_rpg/jogadores/${nomeJogador}`));
        if (snapshot.exists()) {
            const dados = snapshot.val();
            maoDoJogador = dados.mao || [];
            reservaDoJogador = dados.reserva || [];
            if (dados.slots) slotsFixos = dados.slots;
        }
    } catch (error) {
        console.error("Erro ao recuperar estado:", error);
    }
}

// Função para selecionar uma carta
function selecionarCarta(carta) {
    const destino = slotDestinoAtual;
    window.fecharGrimorio();
    slotDestinoAtual = null;
    if (destino) window.preencherSlotFixo(carta, destino);
    else adicionarNaMao(carta);
}

// Função para adicionar uma carta na mão
function adicionarNaMao(carta) {
    if (maoDoJogador.length < LIMITE_MAO) {
        carta.tokens = 0;
        carta.estado = 'ativo';
        maoDoJogador.push(carta);
    } else {
        if(confirm("Mão cheia. Enviar para a Reserva?")) {
            carta.tokens = 0;
            carta.estado = 'ativo';
            reservaDoJogador.push(carta);
        }
    }
    renderizar();
    salvarNaNuvem();
}

// Função para salvar na nuvem
function salvarNaNuvem() {
    if (!nomeJogador || !currentUser) return;
    set(ref(db, 'mesa_rpg/jogadores/' + nomeJogador), {
        mao: maoDoJogador,
        reserva: reservaDoJogador,
        slots: slotsFixos,
        ultimoAcesso: Date.now()
    }).catch((e) => console.error("Erro ao salvar:", e));
}

// Outras funções mantidas como estavam...
window.fecharGrimorio = function() {
    document.getElementById('grimorio-modal').style.display = 'none';
};

window.preencherSlotFixo = function(carta, idSlot) {
    slotsFixos[idSlot] = carta;
    salvarNaNuvem();
    const div = document.getElementById(`slot-${idSlot}`);
    if (div) {
        const imgOld = div.querySelector('img');
        if (imgOld) imgOld.remove();
        const img = document.createElement('img');
        img.src = carta.caminho;
        div.appendChild(img);
        const btn = div.querySelector('.btn-limpar');
        if (btn) btn.style.display = 'flex';
    }
};

window.limparSlot = function(idSlot, evt) {
    if (evt) evt.stopPropagation();
    slotsFixos[idSlot] = null;
    salvarNaNuvem();
    const div = document.getElementById(`slot-${idSlot}`);
    if (div) {
        const img = div.querySelector('img');
        if (img) img.remove();
        const btn = div.querySelector('.btn-limpar');
        if (btn) btn.style.display = 'none';
    }
};

// Funções de decisão de cartas
window.abrirDecisao = function(idx) {
    cartaEmTransitoIndex = idx;
    origemTransito = 'mao';
    const c = maoDoJogador[idx];
    const preview = document.getElementById('preview-decisao');
    if (preview) preview.style.backgroundImage = `url('${c.caminho}')`;
    const label = document.getElementById('label-token-qtd');
    if (label) label.innerText = c.tokens || 0;
    document.getElementById('decisao-modal').style.display = 'flex';
};

window.alterarToken = function(delta) {
    if (cartaEmTransitoIndex !== null && origemTransito === 'mao') {
        let card = maoDoJogador[cartaEmTransitoIndex];
        if (!card.tokens) card.tokens = 0;
        let novoValor = card.tokens + delta;
        if (novoValor < 0) novoValor = 0;
        if (novoValor > 5) novoValor = 5;
        card.tokens = novoValor;
        const label = document.getElementById('label-token-qtd');
        if (label) label.innerText = card.tokens;
        renderizar();
        salvarNaNuvem();
    }
};

window.definirEstado = function(novoEstado) {
    if (cartaEmTransitoIndex !== null && origemTransito === 'mao') {
        let card = maoDoJogador[cartaEmTransitoIndex];
        card.estado = novoEstado;
        renderizar();
        salvarNaNuvem();
        window.fecharDecisao();
    }
};

window.confirmarEdicao = function() { window.fecharDecisao(); };

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
};

window.moverParaReserva = function() {
    if (origemTransito === 'mao') {
        const c = maoDoJogador[cartaEmTransitoIndex];
        maoDoJogador.splice(cartaEmTransitoIndex, 1);
        reservaDoJogador.push(c);
        window.fecharDecisao();
        renderizar();
        salvarNaNuvem();
    }
};

window.devolverAoDeck = function() {
    if (origemTransito === 'mao') {
        maoDoJogador.splice(cartaEmTransitoIndex, 1);
        window.fecharDecisao();
        renderizar();
        salvarNaNuvem();
    }
};

window.fecharDecisao = function() {
    document.getElementById('decisao-modal').style.display = 'none';
    cartaEmTransitoIndex = null;
};

// Inicialização
debug('Script carregado - Sistema de debug ativo');
