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

setPersistence(auth, browserSessionPersistence).catch(console.error);

// Exportações globais
window.db = db; window.ref = ref; window.set = set; window.get = get;
window.remove = remove; window.onValue = onValue; window.onDisconnect = onDisconnect;
window.update = update;
window.push = push; window.query = query; window.limitToLast = limitToLast; window.onChildAdded = onChildAdded;

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

// Variáveis para Leitor de PDF
let paginaAtualPDF = 1;
let totalPaginasPDF = 1;
let tipoAtualPDF = "";
let zoomLevelPDF = 1.0;
let imagensPDFAtuais = [];
 // Adicionando a variável do zoom
window.togglePassword = function(id) { const input = document.getElementById(id); if (input) input.type = input.type === "password" ? "text" : "password"; };

// Funções de Modal
window.fecharGrimorio = function() { const modal = document.getElementById('grimorio-modal'); if (modal) modal.style.display = 'none'; };
window.fecharReserva = function() { const modal = document.getElementById('reserva-modal'); if (modal) modal.style.display = 'none'; };
window.fecharDecisao = function() { const modal = document.getElementById('decisao-modal'); if (modal) modal.style.display = 'none'; cartaEmTransitoIndex = null; origemTransito = null; };

// Navegação Login
window.irParaLoginJogador = function() { document.getElementById('fase-selecao').style.display = 'none'; document.getElementById('fase-login-jogador').style.display = 'block'; };
window.irParaLoginNarrador = function() { document.getElementById('fase-selecao').style.display = 'none'; document.getElementById('fase-login-narrador').style.display = 'block'; };
window.voltarParaSelecao = function() { document.getElementById('fase-login-jogador').style.display = 'none'; document.getElementById('fase-login-narrador').style.display = 'none'; document.getElementById('fase-personagem').style.display = 'none'; document.getElementById('fase-selecao').style.display = 'block'; };

window.forcarLogout = function() {
    localStorage.removeItem('ultimoPersonagem'); // <--- ADICIONE ISSO
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
            if(window.pararAudioLogin) window.pararAudioLogin();
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

    // --- CORREÇÃO: Limpa o "auto-login" ao fazer login manual ---
    localStorage.removeItem('ultimoPersonagem'); 

    signInWithEmailAndPassword(auth, email, pass).then((uc) => {
        window.pararAudioLogin();
        currentUser = uc.user;
        get(ref(db, `mesa_rpg/accounts/${currentUser.uid}/status`)).then(snap => {
            if (snap.exists() && snap.val() === 'inactive') { signOut(auth); throw new Error("Conta inativa"); }
            
            document.getElementById('fase-login-jogador').style.display = 'none';
            
            // --- CORREÇÃO: Sempre manda para a seleção de personagem ---
            document.getElementById('fase-personagem').style.display = 'block';
            carregarListaPersonagens();
        });
    }).catch((e) => msg.innerText = e.message.includes("Conta inativa") ? "❌ Conta desativada." : "❌ Login inválido.");
};

// Carregar Dados (JSON)
async function carregarDados() {
    try {
        const [r1, r2] = await Promise.all([fetch('./lista_cartas.json'), fetch('./lista_cartas_v2.json')]);
        if (r1.ok) catalogoCartas = await r1.json();
        if (r2.ok) { const v2 = await r2.json(); catalogoCartasClasses = Array.isArray(v2) ? v2.filter(c => c.categoria === 'Classes' && c.profissao) : []; }
        return catalogoCartas;
    } catch (e) { console.error("Erro loading cards", e); return []; }
}

// Abrir Grimório (CORRIGIDO PARA ENCODING E FALLBACK)
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
        div.className = 'carta-modal';
        
        const urlSegura = encodeURI(carta.caminho); 
        div.style.backgroundImage = `url('${urlSegura}')`;
        div.style.backgroundColor = '#1a1a1a'; 
        div.style.backgroundSize = 'contain';
        div.style.backgroundRepeat = 'no-repeat';
        div.style.backgroundPosition = 'center';

        const nomeFallback = document.createElement('div');
        nomeFallback.innerText = carta.nome;
        nomeFallback.style.cssText = "position:absolute; bottom:5px; left:0; width:100%; text-align:center; font-size:0.7rem; color:#aaa; pointer-events:none; text-shadow:0 1px 2px black; z-index:0;";
        div.appendChild(nomeFallback);

        div.onclick = () => selecionarCarta(carta);
        
        div.onmouseenter = () => { const p = document.getElementById('hover-preview-modal'); if(p) { p.style.display='block'; p.style.backgroundImage=`url('${urlSegura}')`; }};
        div.onmouseleave = () => { const p = document.getElementById('hover-preview-modal'); if(p) p.style.display='none'; };
        
        grid.appendChild(div);
    });
    modal.style.display = 'flex';
};

