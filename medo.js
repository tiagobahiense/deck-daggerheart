// =========================================================
// SISTEMA DE MEDO (FEAR) - SINCRONIA E EFEITOS
// =========================================================

// Configurações
const MAX_MEDO = 10;
const REF_MEDO = 'mesa_rpg/medo';

// --- FUNÇÕES DE CONTROLE (MESTRE) ---

window.adicionarMedo = function() {
    window.get(window.ref(window.db, REF_MEDO)).then(snap => {
        const atual = (snap.exists() && snap.val().qtd) ? snap.val().qtd : 0;
        if (atual < MAX_MEDO) {
            window.update(window.ref(window.db, REF_MEDO), {
                qtd: atual + 1,
                aviso: { tipo: 'add', timestamp: Date.now() } // Dispara mensagem
            });
        }
    });
};

window.usarMedo = function() {
    window.get(window.ref(window.db, REF_MEDO)).then(snap => {
        const atual = (snap.exists() && snap.val().qtd) ? snap.val().qtd : 0;
        if (atual > 0) {
            window.update(window.ref(window.db, REF_MEDO), {
                qtd: atual - 1,
                aviso: { tipo: 'use', timestamp: Date.now() } // Dispara mensagem
            });
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

// --- OUVINTE REALTIME (TODOS) ---

window.iniciarSistemaMedo = function() {
    const elContainer = document.getElementById('medo-container'); // Só existe no Mestre
    
    window.onValue(window.ref(window.db, REF_MEDO), (snapshot) => {
        const dados = snapshot.val();
        if (!dados) return;

        const qtd = dados.qtd || 0;

        // 1. Atualiza visual do painel do Mestre (se existir)
        if (elContainer) {
            elContainer.innerHTML = `
                <div class="medo-header">
                    <span class="medo-titulo">MEDO: ${qtd}/${MAX_MEDO}</span>
                    <div class="medo-botoes">
                        <button class="btn-medo btn-add" onclick="window.adicionarMedo()">+ Adicionar</button>
                        <button class="btn-medo btn-use" onclick="window.usarMedo()">⚡ Usar</button>
                    </div>
                </div>
                <div id="medo-tokens-grid"></div>
            `;
            const container = document.getElementById('medo-tokens-grid');
            // Preenche slots
            for (let i = 0; i < MAX_MEDO; i++) {
                const slot = document.createElement('div');
                slot.className = 'medo-slot';
                if (i < qtd) {
                    const token = document.createElement('div');
                    token.className = 'medo-token';
                    token.title = "Clique para remover silenciosamente";
                    // Se for mestre, permite clicar para remover
                    if (window.nomeJogador === 'Mestre') {
                        token.onclick = (e) => {
                            e.stopPropagation(); // Evita bugs
                            window.removerMedoSilencioso();
                        };
                    }
                    slot.appendChild(token);
                }
                container.appendChild(slot);
            }
        }

        // 2. Dispara a Mensagem Sombria E O SOM (Se houver aviso recente < 3s)
        if (dados.aviso && (Date.now() - dados.aviso.timestamp < 3000)) {
            mostrarMensagemMedo(dados.aviso.tipo);
        }
    });
};

function mostrarMensagemMedo(tipo) {
    const overlay = document.getElementById('medo-overlay-msg');
    if (!overlay) return;

    // Reseta animação visual
    overlay.className = '';
    void overlay.offsetWidth; // Força reflow

    // --- LÓGICA DE ÁUDIO NOVA ---
    const idAudio = (tipo === 'add') ? 'sound-medo-add' : 'sound-medo-use';
    const audio = document.getElementById(idAudio);
    
    if (audio) {
        audio.volume = 0.35; // Igual ao uso de carta
        audio.currentTime = 0; // Reinicia se estiver tocando
        audio.play().catch(e => console.log("Erro ao tocar som de medo:", e));
    }
    // ----------------------------

    if (tipo === 'add') {
        overlay.innerHTML = `<div class="msg-medo-texto">👁️ O Mestre recolheu <span style="color:#d0a0ff">MEDO</span>...</div>`;
    } else if (tipo === 'use') {
        overlay.innerHTML = `<div class="msg-medo-texto msg-medo-uso">⚡ O Mestre usou um token de <span style="color:#bf00ff">MEDO</span>!</div>`;
    }

    overlay.classList.add('ativo');

    // Remove a mensagem após 4s
    setTimeout(() => {
        overlay.classList.remove('ativo');
    }, 4000);
}