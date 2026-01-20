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
let cartaDaReservaParaResgatar = null; // Rastreia qual carta da reserva está sendo resgatada
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
            if (src && src.trim()) {
                const img = new Image();
                img.onload = () => {
                    cardDiv.style.backgroundImage = `url('${src}')`;
                    cardDiv.classList.remove('lazy-card');
                    imageObserver.unobserve(cardDiv);
                };
                img.onerror = () => {
                    console.warn(`Erro ao carregar imagem: ${src}`);
                    // Usa cor de fundo em caso de erro
                    cardDiv.style.backgroundColor = '#2a2a2a';
                    cardDiv.classList.remove('lazy-card');
                    imageObserver.unobserve(cardDiv);
                };
                img.src = src;
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

// Funções de modal (declaradas cedo para evitar problemas de escopo)
window.fecharGrimorio = function() {
    const modal = document.getElementById('grimorio-modal');
    if (modal) modal.style.display = 'none';
};

window.fecharReserva = function() {
    const modal = document.getElementById('reserva-modal');
    if (modal) modal.style.display = 'none';
};

window.fecharDecisao = function() {
    const modal = document.getElementById('decisao-modal');
    if (modal) modal.style.display = 'none';
    cartaEmTransitoIndex = null;
    origemTransito = null;
};

window.abrirReserva = function() {
    const modal = document.getElementById('reserva-modal');
    const grid = document.getElementById('grid-reserva');
    grid.innerHTML = '';
    
    if (reservaDoJogador.length === 0) {
        grid.innerHTML = '<p style="color: #aaa; text-align: center; grid-column: 1/-1;">Nenhuma carta em reserva</p>';
    } else {
        reservaDoJogador.forEach(carta => {
            const div = document.createElement('div');
            div.className = 'carta-modal lazy-card';
            div.dataset.src = carta.caminho;
            div.style.backgroundColor = '#1a1a1a';
            div.onclick = () => {
                window.fecharReserva();
                window.abrirDecisaoReserva(reservaDoJogador.indexOf(carta));
            };
            grid.appendChild(div);
            imageObserver.observe(div);
        });
    }
    
    if (modal) modal.style.display = 'flex';
};

window.abrirDecisaoReserva = function(idx) {
    if (idx === null || idx === undefined || !reservaDoJogador[idx]) {
        console.error('Índice de carta em reserva inválido:', idx);
        return;
    }
    cartaEmTransitoIndex = idx;
    origemTransito = 'reserva';
    const c = reservaDoJogador[idx];
    
    // Mostra botões corretos para carta da reserva
    document.getElementById('btn-usar-carta').style.display = 'none';
    document.getElementById('btn-para-reserva').style.display = 'none';
    document.getElementById('btn-devolver-mao').style.display = 'inline-block';
    document.getElementById('btn-devolver-deck').style.display = 'none';
    
    const preview = document.getElementById('preview-decisao');
    if (preview) {
        preview.style.backgroundImage = `url('${c.caminho}')`;
        preview.innerHTML = '';
        
        // Adiciona ícone de descanso se aplicável (apenas um)
        if (c.estado === 'curto' || c.estado === 'longo') {
            const iconoDiv = document.createElement('div');
            iconoDiv.className = c.estado === 'curto' ? 'icone-descanso icone-descanso-curto' : 'icone-descanso icone-descanso-longo';
            
            const img = document.createElement('img');
            img.src = c.estado === 'curto' ? 'img/meia-lua.png' : 'img/lua-cheia.png';
            img.alt = c.estado === 'curto' ? 'Descanso Curto' : 'Descanso Longo';
            iconoDiv.appendChild(img);
            preview.appendChild(iconoDiv);
            preview.style.filter = 'grayscale(1) brightness(0.7)';
        } else {
            preview.style.filter = 'none';
        }
    }
    const label = document.getElementById('label-token-qtd');
    if (label) label.innerText = c.tokens || 0;
    const modal = document.getElementById('decisao-modal');
    if (modal) modal.style.display = 'flex';
};

// Funções de navegação entre telas de login
window.irParaLoginJogador = function() {
    document.getElementById('fase-selecao').style.display = 'none';
    document.getElementById('fase-login-jogador').style.display = 'block';
};

window.irParaLoginNarrador = function() {
    document.getElementById('fase-selecao').style.display = 'none';
    document.getElementById('fase-login-narrador').style.display = 'block';
};

window.voltarParaSelecao = function() {
    document.getElementById('fase-login-jogador').style.display = 'none';
    document.getElementById('fase-login-narrador').style.display = 'none';
    document.getElementById('fase-personagem').style.display = 'none';
    document.getElementById('fase-selecao').style.display = 'block';
};

window.forcarLogout = function() {
    signOut(auth).then(() => {
        currentUser = null;
        nomeJogador = "";
        maoDoJogador = [];
        reservaDoJogador = [];
        document.getElementById('login-screen').style.display = 'block';
        document.getElementById('app-container').style.display = 'none';
        window.voltarParaSelecao();
    }).catch((error) => console.error("Erro ao fazer logout:", error));
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
            div.style.backgroundColor = '#1a1a1a';
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
        el.className = 'carta lazy-card';
        el.dataset.src = carta.caminho;
        el.style.backgroundColor = '#1a1a1a';

        const centro = (maoDoJogador.length - 1) / 2;
        const rotacao = (i - centro) * 4;
        el.style.transform = `rotate(${rotacao}deg)`;

        if (carta.estado === 'curto' || carta.estado === 'longo') {
            el.classList.add('indisponivel');
            el.setAttribute('data-status', carta.estado === 'curto' ? 'Indisponível: Descanso Curto' : 'Indisponível: Descanso Longo');
            debug(`Carta em descanso: ${carta.nome || 'sem nome'} - Estado: ${carta.estado}`);
            
            // Adiciona ícone de descanso (apenas um)
            const iconoDiv = document.createElement('div');
            iconoDiv.className = carta.estado === 'curto' ? 'icone-descanso icone-descanso-curto' : 'icone-descanso icone-descanso-longo';
            
            const img = document.createElement('img');
            img.src = carta.estado === 'curto' ? 'img/meia-lua.png' : 'img/lua-cheia.png';
            img.alt = carta.estado === 'curto' ? 'Descanso Curto' : 'Descanso Longo';
            iconoDiv.appendChild(img);
            el.appendChild(iconoDiv);
        }

        if (carta.tokens && carta.tokens > 0) {
            const badge = document.createElement('div');
            badge.className = `token-badge token-${carta.tokens}`;
            badge.innerText = carta.tokens;
            el.appendChild(badge);
        }

        el.onclick = () => {
            if (typeof window.abrirDecisao === 'function') {
                window.abrirDecisao(i);
            }
        };
        divMao.appendChild(el);
        imageObserver.observe(el);
    });

    // Renderiza reserva como container clicável com modal
    divRes.innerHTML = '';
    divRes.style.opacity = reservaDoJogador.length ? '1' : '0.3';
    
    if (reservaDoJogador.length > 0) {
        // Cria um container que mostra a pilha de cartas
        const container = document.createElement('div');
        container.className = 'reserva-container';
        container.style.position = 'relative';
        container.style.width = '100%';
        container.style.height = '100%';
        container.style.cursor = 'pointer';
        
        // Mostra as primeiras cartas da reserva com efeito de sobreposição
        for (let i = 0; i < Math.min(3, reservaDoJogador.length); i++) {
            const carta = reservaDoJogador[i];
            const cartaEl = document.createElement('div');
            cartaEl.className = 'carta-reserva-stacked lazy-card';
            cartaEl.dataset.src = carta.caminho;
            cartaEl.style.backgroundColor = '#1a1a1a';
            cartaEl.style.position = 'absolute';
            cartaEl.style.width = '100%';
            cartaEl.style.height = '100%';
            cartaEl.style.top = `${i * 4}px`;
            cartaEl.style.left = `${i * 4}px`;
            cartaEl.style.zIndex = i;
            cartaEl.style.pointerEvents = 'none'; // Não interfere com cliques
            
            container.appendChild(cartaEl);
            imageObserver.observe(cartaEl);
        }
        
        // Rótulo de quantidade
        if (reservaDoJogador.length > 0) {
            const label = document.createElement('div');
            label.style.position = 'absolute';
            label.style.bottom = '8px';
            label.style.right = '8px';
            label.style.backgroundColor = 'rgba(218, 165, 32, 0.9)';
            label.style.color = '#fff';
            label.style.padding = '4px 8px';
            label.style.borderRadius = '4px';
            label.style.fontSize = '12px';
            label.style.fontWeight = 'bold';
            label.style.zIndex = '10';
            label.innerText = `${reservaDoJogador.length}`;
            container.appendChild(label);
        }
        
        // Abre modal ao clicar
        container.onclick = () => {
            if (typeof window.abrirReserva === 'function') {
                window.abrirReserva();
            }
        };
        
        divRes.appendChild(container);
    }
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
    monitorarEstadoEmTempoReal();
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