// Renderizar Slots e Mão (COMPLETO E ROBUSTO)
function renderizar() {
    const divMao = document.getElementById('cartas-mao');
    const divRes = document.getElementById('cartas-reserva');

    if (!divMao || !divRes) return;

    // --- SLOTS (IDENTIDADE/CLASSE) ---
    // Lógica inline para evitar erros de referência
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
                const src = carta.caminho ? encodeURI(carta.caminho) : (carta.caminho_perfil ? encodeURI(carta.caminho_perfil) : '');
                img.src = src;
                
                img.onerror = function() { 
                    this.style.display='none'; 
                    const erro = document.createElement('span');
                    erro.innerText = carta.nome || "Imagem Inválida";
                    erro.style.cssText = 'color:red; font-size:0.6rem; position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); text-align:center; width:90%';
                    div.appendChild(erro);
                };
                
                img.onmouseenter = () => { const p = document.getElementById('hover-preview-slot'); if(p && img.src) { p.style.display='block'; p.style.backgroundImage=`url('${img.src}')`; }};
                img.onmouseleave = () => document.getElementById('hover-preview-slot').style.display='none';
                div.appendChild(img);
                btn.style.display = 'flex';
            } else btn.style.display = 'none';
        }
    });

    // --- MÃO ---
    divMao.innerHTML = '';
    maoDoJogador.forEach((carta, i) => {
        const el = document.createElement('div');
        el.className = 'carta'; 
        
        const urlSegura = encodeURI(carta.caminho);
        el.style.backgroundImage = `url('${urlSegura}')`;
        el.style.backgroundColor = '#1a1a1a';
        el.style.backgroundSize = 'contain';
        el.style.backgroundRepeat = 'no-repeat';
        el.style.backgroundPosition = 'center';
        
        const nomeFallback = document.createElement('div');
        nomeFallback.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color:#aaa; font-size:0.7rem; text-align:center; width:90%; pointer-events:none; z-index:-1;";
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
                preview.style.backgroundImage = `url('${urlSegura}')`;
            }
        };
        el.onmouseleave = function() { if (document.getElementById('hover-preview')) document.getElementById('hover-preview').style.display = 'none'; };
        
        el.onclick = () => { if (window.abrirDecisao) window.abrirDecisao(i); };
        divMao.appendChild(el);
    });

    // --- RESERVA ---
    divRes.innerHTML = '';
    divRes.style.opacity = reservaDoJogador.length ? '1' : '0.3';
    
    if (reservaDoJogador.length > 0) {
        const container = document.createElement('div');
        container.className = 'reserva-container';
        container.style.cssText = 'position: relative; width: 100%; height: 100%; cursor: pointer;';
        
        const total = reservaDoJogador.length;
        const mostrar = Math.min(3, total);
        
        for (let i = 0; i < mostrar; i++) {
            const indexReal = total - 1 - i;
            const carta = reservaDoJogador[indexReal];
            const urlSegura = encodeURI(carta.caminho);
            
            const cartaEl = document.createElement('div');
            cartaEl.className = 'carta-reserva-stacked';
            cartaEl.style.backgroundImage = `url('${urlSegura}')`;
            
            cartaEl.style.cssText = `
                background-color: #1a1a1a;
                background-image: url('${urlSegura}');
                position: absolute;
                width: 100%; height: 100%;
                top: ${i * 2}px; left: ${i * 2}px;
                z-index: ${mostrar - i};
                border: 1px solid #444;
                border-radius: 6px;
                box-shadow: 2px 2px 5px rgba(0,0,0,0.5);
                pointer-events: none;
                background-size: cover;
                background-position: center;
                background-repeat: no-repeat;
            `;
            
            const texto = document.createElement('div');
            texto.innerText = carta.nome;
            texto.style.cssText = 'position:absolute; top:50%; width:100%; font-size:0.5rem; text-align:center; color:#555; z-index:-1;';
            cartaEl.appendChild(texto);

            container.appendChild(cartaEl);
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

// Selecionar Personagem
window.selecionarPersonagem = async function(charName) {
    // Para a música de entrada
    if(window.pararAudioLogin) window.pararAudioLogin();
    localStorage.setItem('ultimoPersonagem', charName);
    
    // --- CORREÇÃO: Garante que a capa e login sumam ---
    const capa = document.getElementById('tela-inicial-monolito');
    const loginScreen = document.getElementById('login-screen');
    const loading = document.getElementById('loading-overlay');
    
    if(capa) capa.style.display = 'none';
    if(loginScreen) loginScreen.style.display = 'none';
    
    // Mostra o Loading TEMPORARIAMENTE enquanto carrega os dados
    if(loading) {
        loading.style.display = 'flex';
        const msgDiv = loading.querySelector('div');
        if(msgDiv) msgDiv.innerText = "Invocando Personagem...";
    }
    // --------------------------------------------------

    nomeJogador = charName.toUpperCase();
    if(typeof window !== 'undefined') window.nomeJogador = nomeJogador;

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

    document.getElementById('app-container').style.display = 'flex';
    const hudImg = document.getElementById('hud-portrait-img');
    const hudNome = document.getElementById('hud-nome-personagem');
    
    if(hudNome) hudNome.innerText = nomeJogador;
    
    // Busca a imagem salva no Firebase
    get(child(ref(db), `mesa_rpg/jogadores/${nomeJogador}/retrato`)).then((snapshot) => {
        if (snapshot.exists()) {
            if(hudImg) hudImg.src = snapshot.val();
        } else {
            if(hudImg) hudImg.src = "img/default_portrait.png";
        }
    });
    setTimeout(() => document.getElementById('app-container').style.opacity = '1', 50);

    const audioGame = document.getElementById('bg-music');
    if(audioGame) { audioGame.volume = 0.05; audioGame.play().catch(e => console.warn(e)); }

    await carregarDados();
    
    const pSnap = await get(child(ref(db), `mesa_rpg/jogadores/${nomeJogador}`));
    if(pSnap.exists()) { const d = pSnap.val(); maoDoJogador = d.mao||[]; reservaDoJogador = d.reserva||[]; if(d.slots) slotsFixos = d.slots; }

    if(temClasse) {
        const prof = slotSnap.val().profissao;
        localStorage.setItem('profissaoSelecionada', prof);
        if(window.ativarProfissao) window.ativarProfissao(prof);
    } else {
        setTimeout(() => { if(window.inicializarSelecaoClasse) window.inicializarSelecaoClasse(); }, 300);
    }

    onValue(child(ref(db), `mesa_rpg/jogadores/${nomeJogador}`), (s) => {
        if(s.exists()) { const d = s.val(); maoDoJogador = d.mao||[]; reservaDoJogador = d.reserva||[]; if(d.slots) slotsFixos = d.slots; renderizar(); }
    });
    
    if(window.iniciarSistemaInimigos) window.iniciarSistemaInimigos();
    if(window.iniciarSistemaMedo) window.iniciarSistemaMedo();
    if(window.escutarRolagens) window.escutarRolagens();
    
    renderizar();

    // --- FINAL: Esconde o loading quando tudo estiver pronto ---
    setTimeout(() => {
        if(loading) loading.style.display = 'none';
    }, 500);
};

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
    // 1. Pega referências do botão e da tela de loading
    const btn = document.querySelector('.btn-refresh-player');
    const loading = document.getElementById('loading-overlay');
    
    // 2. Ativa animações
    if(btn) btn.classList.add('spin-anim'); // Botão começa a girar
    
    if(loading) {
        loading.style.display = 'flex';
        // Tenta mudar o texto se encontrar a div
        const msgDiv = loading.querySelector('div');
        if(msgDiv) msgDiv.innerText = "Ressincronizando Mesa...";
    }

    // 3. Reinicia os sistemas
    document.getElementById('area-inimigos').innerHTML = "";
    
    if(window.iniciarSistemaInimigos) window.iniciarSistemaInimigos();
    if(window.iniciarSistemaMedo) window.iniciarSistemaMedo();
    if(window.monitorarNPCAtivo) window.monitorarNPCAtivo();
    
    // 4. Renderiza e avisa o servidor
    renderizar();
    if(nomeJogador) { 
        const pRef = ref(db, `mesa_rpg/presenca/${nomeJogador}`); 
        set(pRef, true); 
    }

    // 5. FINALIZA TUDO APÓS 1.5s
    setTimeout(() => { 
        if(loading) loading.style.display = 'none'; // Tira a tela preta
        if(btn) btn.classList.remove('spin-anim');  // <--- ESSA LINHA FALTAVA (Para de girar)
    }, 1500);
};


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
    p.style.backgroundImage=`url('${encodeURI(c.caminho)}')`;
    p.style.backgroundSize = 'contain';
    p.style.backgroundRepeat = 'no-repeat';
    p.style.backgroundPosition = 'center';
    
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
    p.style.backgroundImage=`url('${encodeURI(c.caminho)}')`;
    p.style.backgroundSize = 'contain';
    p.style.backgroundRepeat = 'no-repeat';
    p.style.backgroundPosition = 'center';
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
        const carta = list[cartaEmTransitoIndex];
    const acao = d > 0 ? "Adicionou" : "Removeu";
    window.registrarLog('token', `${acao} token em <span class="log-destaque">${carta.nome}</span> (Total: ${carta.tokens}).`);
    }
};

