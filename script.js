import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, child, remove, update, onValue, onDisconnect, push, query, limitToLast, onChildAdded } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";
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

// Persistência de sessão
setPersistence(auth, browserSessionPersistence).catch(console.error);

// === CORREÇÃO 1: EXPORTAR FUNÇÕES DO FIREBASE PARA DADOS.JS ===
window.db = db; window.ref = ref; window.set = set; window.get = get;
window.remove = remove; window.onValue = onValue; window.onDisconnect = onDisconnect;
window.push = push; window.query = query; window.limitToLast = limitToLast; window.onChildAdded = onChildAdded;
// =============================================================

// Configuração global
const EMAIL_MESTRE = "tgbahiense@gmail.com";
let currentUser = null;
let nomeJogador = "";
let catalogoCartas = []; 
let catalogoCartasClasses = []; 
let maoDoJogador = [];
let reservaDoJogador = [];
let slotsFixos = { 'Ancestralidade': null, 'Comunidade': null, 'Fundamental': null, 'Especializacao': null, 'Maestria': null };
let cartaEmTransitoIndex = null;
let origemTransito = null;
let slotDestinoAtual = null;
let cartaDaReservaParaResgatar = null;
const LIMITE_MAO = 5;

// Função de debug
function debug(mensagem, dados = null) { console.log(`🔍 DEBUG: ${mensagem}`, dados || ''); }

// Observer Lazy Load
const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const cardDiv = entry.target;
            const src = cardDiv.dataset.src;
            if (src && src.trim()) {
                const img = new Image();
                img.onload = () => { cardDiv.style.backgroundImage = `url('${src}')`; cardDiv.classList.remove('lazy-card'); imageObserver.unobserve(cardDiv); };
                img.onerror = () => { cardDiv.style.backgroundColor = '#2a2a2a'; cardDiv.classList.remove('lazy-card'); imageObserver.unobserve(cardDiv); };
                img.src = src;
            }
        }
    });
}, { root: null, rootMargin: '200px', threshold: 0.01 });

window.togglePassword = function(id) { const input = document.getElementById(id); if (input) input.type = input.type === "password" ? "text" : "password"; };

// Funções de Modal
window.fecharGrimorio = function() { const modal = document.getElementById('grimorio-modal'); if (modal) modal.style.display = 'none'; };
window.fecharReserva = function() { const modal = document.getElementById('reserva-modal'); if (modal) modal.style.display = 'none'; };
window.fecharDecisao = function() { const modal = document.getElementById('decisao-modal'); if (modal) modal.style.display = 'none'; cartaEmTransitoIndex = null; origemTransito = null; };

// Login Navigation
window.irParaLoginJogador = function() { document.getElementById('fase-selecao').style.display = 'none'; document.getElementById('fase-login-jogador').style.display = 'block'; };
window.irParaLoginNarrador = function() { document.getElementById('fase-selecao').style.display = 'none'; document.getElementById('fase-login-narrador').style.display = 'block'; };
window.voltarParaSelecao = function() { document.getElementById('fase-login-jogador').style.display = 'none'; document.getElementById('fase-login-narrador').style.display = 'none'; document.getElementById('fase-personagem').style.display = 'none'; document.getElementById('fase-selecao').style.display = 'block'; };

window.forcarLogout = function() {
    signOut(auth).then(() => {
        currentUser = null; nomeJogador = ""; maoDoJogador = []; reservaDoJogador = [];
        if (window.presencaInterval) clearInterval(window.presencaInterval);
        if (typeof window.desativarProfissao === 'function') window.desativarProfissao();
        document.getElementById('login-screen').style.display = 'block';
        document.getElementById('app-container').style.display = 'none';
        window.voltarParaSelecao();
    });
};