// Função para monitorar mudanças em tempo real
function monitorarEstadoEmTempoReal() {
    if (!nomeJogador) return;
    
    const jogadorRef = child(ref(db), `mesa_rpg/jogadores/${nomeJogador}`);
    onValue(jogadorRef, (snapshot) => {
        if (snapshot.exists()) {
            const dados = snapshot.val();
            maoDoJogador = dados.mao || [];
            reservaDoJogador = dados.reserva || [];
            if (dados.slots) slotsFixos = dados.slots;
            debug('📡 Estado atualizado em tempo real', { mao: maoDoJogador.length, reserva: reservaDoJogador.length });
            renderizar();
        }
    }, (error) => {
        console.error('Erro ao monitorar estado:', error);
    });
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
    if (idx === null || idx === undefined || !maoDoJogador[idx]) {
        console.error('Índice de carta inválido:', idx);
        return;
    }
    cartaEmTransitoIndex = idx;
    origemTransito = 'mao';
    const c = maoDoJogador[idx];
    
    // Mostra botões corretos para carta da mão
    document.getElementById('btn-usar-carta').style.display = 'inline-block';
    document.getElementById('btn-para-reserva').style.display = 'inline-block';
    document.getElementById('btn-devolver-mao').style.display = 'none';
    document.getElementById('btn-devolver-deck').style.display = 'inline-block';
    
    const preview = document.getElementById('preview-decisao');
    if (preview) {
        preview.style.backgroundImage = `url('${c.caminho}')`;
        preview.innerHTML = ''; // Limpa ícones anteriores
        
        // Adiciona ícone de descanso se aplicável (apenas um)
        if (c.estado === 'curto' || c.estado === 'longo') {
            const iconoDiv = document.createElement('div');
            iconoDiv.className = c.estado === 'curto' ? 'icone-descanso icone-descanso-curto' : 'icone-descanso icone-descanso-longo';
            
            const img = document.createElement('img');
            img.src = c.estado === 'curto' ? 'img/meia-lua.png' : 'img/lua-cheia.png';
            img.alt = c.estado === 'curto' ? 'Descanso Curto' : 'Descanso Longo';
            iconoDiv.appendChild(img);
            preview.appendChild(iconoDiv);
            preview.style.filter = 'grayscale(1) brightness(0.7)';
        } else {
            preview.style.filter = 'none';
        }
    }
    const label = document.getElementById('label-token-qtd');
    if (label) label.innerText = c.tokens || 0;
    const modal = document.getElementById('decisao-modal');
    if (modal) modal.style.display = 'flex';
};