window.definirEstado = function(st) {
    if(origemTransito==='mao') {
        const carta = maoDoJogador[cartaEmTransitoIndex];
        carta.estado = st;
        window.salvarNaNuvem();
        
        // NOVO LOG AQUI
        const tipoDescanso = st === 'curto' ? 'Descanso Curto' : 'Descanso Longo';
        window.registrarLog('descanso', `Ativou <b>${tipoDescanso}</b> na carta <span class="log-destaque">${carta.nome}</span>.`);
        
        window.abrirDecisao(cartaEmTransitoIndex); 
    }
};

window.confirmarEdicao = function() { window.fecharDecisao(); renderizar(); };

window.usarCarta = function() {
    if(origemTransito!=='mao') return;
    const c = maoDoJogador[cartaEmTransitoIndex];
    window.registrarLog('carta-uso', `Usou a carta <span class="log-destaque">${c.nome}</span>.`);
    window.fecharDecisao();
    const anim = document.getElementById('carta-tabuleiro-animada');
    anim.style.backgroundImage=`url('${encodeURI(c.caminho)}')`; anim.style.display='block';
    
    const rect = document.getElementById('mao-area').getBoundingClientRect();
    anim.style.left = (rect.left+rect.width/4)+'px'; anim.style.top = (rect.top-100)+'px';
    anim.style.setProperty('--dx', (window.innerWidth/2 - 100 - (rect.left+rect.width/4))+'px');
    anim.style.setProperty('--dy', (window.innerHeight/2 - 150 - (rect.top-100))+'px');
    
    anim.classList.remove('ativa'); void anim.offsetWidth; anim.classList.add('ativa');

    const audio = document.getElementById('use-card-sound'); if(audio) { audio.volume=0.35; audio.currentTime=0; audio.play().catch(()=>{}); }
    
    set(ref(db, `mesa_rpg/jogadores/${nomeJogador}/cartaUsada`), { caminho: c.caminho, nome: c.nome, timestamp: Date.now() });
    setTimeout(() => { anim.style.display='none'; anim.classList.remove('ativa'); }, 2500);
};