// Login Narrador
window.fazerLoginNarrador = function() {
    const email = document.getElementById('narrador-email').value.trim().toLowerCase();
    const pass = document.getElementById('narrador-pass').value;
    const msg = document.getElementById('error-msg-narrador');
    if(!email || !pass) { msg.innerText = "Preencha email e senha."; return; }
    signInWithEmailAndPassword(auth, email, pass).then((uc) => {
        if(uc.user.email.toLowerCase().trim() === EMAIL_MESTRE.toLowerCase().trim()) {
            msg.innerText = "✅ Acesso concedido!"; setTimeout(() => window.location.href = 'admin.html', 500);
        } else { msg.innerText = `❌ ${email} não é narrador.`; signOut(auth); }
    }).catch((e) => msg.innerText = "❌ Erro: " + e.message);
};

// Login Jogador
window.fazerLoginJogador = function() {
    const email = document.getElementById('player-email').value.trim().toLowerCase();
    const pass = document.getElementById('player-pass').value;
    const msg = document.getElementById('error-msg-player');
    if(email === EMAIL_MESTRE.toLowerCase().trim()) { msg.innerText = "❌ Mestre não loga aqui."; return; }
    if(!email || !pass) { msg.innerText = "Preencha tudo."; return; }

    signInWithEmailAndPassword(auth, email, pass).then((uc) => {
        currentUser = uc.user;
        get(ref(db, `mesa_rpg/accounts/${currentUser.uid}/status`)).then(snap => {
            if (snap.exists() && snap.val() === 'inactive') { signOut(auth); throw new Error("Conta inativa"); }
            document.getElementById('fase-login-jogador').style.display = 'none';
            document.getElementById('fase-personagem').style.display = 'block';
            carregarListaPersonagens();
        });
    }).catch((e) => msg.innerText = e.message.includes("Conta inativa") ? "❌ Conta desativada." : "❌ Login inválido.");
};

// Carregar Dados
async function carregarDados() {
    try {
        const [r1, r2] = await Promise.all([fetch('./lista_cartas.json'), fetch('./lista_cartas_v2.json')]);
        if (r1.ok) catalogoCartas = await r1.json();
        if (r2.ok) { const v2 = await r2.json(); catalogoCartasClasses = Array.isArray(v2) ? v2.filter(c => c.categoria === 'Classes' && c.profissao) : []; }
        return catalogoCartas;
    } catch (e) { console.error("Erro loading cards", e); return []; }
}

// Abrir Grimório
window.abrirGrimorio = async function(tipo, slotDestino = null) {
    const modal = document.getElementById('grimorio-modal');
    const grid = document.getElementById('grid-cartas');
    const titulo = document.getElementById('modal-titulo');
    slotDestinoAtual = slotDestino;
    grid.innerHTML = '';

    if (catalogoCartas.length === 0) await carregarDados();

    let lista = [];
    if (tipo === 'Geral') {
        titulo.innerText = "Grimório Principal";
        lista = catalogoCartas.filter(c => !['Classes','Ancestralidade','Comunidade'].includes(c.categoria));
    } else if (tipo === 'Classes') {
        const prof = localStorage.getItem('profissaoSelecionada');
        titulo.innerText = prof ? `Cartas de ${prof}` : "Classes";
        lista = catalogoCartasClasses.filter(c => !prof || c.profissao === prof);
        if(slotDestinoAtual && ['Fundamental', 'Especializacao', 'Maestria'].includes(slotDestinoAtual)) {
            const prefixo = slotDestinoAtual === 'Especializacao' ? ['Especialização -', 'Especializacao -'] : [`${slotDestinoAtual} -`];
            lista = lista.filter(c => prefixo.some(pref => c.nome.startsWith(pref) || c.caminho.includes(pref.replace(' -',''))));
        }
    } else {
        titulo.innerText = `Selecionar: ${tipo}`;
        lista = catalogoCartas.filter(c => c.categoria === tipo);
    }

    lista.forEach(carta => {
        const div = document.createElement('div');
        div.className = 'carta-modal lazy-card';
        div.dataset.src = carta.caminho;
        div.style.backgroundColor = '#1a1a1a';
        div.onclick = () => selecionarCarta(carta);
        div.onmouseenter = () => { const p = document.getElementById('hover-preview-modal'); if(p) { p.style.display='block'; p.style.backgroundImage=`url('${carta.caminho}')`; }};
        div.onmouseleave = () => { const p = document.getElementById('hover-preview-modal'); if(p) p.style.display='none'; };
        grid.appendChild(div);
        imageObserver.observe(div);
    });
    modal.style.display = 'flex';
};