window.alterarToken = function(delta) {
    if (cartaEmTransitoIndex !== null && cartaEmTransitoIndex !== undefined && origemTransito === 'mao') {
        const card = maoDoJogador[cartaEmTransitoIndex];
        if (!card) return;
        if (!card.tokens) card.tokens = 0;
        let novoValor = card.tokens + delta;
        if (novoValor < 0) novoValor = 0;
        if (novoValor > 5) novoValor = 5;
        card.tokens = novoValor;
        const label = document.getElementById('label-token-qtd');
        if (label) label.innerText = card.tokens;
        salvarNaNuvem();
    }
};

window.definirEstado = function(novoEstado) {
    if (cartaEmTransitoIndex !== null && origemTransito === 'mao') {
        let card = maoDoJogador[cartaEmTransitoIndex];
        card.estado = novoEstado;
        debug(`Estado alterado para: ${novoEstado}`, card);
        
        // Atualiza o preview para mostrar feedback visual
        const preview = document.getElementById('preview-decisao');
        if (preview) {
            preview.innerHTML = ''; // Limpa ícones anteriores
            
            if (novoEstado === 'curto' || novoEstado === 'longo') {
                const iconoDiv = document.createElement('div');
                iconoDiv.className = novoEstado === 'curto' ? 'icone-descanso icone-descanso-curto' : 'icone-descanso icone-descanso-longo';
                
                const img = document.createElement('img');
                img.src = novoEstado === 'curto' ? 'img/meia-lua.png' : 'img/lua-cheia.png';
                img.alt = novoEstado === 'curto' ? 'Descanso Curto' : 'Descanso Longo';
                iconoDiv.appendChild(img);
                preview.appendChild(iconoDiv);
                preview.style.filter = 'grayscale(1) brightness(0.7)';
            } else {
                preview.style.filter = 'none';
            }
        }
        salvarNaNuvem();
    }
};