window.devolverParaMao = function() {
    if(origemTransito==='reserva') {
        const c = reservaDoJogador[cartaEmTransitoIndex];
        const nomeCarta = c.nome; // Salva o nome
        
        c.tokens=0; c.estado='ativo';
        if(maoDoJogador.length < LIMITE_MAO) {
            maoDoJogador.push(reservaDoJogador.splice(cartaEmTransitoIndex,1)[0]);
            window.fecharDecisao(); window.fecharReserva(); renderizar(); window.salvarNaNuvem();
            
            // CORRIGIDO: Usa 'texto-carta' para ficar dourado
            window.registrarLog('carta-reserva', `Resgatou <span class="texto-carta">${nomeCarta}</span> da Reserva para a Mão.`);
            
        } else {
            cartaDaReservaParaResgatar = { carta: c, indiceReserva: cartaEmTransitoIndex };
            window.fecharDecisao(); window.mostrarModalTroca();
        }
    }
};

// 2. Devolver da Mão para o Deck (Grimório)
window.devolverAoDeck = function() {
    if(origemTransito==='mao') { 
        const c = maoDoJogador[cartaEmTransitoIndex]; // Salva referência
        const nomeCarta = c.nome; // Salva nome

        maoDoJogador.splice(cartaEmTransitoIndex,1)[0]; 
        window.fecharDecisao(); renderizar(); window.salvarNaNuvem(); 
        
        // CORRIGIDO: Usa 'texto-carta'
        window.registrarLog('carta-reserva', `Devolveu <span class="texto-carta">${nomeCarta}</span> ao Grimório.`);
    }
};

window.mostrarModalTroca = function() {
    const grid = document.getElementById('grid-troca'); grid.innerHTML='';
    maoDoJogador.forEach((c,i) => {
        const div = document.createElement('div'); div.className='carta-modal';
        div.style.backgroundImage = `url('${encodeURI(c.caminho)}')`;
        div.style.cssText += "background-color:#1a1a1a;cursor:pointer;border:2px solid #333;background-size:contain;background-repeat:no-repeat;background-position:center;";
        div.onclick = () => window.confirmarTroca(i); 
        grid.appendChild(div);
    });
    document.getElementById('troca-modal').style.display='flex';
};

window.confirmarTroca = function(idx) {
    if(!cartaDaReservaParaResgatar) return;
    const old = maoDoJogador[idx];
    const nova = cartaDaReservaParaResgatar.carta;
    
    maoDoJogador[idx] = nova;
    reservaDoJogador[cartaDaReservaParaResgatar.indiceReserva] = old;
    
    cartaDaReservaParaResgatar = null;
    window.cancelarTroca(); renderizar(); window.salvarNaNuvem();
    
    // CORRIGIDO: Usa 'texto-carta' nas duas cartas
    window.registrarLog('carta-reserva', `Trocou <span class="texto-carta">${old.nome}</span> (Mão) por <span class="texto-carta">${nova.nome}</span> (Reserva).`);
};

window.cancelarTroca = function() { document.getElementById('troca-modal').style.display='none'; cartaDaReservaParaResgatar=null; };

window.abrirReserva = function() {
    const grid = document.getElementById('grid-reserva'); grid.innerHTML = '';
    if(!reservaDoJogador.length) grid.innerHTML='<p style="color:#aaa;text-align:center;width:100%">Vazia</p>';
    reservaDoJogador.forEach((c, i) => {
        const div = document.createElement('div'); 
        div.className='carta-modal';
        div.style.backgroundImage = `url('${encodeURI(c.caminho)}')`;
        div.style.backgroundColor='#1a1a1a';
        div.style.backgroundSize = 'contain';
        div.style.backgroundRepeat = 'no-repeat';
        div.style.backgroundPosition = 'center';
        div.onclick = () => { window.fecharReserva(); window.abrirDecisaoReserva(i); };
        grid.appendChild(div);
    });
    document.getElementById('reserva-modal').style.display='flex';
};

window.toggleMusic = function() { const a=document.getElementById('bg-music'); if(a.paused) { a.play(); document.getElementById('btn-music').innerText='🔊'; } else { a.pause(); document.getElementById('btn-music').innerText='🔇'; } };
window.setVolume = function() { document.getElementById('bg-music').volume = parseFloat(document.getElementById('volume').value); };