// ... (Mantenha as importações iguais) ...

// ... (Mantenha as configurações iniciais iguais até a função renderizar) ...

// Função para renderizar as cartas (ATUALIZADA PARA CORRIGIR RESERVA)
function renderizar() {
    const divMao = document.getElementById('cartas-mao');
    const divRes = document.getElementById('cartas-reserva');

    if (!divMao || !divRes) return;

    renderizarSlots(); 

    // MÃO
    divMao.innerHTML = '';
    maoDoJogador.forEach((carta, i) => {
        const el = document.createElement('div');
        el.className = 'carta lazy-card';
        el.dataset.src = carta.caminho;
        el.style.backgroundColor = '#1a1a1a';
        
        // Fallback: se a imagem falhar, mostra o nome
        const nomeFallback = document.createElement('div');
        nomeFallback.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:#666; font-size:0.7rem; text-align:center; width:90%; pointer-events:none; z-index:0;";
        nomeFallback.innerText = carta.nome || "Carta";
        el.appendChild(nomeFallback);

        const centro = (maoDoJogador.length - 1) / 2;
        const rotacao = (i - centro) * 4;
        el.style.transform = `rotate(${rotacao}deg)`;

        if (carta.estado === 'curto' || carta.estado === 'longo') {
            el.classList.add('indisponivel');
            const iconoDiv = document.createElement('div');
            iconoDiv.className = carta.estado === 'curto' ? 'icone-descanso icone-descanso-curto' : 'icone-descanso icone-descanso-longo';
            const img = document.createElement('img');
            img.src = carta.estado === 'curto' ? 'img/meia-lua.png' : 'img/lua-cheia.png';
            iconoDiv.appendChild(img);
            el.appendChild(iconoDiv);
        }

        if (carta.tokens > 0) {
            const badge = document.createElement('div');
            badge.className = `token-badge token-${carta.tokens}`;
            badge.innerText = carta.tokens;
            el.appendChild(badge);
        }

        el.onmouseenter = function() {
            const preview = document.getElementById('hover-preview');
            if (preview && carta.caminho) {
                preview.style.display = 'block';
                preview.style.backgroundImage = `url('${carta.caminho}')`;
            }
        };
        el.onmouseleave = function() { if (document.getElementById('hover-preview')) document.getElementById('hover-preview').style.display = 'none'; };
        
        el.onclick = () => { if (window.abrirDecisao) window.abrirDecisao(i); };
        divMao.appendChild(el);
        imageObserver.observe(el);
    });

    // RESERVA (CORREÇÃO VISUAL)
    divRes.innerHTML = '';
    divRes.style.opacity = reservaDoJogador.length ? '1' : '0.3';
    
    if (reservaDoJogador.length > 0) {
        const container = document.createElement('div');
        container.className = 'reserva-container';
        container.style.cssText = 'position: relative; width: 100%; height: 100%; cursor: pointer;';
        
        // Lógica: Mostra as últimas 3 cartas (topo da pilha)
        // Se a carta é a última do array (índice length-1), ela tem que ficar no topo visual (z-index maior)
        const total = reservaDoJogador.length;
        const mostrar = Math.min(3, total);
        
        for (let i = 0; i < mostrar; i++) {
            // Pega do final para o começo (LIFO - Last In First Out visual)
            const indexReal = total - 1 - i;
            const carta = reservaDoJogador[indexReal];
            
            const cartaEl = document.createElement('div');
            cartaEl.className = 'carta-reserva-stacked lazy-card';
            cartaEl.dataset.src = carta.caminho;
            
            // Estilo para garantir que cubra o cinza
            cartaEl.style.cssText = `
                background-color: #1a1a1a;
                position: absolute;
                width: 100%; height: 100%;
                top: ${i * 2}px; left: ${i * 2}px; /* Deslocamento leve */
                z-index: ${mostrar - i}; /* A primeira do loop (ultima carta real) fica com z-index maior */
                border: 1px solid #444;
                border-radius: 6px;
                box-shadow: 2px 2px 5px rgba(0,0,0,0.5);
                pointer-events: none;
                background-size: cover;
                background-position: center;
            `;
            
            // Fallback de texto caso a imagem falhe (para não ficar só cinza)
            const fallbackText = document.createElement('span');
            fallbackText.innerText = carta.nome ? carta.nome.split('-')[1] || carta.nome : "Carta";
            fallbackText.style.cssText = "position:absolute; top:40%; left:5px; right:5px; text-align:center; color:#555; font-size:0.6rem; z-index:-1;";
            cartaEl.appendChild(fallbackText);

            container.appendChild(cartaEl);
            imageObserver.observe(cartaEl);
        }
        
        const label = document.createElement('div');
        label.style.cssText = 'position:absolute; bottom:-5px; right:-5px; background:var(--gold); color:#000; padding:2px 6px; border-radius:4px; font-weight:bold; z-index:100; font-size:0.8rem; box-shadow:0 0 5px black;';
        label.innerText = total;
        container.appendChild(label);
        
        container.onclick = () => { if (window.abrirReserva) window.abrirReserva(); };
        divRes.appendChild(container);
    }
    
    if (typeof window.monitorarClasseFundamental === 'function') window.monitorarClasseFundamental();
}