window.confirmarEdicao = function() { 
    debug('Confirmando edição - renderizando cartas');
    renderizar();
    window.fecharDecisao(); 
};

window.usarCarta = function() {
    if (cartaEmTransitoIndex === null || origemTransito !== 'mao') return;
    
    const carta = maoDoJogador[cartaEmTransitoIndex];
    const cartaAnimada = document.getElementById('carta-tabuleiro-animada');
    
    // Configura a carta animada
    cartaAnimada.style.backgroundImage = `url('${carta.caminho}')`;
    cartaAnimada.style.display = 'block';
    
    // Posiciona no canto inferior esquerdo (onde está a mão)
    const maoArea = document.getElementById('mao-area');
    const rect = maoArea.getBoundingClientRect();
    cartaAnimada.style.left = (rect.left + rect.width / 4) + 'px';
    cartaAnimada.style.top = (rect.top - 100) + 'px';
    
    // Calcula o deslocamento para o centro da tela
    const centerX = window.innerWidth / 2 - 100; // -100 porque a carta tem 200px
    const centerY = window.innerHeight / 2 - 150; // -150 porque a carta tem 300px
    
    const dx = centerX - (rect.left + rect.width / 4);
    const dy = centerY - (rect.top - 100);
    
    // Define variáveis CSS para a animação
    cartaAnimada.style.setProperty('--dx', dx + 'px');
    cartaAnimada.style.setProperty('--dy', dy + 'px');
    
    // Remove classe anterior se existir
    cartaAnimada.classList.remove('ativa');
    
    // Força o reflow para resetar a animação
    void cartaAnimada.offsetWidth;
    
    // Adiciona a classe que dispara a animação
    cartaAnimada.classList.add('ativa');
    
    // Fecha o modal após a animação
    setTimeout(() => {
        window.fecharDecisao();
        cartaAnimada.style.display = 'none';
        cartaAnimada.classList.remove('ativa');
    }, 2500);
};

