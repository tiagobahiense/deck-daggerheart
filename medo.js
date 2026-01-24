// =========================================================
// SISTEMA DE MEDO (FEAR) - COM LOG
// =========================================================

const MAX_MEDO = 10;
const REF_MEDO = 'mesa_rpg/medo';

window.adicionarMedo = function() {
    window.get(window.ref(window.db, REF_MEDO)).then(snap => {
        const atual = (snap.exists() && snap.val().qtd) ? snap.val().qtd : 0;
        if (atual < MAX_MEDO) {
            window.update(window.ref(window.db, REF_MEDO), {
                qtd: atual + 1,
                aviso: { tipo: 'add', timestamp: Date.now() }
            });
            
            // FRASE DRAMÁTICA COM COR
            if(window.registrarLog) window.registrarLog('medo', 
                `👁️ O Mestre recolheu <span class="texto-medo-mestre">MEDO</span>...`);
        }
    });
};

window.usarMedo = function() {
    window.get(window.ref(window.db, REF_MEDO)).then(snap => {
        const atual = (snap.exists() && snap.val().qtd) ? snap.val().qtd : 0;
        if (atual > 0) {
            window.update(window.ref(window.db, REF_MEDO), {
                qtd: atual - 1,
                aviso: { tipo: 'use', timestamp: Date.now() }
            });
            
            // FRASE DRAMÁTICA COM COR
            if(window.registrarLog) window.registrarLog('medo', 
                `🌑 A sombra cresce: o <span class="texto-medo-mestre">MEDO</span> foi imposto.`);
        }
    });
};
window.removerMedoSilencioso = function() {
    window.get(window.ref(window.db, REF_MEDO)).then(snap => {
        const atual = (snap.exists() && snap.val().qtd) ? snap.val().qtd : 0;
        if (atual > 0) {
            window.update(window.ref(window.db, REF_MEDO), { qtd: atual - 1 });
        }
    });
};

// A parte de iniciarSistemaMedo continua igual a antes...
window.iniciarSistemaMedo = function() {
    const elContainer = document.getElementById('medo-container');
    window.onValue(window.ref(window.db, REF_MEDO), (snapshot) => {
        const dados = snapshot.val();
        if (!dados) return;
        const qtd = dados.qtd || 0;

        if (elContainer) {
            elContainer.innerHTML = `
                <div class="medo-header">
                    <span class="medo-titulo">MEDO: ${qtd}/${MAX_MEDO}</span>
                    <div class="medo-botoes">
                        <button class="btn-medo btn-add" onclick="window.adicionarMedo()">+ Add</button>
                        <button class="btn-medo btn-use" onclick="window.usarMedo()">⚡ Usar</button>
                    </div>
                </div>
                <div id="medo-tokens-grid"></div>
            `;
            const container = document.getElementById('medo-tokens-grid');
            for (let i = 0; i < MAX_MEDO; i++) {
                const slot = document.createElement('div');
                slot.className = 'medo-slot';
                if (i < qtd) {
                    const token = document.createElement('div');
                    token.className = 'medo-token';
                    if (window.nomeJogador === 'Mestre') {
                        token.onclick = (e) => { e.stopPropagation(); window.removerMedoSilencioso(); };
                    }
                    slot.appendChild(token);
                }
                container.appendChild(slot);
            }
        }
        if (dados.aviso && (Date.now() - dados.aviso.timestamp < 3000)) {
            mostrarMensagemMedo(dados.aviso.tipo);
        }
    });
};

function mostrarMensagemMedo(tipo) {
    const overlay = document.getElementById('medo-overlay-msg');
    if (!overlay) return;
    overlay.classList.remove('ativo');
    void overlay.offsetWidth;
    const idAudio = (tipo === 'add') ? 'sound-medo-add' : 'sound-medo-use';
    const audio = document.getElementById(idAudio);
    if (audio) { audio.volume = 0.20; audio.currentTime = 0; audio.play().catch(err => {}); }
    if (tipo === 'add') {
        overlay.innerHTML = `<div class="msg-medo-texto">👁️ O Mestre recolheu <span style="color:#d0a0ff">MEDO</span>...</div>`;
    } else if (tipo === 'use') {
        overlay.innerHTML = `<div class="msg-medo-texto msg-medo-uso">🌑 A sombra cresce: o <span style="color:#bf00ff">MEDO</span> foi imposto.</div>`;
    }
    overlay.classList.add('ativo');
    setTimeout(() => { overlay.classList.remove('ativo'); }, 4000);
}