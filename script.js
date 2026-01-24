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
    if(window.pararAudioLogin) window.pararAudioLogin();
    localStorage.setItem('ultimoPersonagem', charName); // <--- ADICIONE ESTA LINHA
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

    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('app-container').style.display = 'flex';
    setTimeout(() => document.getElementById('app-container').style.opacity = '1', 50);

    const audio = document.getElementById('bg-music');
    if(audio) { audio.volume = 0.05; audio.play().catch(e => console.warn(e)); }

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
    }
};

window.definirEstado = function(st) {
    if(origemTransito==='mao') {
        maoDoJogador[cartaEmTransitoIndex].estado = st;
        window.salvarNaNuvem();
        window.abrirDecisao(cartaEmTransitoIndex); 
    }
};

window.confirmarEdicao = function() { window.fecharDecisao(); renderizar(); };

window.usarCarta = function() {
    if(origemTransito!=='mao') return;
    const c = maoDoJogador[cartaEmTransitoIndex];
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

    if (user) {
        currentUser = user;
        const ultimoPersonagem = localStorage.getItem('ultimoPersonagem');
        
        // Cenario 1: Jogador dando F5 (Tem personagem salvo)
        if (ultimoPersonagem && user.email.toLowerCase().trim() !== "tgbahiense@gmail.com") {
             console.log("Retomando sessão de: " + ultimoPersonagem);
             
             // Garante que o login fique escondido
             loginScreen.style.display = 'none';
             
             // Carrega o personagem
             window.selecionarPersonagem(ultimoPersonagem).then(() => {
                 // SÓ AGORA tira a tela de carregamento
                 setTimeout(() => {
                     if(loadingScreen) loadingScreen.style.display = 'none';
                 }, 500);
             });
        } 
        // Cenario 2: Mestre ou Usuário sem personagem selecionado
        else {
            if(loadingScreen) loadingScreen.style.display = 'none';
            // Se for mestre, vai pro admin ou mestre logic (depende da sua pag), aqui assume fluxo normal
        }
    } else {
        // Cenario 3: Ninguém logado (Mostra Login)
        console.log("Nenhum usuário. Mostrando login.");
        if(loadingScreen) loadingScreen.style.display = 'none';
        loginScreen.style.display = 'flex';
        appContainer.style.display = 'none';
    }
});
// --- FUNÇÕES DE LEITURA DE PDF (ANCESTRALIDADE/COMUNIDADE) ---

// --- FUNÇÕES DE LEITURA DE PDF ATUALIZADAS COM ZOOM ---

window.abrirLeitorPDF = function(tipo) {
    tipoAtualPDF = tipo;
    paginaAtualPDF = 1;
    
    // Reseta o zoom sempre que abrir
    zoomLevelPDF = 1.0;
    setTimeout(aplicarZoomPDF, 50); // Pequeno delay para garantir que o CSS carregou

    if (tipo === 'Ancestralidade') {
        totalPaginasPDF = 20; 
    } else {
        totalPaginasPDF = 14; 
    }

    document.getElementById('titulo-leitor-pdf').innerText = tipo;
    atualizarImagemLeitor();
    document.getElementById('modal-leitor-pdf').style.display = 'flex';
};

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
    const numFormatado = String(paginaAtualPDF).padStart(3, '0');
    
    let caminho = "";
    if (tipoAtualPDF === 'Ancestralidade') {
        caminho = `img/ancestralidade-pdf/Ancestralidades_pag_${numFormatado}.jpg`;
    } else {
        caminho = `img/comunidade-pdf/Comunidade_pag_${numFormatado}.jpg`;
    }
    
    imgElement.src = caminho;
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