window.resgatarReserva = function(idx) {
    const cartaDaReserva = reservaDoJogador[idx];
    
    // Reseta tokens e estado da carta
    cartaDaReserva.tokens = 0;
    cartaDaReserva.estado = 'ativo';
    
    if (maoDoJogador.length < LIMITE_MAO) {
        // Há espaço na mão - adiciona normalmente
        maoDoJogador.push(cartaDaReserva);
        reservaDoJogador.splice(idx, 1);
        window.fecharReserva();
        renderizar();
        salvarNaNuvem();
    } else {
        // Mão cheia - abre modal de troca
        cartaDaReservaParaResgatar = { carta: cartaDaReserva, indiceReserva: idx };
        window.mostrarModalTroca();
    }
};

window.mostrarModalTroca = function() {
    const modal = document.getElementById('troca-modal');
    const grid = document.getElementById('grid-troca');
    grid.innerHTML = '';
    
    maoDoJogador.forEach((carta, idx) => {
        const div = document.createElement('div');
        div.className = 'carta-modal lazy-card';
        div.dataset.src = carta.caminho;
        div.style.backgroundColor = '#1a1a1a';
        div.style.cursor = 'pointer';
        div.style.border = '2px solid #333';
        div.style.transition = 'all 0.3s';
        
        div.onmouseover = () => {
            div.style.borderColor = 'var(--gold)';
            div.style.boxShadow = '0 0 15px rgba(212, 175, 55, 0.6)';
        };
        div.onmouseout = () => {
            div.style.borderColor = '#333';
            div.style.boxShadow = 'none';
        };
        
        div.onclick = () => window.confirmarTroca(idx);
        grid.appendChild(div);
        imageObserver.observe(div);
    });
    
    if (modal) modal.style.display = 'flex';
};

window.confirmarTroca = function(idxMao) {
    if (!cartaDaReservaParaResgatar) return;
    
    const cartaDescartada = maoDoJogador[idxMao];
    
    // Troca as cartas
    maoDoJogador[idxMao] = cartaDaReservaParaResgatar.carta;
    reservaDoJogador[cartaDaReservaParaResgatar.indiceReserva] = cartaDescartada;
    
    // Reseta variáveis
    cartaDaReservaParaResgatar = null;
    
    window.cancelarTroca();
    renderizar();
    salvarNaNuvem();
};

window.cancelarTroca = function() {
    const modal = document.getElementById('troca-modal');
    if (modal) modal.style.display = 'none';
    cartaDaReservaParaResgatar = null;
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

window.devolverParaMao = function() {
    if (origemTransito === 'reserva') {
        const cartaDaReserva = reservaDoJogador[cartaEmTransitoIndex];
        
        // Reseta tokens e estado da carta
        cartaDaReserva.tokens = 0;
        cartaDaReserva.estado = 'ativo';
        
        if (maoDoJogador.length < LIMITE_MAO) {
            // Há espaço na mão - adiciona normalmente
            maoDoJogador.push(cartaDaReserva);
            reservaDoJogador.splice(cartaEmTransitoIndex, 1);
            window.fecharDecisao();
            window.fecharReserva();
            renderizar();
            salvarNaNuvem();
        } else {
            // Mão cheia - abre modal de troca
            cartaDaReservaParaResgatar = { carta: cartaDaReserva, indiceReserva: cartaEmTransitoIndex };
            window.fecharDecisao();
            window.mostrarModalTroca();
        }
    }
};

// Funções de áudio
window.toggleMusic = function() {
    const audio = document.getElementById('bg-music');
    const btn = document.getElementById('btn-music');
    if (audio.paused) {
        audio.play();
        btn.innerText = '🔊';
    } else {
        audio.pause();
        btn.innerText = '🔇';
    }
};

window.setVolume = function() {
    const audio = document.getElementById('bg-music');
    const vol = document.getElementById('volume');
    audio.volume = parseFloat(vol.value);
};

// Inicialização
debug('Script carregado - Sistema de debug ativo');
