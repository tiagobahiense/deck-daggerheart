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

// Renderizar Slots e Mão (COM CORREÇÃO DA RESERVA)
function renderizar() {
    // Slots Fixos
    Object.keys(slotsFixos).forEach(id => {
        const div = document.getElementById(`slot-${id}`);
        if(div) {
            div.innerHTML = `<span class="label-slot">${id}</span>` + 
                            (['Fundamental','Especializacao','Maestria'].includes(id) ? `<span class="nivel-req">${id==='Fundamental'?'Nível 1':'Avanço'}</span>` : '') +
                            `<button class="btn-limpar" onclick="limparSlot('${id}', event)">×</button>`;
            const carta = slotsFixos[id];
            const btn = div.querySelector('.btn-limpar');
            if(carta) {
                const img = document.createElement('img');
                img.src = carta.caminho || carta.caminho_perfil || '';
                img.onmouseenter = () => { const p = document.getElementById('hover-preview-slot'); if(p) { p.style.display='block'; p.style.backgroundImage=`url('${img.src}')`; }};
                img.onmouseleave = () => document.getElementById('hover-preview-slot').style.display='none';
                div.appendChild(img);
                btn.style.display = 'flex';
            } else btn.style.display = 'none';
        }
    });

    // Mão
    const divMao = document.getElementById('cartas-mao');
    divMao.innerHTML = '';
    maoDoJogador.forEach((c, i) => {
        const el = document.createElement('div'); el.className = 'carta lazy-card'; el.dataset.src = c.caminho; el.style.backgroundColor='#1a1a1a';
        const rot = (i - (maoDoJogador.length-1)/2) * 4; el.style.transform = `rotate(${rot}deg)`;
        
        if(c.estado==='curto'||c.estado==='longo') {
            el.classList.add('indisponivel');
            el.innerHTML = `<div class="icone-descanso"><img src="${c.estado==='curto'?'img/meia-lua.png':'img/lua-cheia.png'}"></div>`;
        }
        if(c.tokens > 0) el.innerHTML += `<div class="token-badge token-${c.tokens}">${c.tokens}</div>`;

        el.onclick = () => window.abrirDecisao(i);
        el.onmouseenter = () => { const p = document.getElementById('hover-preview'); if(p) { p.style.display='block'; p.style.backgroundImage=`url('${c.caminho}')`; }};
        el.onmouseleave = () => document.getElementById('hover-preview').style.display='none';
        divMao.appendChild(el);
        imageObserver.observe(el);
    });

    // === CORREÇÃO 2: VISUALIZAÇÃO DA RESERVA ===
    const divRes = document.getElementById('cartas-reserva');
    divRes.innerHTML = '';
    divRes.style.opacity = reservaDoJogador.length ? '1' : '0.3';
    
    if(reservaDoJogador.length > 0) {
        const con = document.createElement('div');
        con.className='reserva-container';
        con.style.cssText="position:relative;width:100%;height:100%;cursor:pointer;";
        
        // Renderiza as 3 ÚLTIMAS cartas (Topo da pilha)
        const total = reservaDoJogador.length;
        const mostrarAte = Math.min(3, total);
        
        // Loop reverso para garantir a ordem visual correta (mais recente no topo)
        for(let i = 0; i < mostrarAte; i++) {
            // Se tem 5 cartas: Indices 4, 3, 2
            const indexReal = total - 1 - i; 
            const carta = reservaDoJogador[indexReal];
            
            const el = document.createElement('div'); 
            el.className='carta-reserva-stacked lazy-card'; 
            el.dataset.src = carta.caminho;
            
            // Offset visual invertido: a do fundo fica deslocada
            // Mas vamos simplificar: empilha uma sobre a outra com leve rotação
            // i=0 é a do topo (z-index maior). i=2 é a do fundo.
            const offset = (mostrarAte - 1 - i) * 4; 
            
            el.style.cssText=`
                background-color:#1a1a1a;
                position:absolute;
                width:100%; height:100%;
                top:${offset}px; left:${offset}px;
                z-index:${mostrarAte - i};
                pointer-events:none;
                border: 1px solid #333;
                box-shadow: 0 0 5px rgba(0,0,0,0.5);
            `;
            con.appendChild(el); 
            imageObserver.observe(el);
        }
        
        con.innerHTML += `<div style="position:absolute;bottom:8px;right:8px;background:rgba(218,165,32,0.9);color:#fff;padding:4px 8px;border-radius:4px;font-weight:bold;z-index:100">${total}</div>`;
        con.onclick = window.abrirReserva;
        divRes.appendChild(con);
    }
    // ===============================================

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