// =========================================================
// AUTO-RECONEXÃO (F5)
// =========================================================
// =========================================================
// AUTO-RECONEXÃO INTELIGENTE (SEM PISCAR LOGIN)
// =========================================================
onAuthStateChanged(auth, (user) => {
    const loadingScreen = document.getElementById('loading-overlay');
    const loginScreen = document.getElementById('login-screen');
    const appContainer = document.getElementById('app-container');
    const capa = document.getElementById('tela-inicial-monolito');

    if (user) {
        currentUser = user;
        const ultimoPersonagem = localStorage.getItem('ultimoPersonagem');
        
        // CENÁRIO 1: Jogador Reconectando (F5)
        if (ultimoPersonagem && user.email.toLowerCase().trim() !== "tgbahiense@gmail.com") {
             console.log("Retomando sessão de: " + ultimoPersonagem);
             
             // Remove a capa imediatamente para não ficar tudo preto
             if(capa) capa.style.display = 'none';
             if(loginScreen) loginScreen.style.display = 'none';
             
             // Mostra Loading enquanto recupera
             if(loadingScreen) {
                 loadingScreen.style.display = 'flex';
                 const msg = loadingScreen.querySelector('div');
                 if(msg) msg.innerText = "Retomando Sessão...";
             }

             // Chama a função que vai carregar e depois tirar o loading
             window.selecionarPersonagem(ultimoPersonagem);
        } 
        // CENÁRIO 2: Mestre ou Sem Personagem selecionado
        else {
            if(loadingScreen) loadingScreen.style.display = 'none';
            if(capa) capa.style.display = 'none'; // Se já logou, tira a capa
            // O código original do mestre ou seleção deve fluir aqui
        }
    } else {
        // CENÁRIO 3: Não Logado (Tela Inicial / Capa)
        // Aqui NÃO escondemos a capa, pois o usuário tem que clicar em JOGAR
        if(loadingScreen) loadingScreen.style.display = 'none';
        
        // O login fica visível ATRÁS da capa, esperando o clique no botão JOGAR
        if(loginScreen) loginScreen.style.display = 'flex'; 
        if(appContainer) appContainer.style.display = 'none';
    }
});

window.fecharLeitorPDF = function() {
    document.getElementById('modal-leitor-pdf').style.display = 'none';
};

window.mudarPaginaLeitor = function(direcao) {
    // Reseta o zoom ao mudar de página para não ficar estranho
    zoomLevelPDF = 1.0;
    aplicarZoomPDF();

    const novaPagina = paginaAtualPDF + direcao;
    if (novaPagina >= 1 && novaPagina <= totalPaginasPDF) {
        paginaAtualPDF = novaPagina;
        atualizarImagemLeitor();
    }
};

function atualizarImagemLeitor() {
    const imgElement = document.getElementById('img-leitor-pdf');
    const contador = document.getElementById('leitor-page-counter');
    
    let caminho = "";

    // SE FOR CLASSE, PEGA DA ARRAY
    if (tipoAtualPDF === 'Classe') {
        // Arrays começam em 0, páginas em 1
        if (imagensPDFAtuais[paginaAtualPDF - 1]) {
            caminho = imagensPDFAtuais[paginaAtualPDF - 1];
        }
    } 
    // SE FOR OS OUTROS, USA A LÓGICA DE NÚMERO
    else {
        const numFormatado = String(paginaAtualPDF).padStart(3, '0');
        if (tipoAtualPDF === 'Ancestralidade') {
            caminho = `img/ancestralidade-pdf/Ancestralidades_pag_${numFormatado}.jpg`;
        } else {
            caminho = `img/comunidade-pdf/Comunidade_pag_${numFormatado}.jpg`;
        }
    }
    
    imgElement.src = caminho;
    
    // Tratamento de erro se a imagem não carregar
    imgElement.onerror = function() {
        console.warn("Imagem não encontrada:", caminho);
    };

    contador.innerText = `${paginaAtualPDF}/${totalPaginasPDF}`;
}

// --- LÓGICA DO ZOOM (CLIQUE APENAS) ---
// Seleciona especificamente o container do LEITOR
const containerPdfElement = document.querySelector('#modal-leitor-pdf .pdf-container');

if(containerPdfElement) {
    // REMOVIDO O EVENTO 'WHEEL' PARA O SCROLL NATURAL DA BARRA LATERAL FUNCIONAR

    // Zoom com Clique (Alternar 1x / 2.5x)
    containerPdfElement.addEventListener('click', function(e) {
        // Se clicar nos botões de navegação, ignora
        if(e.target.tagName === 'BUTTON') return;

        if (zoomLevelPDF <= 1) {
            zoomLevelPDF = 2.5; // Zoom in (Aumenta)
        } else {
            zoomLevelPDF = 1.0; // Zoom out (Reseta)
        }
        aplicarZoomPDF();
    });
}

function aplicarZoomPDF() {
    const img = document.getElementById('img-leitor-pdf');
    const container = document.querySelector('#modal-leitor-pdf .pdf-container');

    if (!img || !container) return;

    if (zoomLevelPDF <= 1) {
        // RESET: Encaixa na tela
        img.style.width = 'auto';
        img.style.maxWidth = '100%';
        img.style.maxHeight = '88vh';
        container.style.cursor = 'zoom-in'; // Lupa com +
        container.style.alignItems = 'center';
    } else {
        // ZOOM ATIVO
        img.style.maxHeight = 'none';
        img.style.maxWidth = 'none';
        img.style.width = `${zoomLevelPDF * 100}%`;
        container.style.cursor = 'zoom-out'; // Lupa com -
        container.style.alignItems = 'flex-start';
    }
}