window.renderizar = renderizar;

// Carregar Lista de Personagens
async function carregarListaPersonagens() {
    const lista = document.getElementById('lista-personagens');
    try {
        const snap = await get(ref(db, `mesa_rpg/accounts/${currentUser.uid}`));
        if(snap.exists() && snap.val().characters) {
            lista.innerHTML = '<div style="display:flex;flex-direction:column;gap:10px;"></div>';
            const container = lista.querySelector('div');
            for(const nome of Object.keys(snap.val().characters)) {
                const safe = nome.replace(/'/g, "\\'");
                const slotSnap = await get(ref(db, `mesa_rpg/jogadores/${nome}/slots/Fundamental`));
                let tag = '';
                if(slotSnap.exists() && slotSnap.val().profissao) tag = `<span style="background:rgba(212,175,55,0.3);color:var(--gold);padding:3px 8px;border-radius:4px;font-size:0.75rem;margin-left:8px;border:1px solid rgba(212,175,55,0.6);font-weight:bold;">${slotSnap.val().profissao}</span>`;
                
                container.innerHTML += `<button class="btn-personagem" onclick="selecionarPersonagem('${safe}')" style="width:100%;padding:15px;background:rgba(212,175,55,0.1);border:2px solid rgba(212,175,55,0.3);border-radius:8px;color:#fff;font-size:1.1rem;cursor:pointer;text-align:left;font-family:'MedievalSharp',cursive;">${nome}${tag}</button>`;
            }
        } else { lista.innerHTML = '<p style="color:#888;text-align:center;">Nenhum personagem.</p>'; }
    } catch(e) { console.error(e); lista.innerHTML = '<p>Erro ao carregar.</p>'; }
}

// Selecionar Personagem (COM PRESENÇA/HEARTBEAT ADICIONADO)
window.selecionarPersonagem = async function(charName) {
    nomeJogador = charName.toUpperCase();
    if(typeof window !== 'undefined') window.nomeJogador = nomeJogador;

    // Heartbeat System
    if(window.presencaInterval) clearInterval(window.presencaInterval);
    const registrarPresenca = () => { 
        if(nomeJogador) { 
            const pRef = ref(db, `mesa_rpg/presenca/${nomeJogador}`); 
            set(pRef, true); 
            onDisconnect(pRef).remove(); 
        } 
    };
    registrarPresenca();
    window.presencaInterval = setInterval(registrarPresenca, 30000);

    const slotSnap = await get(ref(db, `mesa_rpg/jogadores/${nomeJogador}/slots/Fundamental`));
    const temClasse = slotSnap.exists() && slotSnap.val().profissao;

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    setTimeout(() => document.getElementById('app-container').style.opacity = '1', 50);

    const audio = document.getElementById('bg-music');
    if(audio) { audio.volume = 0.05; audio.play().catch(e => console.warn(e)); }

    await carregarDados();
    
    // Carrega estado
    const pSnap = await get(child(ref(db), `mesa_rpg/jogadores/${nomeJogador}`));
    if(pSnap.exists()) { const d = pSnap.val(); maoDoJogador = d.mao||[]; reservaDoJogador = d.reserva||[]; if(d.slots) slotsFixos = d.slots; }

    if(temClasse) {
        const prof = slotSnap.val().profissao;
        localStorage.setItem('profissaoSelecionada', prof);
        if(window.ativarProfissao) window.ativarProfissao(prof);
    } else {
        setTimeout(() => { if(window.inicializarSelecaoClasse) window.inicializarSelecaoClasse(); }, 300);
    }

    // Monitoramento Realtime
    onValue(child(ref(db), `mesa_rpg/jogadores/${nomeJogador}`), (s) => {
        if(s.exists()) { const d = s.val(); maoDoJogador = d.mao||[]; reservaDoJogador = d.reserva||[]; if(d.slots) slotsFixos = d.slots; renderizar(); }
    });
    
    // Inicia Sub-sistemas
    if(window.iniciarSistemaInimigos) window.iniciarSistemaInimigos();
    if(window.iniciarSistemaMedo) window.iniciarSistemaMedo();
    if(window.escutarRolagens) window.escutarRolagens();
    
    renderizar();
};

// Criar Personagem
window.criarNovoPersonagem = async function() {
    const nome = document.getElementById('nome-personagem').value.trim().toUpperCase();
    if(!nome) return alert("Digite um nome.");
    
    if(currentUser) {
        const accRef = ref(db, `mesa_rpg/accounts/${currentUser.uid}`);
        const snap = await get(accRef);
        if(snap.exists()) {
            const chars = snap.val().characters ? Object.keys(snap.val().characters) : [];
            if(chars.includes(nome)) return alert("Personagem já existe.");
            if(chars.length >= 3) return alert("Limite de 3 personagens atingido.");
        }
        await set(ref(db, `mesa_rpg/accounts/${currentUser.uid}/characters/${nome}`), true);
        await window.selecionarPersonagem(nome);
    }
};

window.atualizarSincronia = function() {
    const btn = document.querySelector('.btn-refresh-player');
    if(btn) btn.classList.add('spin-anim');
    document.getElementById('area-inimigos').innerHTML = "";
    if(window.iniciarSistemaInimigos) window.iniciarSistemaInimigos();
    renderizar();
    if(nomeJogador) { const pRef = ref(db, `mesa_rpg/presenca/${nomeJogador}`); set(pRef, true); }
    setTimeout(() => { if(btn) btn.classList.remove('spin-anim'); }, 1000);
};

// Funções de Cartas
function selecionarCarta(carta) {
    if(slotDestinoAtual) { slotsFixos[slotDestinoAtual] = carta; salvarNaNuvem(); renderizar(); } 
    else {
        if(maoDoJogador.length < LIMITE_MAO) { carta.tokens=0; carta.estado='ativo'; maoDoJogador.push(carta); salvarNaNuvem(); renderizar(); }
        else if(confirm("Mão cheia. Enviar para Reserva?")) { carta.tokens=0; carta.estado='ativo'; reservaDoJogador.push(carta); salvarNaNuvem(); renderizar(); }
    }
    window.fecharGrimorio(); slotDestinoAtual = null;
}

window.limparSlot = function(id, evt) { if(evt) evt.stopPropagation(); slotsFixos[id] = null; salvarNaNuvem(); renderizar(); };

window.salvarNaNuvem = function() {
    if(nomeJogador) set(ref(db, `mesa_rpg/jogadores/${nomeJogador}`), { mao: maoDoJogador, reserva: reservaDoJogador, slots: slotsFixos, ultimoAcesso: Date.now() });
};

// Decisão e Uso
window.abrirDecisao = function(idx) {
    cartaEmTransitoIndex = idx; origemTransito = 'mao';
    const c = maoDoJogador[idx];
    document.getElementById('btn-usar-carta').style.display='inline-block';
    document.getElementById('btn-para-reserva').style.display='inline-block';
    document.getElementById('btn-devolver-mao').style.display='none';
    document.getElementById('btn-devolver-deck').style.display='inline-block';
    
    const p = document.getElementById('preview-decisao');
    p.style.backgroundImage=`url('${c.caminho}')`;
    p.innerHTML = (c.estado==='curto'||c.estado==='longo') ? `<div class="icone-descanso"><img src="${c.estado==='curto'?'img/meia-lua.png':'img/lua-cheia.png'}"></div>` : '';
    document.getElementById('label-token-qtd').innerText = c.tokens||0;
    document.getElementById('decisao-modal').style.display='flex';
};

window.abrirDecisaoReserva = function(idx) {
    cartaEmTransitoIndex = idx; origemTransito = 'reserva';
    const c = reservaDoJogador[idx];
    document.getElementById('btn-usar-carta').style.display='none';
    document.getElementById('btn-para-reserva').style.display='none';
    document.getElementById('btn-devolver-mao').style.display='inline-block';
    document.getElementById('btn-devolver-deck').style.display='none';

    const p = document.getElementById('preview-decisao');
    p.style.backgroundImage=`url('${c.caminho}')`;
    p.innerHTML = '';
    document.getElementById('label-token-qtd').innerText = c.tokens||0;
    document.getElementById('decisao-modal').style.display='flex';
};

window.alterarToken = function(d) {
    const list = origemTransito==='mao'?maoDoJogador:reservaDoJogador;
    if(list[cartaEmTransitoIndex]) {
        list[cartaEmTransitoIndex].tokens = Math.max(0, Math.min(5, (list[cartaEmTransitoIndex].tokens||0)+d));
        document.getElementById('label-token-qtd').innerText = list[cartaEmTransitoIndex].tokens;
        window.salvarNaNuvem();
    }
};

window.definirEstado = function(st) {
    if(origemTransito==='mao') {
        maoDoJogador[cartaEmTransitoIndex].estado = st;
        window.salvarNaNuvem();
        window.abrirDecisao(cartaEmTransitoIndex); // Refresh UI
    }
};

window.confirmarEdicao = function() { window.fecharDecisao(); renderizar(); };

window.usarCarta = function() {
    if(origemTransito!=='mao') return;
    const c = maoDoJogador[cartaEmTransitoIndex];
    window.fecharDecisao();
    const anim = document.getElementById('carta-tabuleiro-animada');
    anim.style.backgroundImage=`url('${c.caminho}')`; anim.style.display='block';
    
    const rect = document.getElementById('mao-area').getBoundingClientRect();
    anim.style.left = (rect.left+rect.width/4)+'px'; anim.style.top = (rect.top-100)+'px';
    anim.style.setProperty('--dx', (window.innerWidth/2 - 100 - (rect.left+rect.width/4))+'px');
    anim.style.setProperty('--dy', (window.innerHeight/2 - 150 - (rect.top-100))+'px');
    
    anim.classList.remove('ativa'); void anim.offsetWidth; anim.classList.add('ativa');

    const audio = document.getElementById('use-card-sound'); if(audio) { audio.volume=0.35; audio.currentTime=0; audio.play().catch(()=>{}); }
    
    set(ref(db, `mesa_rpg/jogadores/${nomeJogador}/cartaUsada`), { caminho: c.caminho, nome: c.nome, timestamp: Date.now() });
    setTimeout(() => { anim.style.display='none'; anim.classList.remove('ativa'); }, 2500);
};

window.moverParaReserva = function() {
    if(origemTransito==='mao') {
        reservaDoJogador.push(maoDoJogador.splice(cartaEmTransitoIndex,1)[0]);
        window.fecharDecisao(); renderizar(); window.salvarNaNuvem();
    }
};

window.devolverParaMao = function() {
    if(origemTransito==='reserva') {
        const c = reservaDoJogador[cartaEmTransitoIndex];
        c.tokens=0; c.estado='ativo';
        if(maoDoJogador.length < LIMITE_MAO) {
            maoDoJogador.push(reservaDoJogador.splice(cartaEmTransitoIndex,1)[0]);
            window.fecharDecisao(); window.fecharReserva(); renderizar(); window.salvarNaNuvem();
        } else {
            cartaDaReservaParaResgatar = { carta: c, indiceReserva: cartaEmTransitoIndex };
            window.fecharDecisao(); window.mostrarModalTroca();
        }
    }
};

window.devolverAoDeck = function() {
    if(origemTransito==='mao') { maoDoJogador.splice(cartaEmTransitoIndex,1)[0]; window.fecharDecisao(); renderizar(); window.salvarNaNuvem(); }
};

window.mostrarModalTroca = function() {
    const grid = document.getElementById('grid-troca'); grid.innerHTML='';
    maoDoJogador.forEach((c,i) => {
        const div = document.createElement('div'); div.className='carta-modal lazy-card'; div.dataset.src=c.caminho; div.style.cssText="background-color:#1a1a1a;cursor:pointer;border:2px solid #333";
        div.onclick = () => window.confirmarTroca(i); grid.appendChild(div); imageObserver.observe(div);
    });
    document.getElementById('troca-modal').style.display='flex';
};

window.confirmarTroca = function(idx) {
    if(!cartaDaReservaParaResgatar) return;
    const old = maoDoJogador[idx];
    maoDoJogador[idx] = cartaDaReservaParaResgatar.carta;
    reservaDoJogador[cartaDaReservaParaResgatar.indiceReserva] = old;
    cartaDaReservaParaResgatar = null;
    window.cancelarTroca(); renderizar(); window.salvarNaNuvem();
};

window.cancelarTroca = function() { document.getElementById('troca-modal').style.display='none'; cartaDaReservaParaResgatar=null; };

window.abrirReserva = function() {
    const grid = document.getElementById('grid-reserva'); grid.innerHTML = '';
    if(!reservaDoJogador.length) grid.innerHTML='<p style="color:#aaa;text-align:center;width:100%">Vazia</p>';
    reservaDoJogador.forEach((c, i) => {
        const div = document.createElement('div'); div.className='carta-modal lazy-card'; div.dataset.src=c.caminho; div.style.backgroundColor='#1a1a1a';
        div.onclick = () => { window.fecharReserva(); window.abrirDecisaoReserva(i); };
        grid.appendChild(div); imageObserver.observe(div);
    });
    document.getElementById('reserva-modal').style.display='flex';
};

window.toggleMusic = function() { const a=document.getElementById('bg-music'); if(a.paused) { a.play(); document.getElementById('btn-music').innerText='🔊'; } else { a.pause(); document.getElementById('btn-music').innerText='🔇'; } };
window.setVolume = function() { document.getElementById('bg-music').volume = parseFloat(document.getElementById('volume').value); };