// --- FUNÇÃO RECUPERADA: ABRIR LEITOR DE PDF ---
// --- FUNÇÃO ABRIR LEITOR DE PDF (ATUALIZADA) ---
window.abrirLeitorPDF = function(tipo) {
    tipoAtualPDF = tipo;
    paginaAtualPDF = 1;
    zoomLevelPDF = 1.0;
    imagensPDFAtuais = []; // Limpa lista anterior

    // LÓGICA PARA CLASSE
    if (tipo === 'Classe') {
        const nomeClasse = localStorage.getItem('profissaoSelecionada');
        if (!nomeClasse) return alert("Nenhuma classe selecionada na ficha.");

        // Busca a lista de imagens no arquivo selecao-classe.js
        if (window.classesDisponiveis) {
            const dados = window.classesDisponiveis.find(c => c.nome === nomeClasse);
            if (dados && dados.pdfs) {
                imagensPDFAtuais = dados.pdfs;
                totalPaginasPDF = dados.pdfs.length;
            } else {
                return alert("Imagens desta classe não encontradas.");
            }
        } else {
            return alert("Erro: Lista de classes não carregada.");
        }
        
        // Atualiza o título do modal
        const titulo = document.getElementById('titulo-leitor-pdf');
        if(titulo) titulo.innerText = nomeClasse;

    } else {
        // LÓGICA PARA ANCESTRALIDADE E COMUNIDADE
        if (tipo === 'Ancestralidade') {
            totalPaginasPDF = 20; 
        } else {
            totalPaginasPDF = 14; 
        }
        const titulo = document.getElementById('titulo-leitor-pdf');
        if(titulo) titulo.innerText = tipo;
    }

    atualizarImagemLeitor();
    
    const modal = document.getElementById('modal-leitor-pdf');
    if(modal) {
        modal.style.display = 'flex';
        setTimeout(aplicarZoomPDF, 50);
    }
};

// Função para parar a música de entrada (Wellcome)
window.pararAudioLogin = function() {
    const audio = document.getElementById('audio-login');
    if (audio && !audio.paused) {
        let vol = audio.volume;
        const fade = setInterval(() => {
            if (vol > 0.05) {
                vol -= 0.05;
                audio.volume = vol;
            } else {
                clearInterval(fade);
                audio.pause();
            }
        }, 100);
    }
};

// =========================================================
// SISTEMA DE UPLOAD DE RETRATO & VITRAL (CORRIGIDO V2)
// =========================================================

// 1. Função chamada pelo botão "Trocar"
window.triggerUploadPortrait = function() {
    const fileInput = document.getElementById('portrait-upload-input');
    
    if (!fileInput) {
        alert("ERRO: O input de arquivo não foi encontrado no HTML.");
        console.error("Input 'portrait-upload-input' não existe.");
        return;
    }

    // Garante que o evento de mudança está ativado
    fileInput.onchange = function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validação de tipo
        if (!file.type.startsWith('image/')) {
            alert("Por favor, selecione apenas arquivos de imagem (JPG, PNG).");
            return;
        }

        // Validação de tamanho (Opcional: Limite de 2MB para não travar o Firebase)
        if (file.size > 2 * 1024 * 1024) {
            if(!confirm("Essa imagem é muito grande (>2MB) e pode demorar para salvar. Deseja continuar?")) return;
        }

        console.log("Lendo arquivo...", file.name);
        
        // Feedback visual
        const hudImg = document.getElementById('hud-portrait-img');
        const oldSrc = hudImg ? hudImg.src : '';
        if(hudImg) hudImg.style.opacity = '0.5'; // Indica carregamento

        const reader = new FileReader();
        
        reader.onload = function(event) {
            const base64String = event.target.result;
            console.log("Arquivo lido. Salvando no Firebase...");

            if (window.nomeJogador && window.db && window.ref && window.update) {
                const playerRef = window.ref(window.db, `mesa_rpg/jogadores/${window.nomeJogador}`);
                
                window.update(playerRef, { "retrato": base64String })
                    .then(() => {
                        console.log("Salvo com sucesso!");
                        // Atualiza a imagem na hora
                        if(hudImg) {
                            hudImg.src = base64String;
                            hudImg.style.opacity = '1';
                        }
                        
                        // Fecha o menu
                        const menu = document.getElementById('menu-vitral');
                        if(menu) menu.style.display = 'none';

                        alert("Imagem atualizada!");
                    })
                    .catch(err => {
                        console.error("Erro ao salvar no Firebase:", err);
                        alert("Erro ao salvar a imagem. Tente uma menor.");
                        if(hudImg) {
                            hudImg.src = oldSrc;
                            hudImg.style.opacity = '1';
                        }
                    });
            } else {
                alert("Erro de conexão ou jogador não identificado.");
                if(hudImg) hudImg.style.opacity = '1';
            }
        };

        reader.onerror = function(e) {
            console.error("Erro na leitura do arquivo", e);
            alert("Não foi possível ler este arquivo.");
        };

        reader.readAsDataURL(file);
    };

    // Abre a janela de seleção
    fileInput.value = ''; // Limpa para permitir selecionar a mesma foto se quiser
    fileInput.click();
};

// 2. Função do Menu Vitral
window.alternarMenuVitral = function() {
    const menu = document.getElementById('menu-vitral');
    if (!menu) return;
    
    if (menu.style.display === 'none') {
        menu.style.display = 'flex';
        // Delay pequeno para não fechar imediatamente ao clicar
        setTimeout(() => {
            document.addEventListener('click', function fechar(e) {
                const vitral = document.querySelector('.vitral-moldura-main');
                // Se o clique não foi no menu e nem no vitral
                if (menu && !menu.contains(e.target) && (!vitral || !vitral.contains(e.target))) {
                    menu.style.display = 'none';
                    document.removeEventListener('click', fechar);
                }
            });
        }, 100);
    } else {
        menu.style.display = 'none';
    }
};

// 3. Função Remover
window.removerRetrato = function() {
    if (!confirm("Remover foto e voltar ao padrão?")) return;
    const imgPadrao = "img/default_portrait.png";
    if (window.nomeJogador && window.db && window.ref && window.update) {
        const playerRef = window.ref(window.db, `mesa_rpg/jogadores/${window.nomeJogador}`);
        window.update(playerRef, { "retrato": imgPadrao })
            .then(() => {
                const hudImg = document.getElementById('hud-portrait-img');
                if (hudImg) hudImg.src = imgPadrao;
                document.getElementById('menu-vitral').style.display = 'none';
            });
    }
};

// =========================================================
// SISTEMA DE LOG DE AÇÕES (CHAT)
// =========================================================

// 1. Alternar Visibilidade do Painel
window.toggleChatLog = function() {
    const painel = document.getElementById('chat-log-container');
    const dot = document.getElementById('notification-dot');
    
    if (painel.classList.contains('open')) {
        painel.classList.remove('open');
    } else {
        painel.classList.add('open');
        dot.style.display = 'none'; // Remove notificação ao abrir
        rolarLogParaOFinal();
    }
};

function rolarLogParaOFinal() {
    const content = document.getElementById('chat-log-content');
    setTimeout(() => {
        content.scrollTop = content.scrollHeight;
    }, 100);
}

// 2. Função Global para Registrar Ação (Envia p/ Firebase)
// =========================================================
// ATUALIZAÇÃO NO SISTEMA DE LOG (script.js)
// =========================================================

// 1. Função registrarLog INTELIGENTE (Detecta Classe e Formata)
window.registrarLog = function(tipo, mensagem) {
    if (!window.db || !window.push || !window.ref) return;
    
    // Identifica quem está agindo
    let autor = window.nomeJogador || "Espectador";
    let classeAutor = "Padrao";

    // Se for o Mestre
    if (autor === "Mestre") {
        classeAutor = "Mestre";
    } else {
        // Tenta pegar a classe salva no LocalStorage
        const classeSalva = localStorage.getItem('profissaoSelecionada');
        if (classeSalva) classeAutor = classeSalva.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove acentos p/ CSS
    }
    
    const timestamp = Date.now();
    
    // Salva com a info da classe para colorir na hora de ler
    const logRef = window.ref(window.db, 'mesa_rpg/chat_log');
    window.push(logRef, {
        autor: autor,
        classe: classeAutor, // Salva a classe junto
        tipo: tipo,
        mensagem: mensagem,
        timestamp: timestamp
    });
};

// 2. Listener ATUALIZADO (Para aplicar as cores ao receber)
window.iniciarMonitoramentoLog = function() {
    // 1. TRAVA DE SEGURANÇA: Se já estiver ouvindo, PARA TUDO.
    if (window.logListenerAtivo) return; 
    
    // 2. MARCA COMO ATIVO: Para a próxima vez saber que já ligou.
    window.logListenerAtivo = true; 

    const content = document.getElementById('chat-log-content');
    
    // O resto continua igual...
    const logRef = window.query(window.ref(window.db, 'mesa_rpg/chat_log'), window.limitToLast(50));

    window.onChildAdded(logRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        const empty = content.querySelector('.log-empty');
        if(empty) empty.remove();

        const div = document.createElement('div');
        div.className = `log-entry tipo-${data.tipo}`;
        
        const hora = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let classeCSS = "classe-Padrao";
        if(data.classe === "Mestre") classeCSS = "autor-mestre";
        else if(data.classe) classeCSS = `classe-${data.classe}`;

        div.innerHTML = `
            <span class="log-timestamp">${hora}</span>
            <span class="log-author ${classeCSS}">${data.autor}</span>
            <div class="log-text">${data.mensagem}</div>
        `;

        content.appendChild(div);
        
        const painel = document.getElementById('chat-log-container');
        if (painel.classList.contains('open')) {
            content.scrollTop = content.scrollHeight;
        } else {
            const dot = document.getElementById('notification-dot');
            if(dot) dot.style.display = 'block';
        }
    });
    
    console.log("📜 Log de ações conectado (Único).");
};

// =========================================================
// CORREÇÃO: LOG DE RESERVA (script.js)
// =========================================================

// Função 1: Quando move manualmente pelo menu da carta
window.moverParaReserva = function() {
    if(origemTransito==='mao') {
        const carta = maoDoJogador[cartaEmTransitoIndex]; // Pega a carta ANTES de remover
        const nomeCarta = carta.nome; // Salva o nome
        
        reservaDoJogador.push(maoDoJogador.splice(cartaEmTransitoIndex,1)[0]);
        
        window.fecharDecisao(); 
        renderizar(); 
        window.salvarNaNuvem();
        
        // O LOG ESTÁ AQUI
        window.registrarLog('carta-reserva', `Moveu <span class="texto-carta">${nomeCarta}</span> para a Reserva.`);
    }
};

// Função 2: Quando compra e a mão está cheia (O Popup de confirmação)
function selecionarCarta(carta) {
    if(slotDestinoAtual) { 
        slotsFixos[slotDestinoAtual] = carta; 
        salvarNaNuvem(); 
        renderizar(); 
    } else {
        if(maoDoJogador.length < LIMITE_MAO) { 
            carta.tokens=0; carta.estado='ativo'; 
            maoDoJogador.push(carta); 
            salvarNaNuvem(); renderizar(); 
            window.registrarLog('carta-compra', `Adicionou <span class="texto-carta">${carta.nome}</span> à mão.`);
        } 
        else {
            // AQUI ESTAVA O PROBLEMA DO LOG NÃO APARECER AS VEZES
            if(confirm("Mão cheia. Enviar para Reserva?")) { 
                carta.tokens=0; carta.estado='ativo'; 
                reservaDoJogador.push(carta); 
                salvarNaNuvem(); renderizar(); 
                
                // AGORA O LOG APARECE CERTO
                window.registrarLog('carta-reserva', `Enviou <span class="texto-carta">${carta.nome}</span> direto para a Reserva.`);
            }
        }
    }
    window.fecharGrimorio(); slotDestinoAtual = null;
}

// Inicia o monitoramento assim que o script carregar
window.addEventListener('load', () => {
    setTimeout(window.iniciarMonitoramentoLog, 1500); // Pequeno delay pra garantir conexão
});

// =========================================================
// SISTEMA DE RECONEXÃO ROBUSTA (ATUALIZADO)
// =========================================================

// 1. Função do Botão "Refresh" (Manual)
window.atualizarSincronia = function() {
    // A. Animação do Botão e Loading
    const btn = document.querySelector('.btn-refresh-player');
    const loading = document.getElementById('loading-overlay');
    
    if(btn) btn.classList.add('spin-anim'); 
    
    if(loading) {
        loading.style.display = 'flex';
        const msgDiv = loading.querySelector('div');
        if(msgDiv) msgDiv.innerText = "Ressincronizando Mesa...";
    }

    // B. Reinicia TODOS os sistemas (O Segredo está aqui)
    // Limpa áreas visuais para evitar duplicação
    document.getElementById('area-inimigos').innerHTML = "";
    
    // 1. Inimigos e Medo
    if(window.iniciarSistemaInimigos) window.iniciarSistemaInimigos();
    if(window.iniciarSistemaMedo) window.iniciarSistemaMedo();
    
    // 2. NPCs (Faltava garantir isso)
    if(window.monitorarNPCAtivo) window.monitorarNPCAtivo();

    // 3. Cenários (Faltava isso)
    if(window.iniciarMonitoramentoCenarios) window.iniciarMonitoramentoCenarios();

    // 4. VTT / Mapa (Faltava isso)
    if(window.iniciarTabletop) window.iniciarTabletop();
    
    // 5. Dados (Modo Otimista)
    if(window.escutarRolagens) {
        window.rolagemListenerAtivo = false; // Reseta trava para forçar novo ouvinte
        window.escutarRolagens();
    }

    // C. Renderiza Ficha e Presença
    renderizar();
    if(nomeJogador) { 
        const pRef = ref(db, `mesa_rpg/presenca/${nomeJogador}`); 
        set(pRef, true); 
    }

    // D. Finaliza
    setTimeout(() => { 
        if(loading) loading.style.display = 'none'; 
        if(btn) btn.classList.remove('spin-anim');  
    }, 1500);
};

// 2. Monitor Automático (Evita F5 quando a net pisca)
window.iniciarMonitorConexao = function() {
    const connectedRef = window.ref(window.db, ".info/connected");
    
    window.onValue(connectedRef, (snap) => {
        if (snap.val() === true) {
            console.log("🟢 Conectado ao Firebase.");
            
            // Se recuperou a conexão, força uma atualização silenciosa dos módulos críticos
            if(window.nomeJogador) {
                // Reaplica ouvintes sem mostrar tela de loading (silencioso)
                if(window.monitorarNPCAtivo) window.monitorarNPCAtivo();
                if(window.iniciarMonitoramentoCenarios) window.iniciarMonitoramentoCenarios();
                if(window.iniciarTabletop) window.iniciarTabletop();
                renderizar();
            }

        } else {
            console.warn("🔴 Conexão instável...");
            // Opcional: Mostrar ícone de "Sem Sinal" discreto no canto
        }
    });
};

// Garante que inicia ao carregar
window.addEventListener('load', () => {
    setTimeout(window.iniciarMonitorConexao, 2000); 
    setTimeout(window.iniciarMonitoramentoLog, 1500);
});