// =========================================================
// SISTEMA DE MEDO (FEAR) - ATUALIZADO
// =========================================================

const MAX_MEDO = 10;
const REF_MEDO = 'mesa_rpg/medo';

// --- FUNÇÕES DE CONTROLE (MESTRE) ---

window.adicionarMedo = function() {
    window.get(window.ref(window.db, REF_MEDO)).then(snap => {
        const atual = (snap.exists() && snap.val().qtd) ? snap.val().qtd : 0;
        if (atual < MAX_MEDO) {
            window.update(window.ref(window.db, REF_MEDO), {
                qtd: atual + 1,
                aviso: { tipo: 'add', timestamp: Date.now() }
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
                aviso: { tipo: 'use', timestamp: Date.now() }
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
    const elContainer = document.getElementById('medo-container');
    
    window.onValue(window.ref(window.db, REF_MEDO), (snapshot) => {
        const dados = snapshot.val();
        if (!dados) return;

        const qtd = dados.qtd || 0;

        // 1. Atualiza Painel Mestre
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
                    // Clique silencioso para mestre corrigir
                    if (window.nomeJogador === 'Mestre') {
                        token.onclick = (e) => {
                            e.stopPropagation();
                            window.removerMedoSilencioso();
                        };
                    }
                    slot.appendChild(token);
                }
                container.appendChild(slot);
            }
        }

        // 2. Dispara Efeitos (Som e Tela)
        // Verifica se o aviso tem menos de 3 segundos
        if (dados.aviso && (Date.now() - dados.aviso.timestamp < 3000)) {
            mostrarMensagemMedo(dados.aviso.tipo);
        }
    });
};

function mostrarMensagemMedo(tipo) {
    const overlay = document.getElementById('medo-overlay-msg');
    if (!overlay) return;

    // Reset para permitir re-animar
    overlay.classList.remove('ativo');
    void overlay.offsetWidth; // Força o navegador a recalcular (reflow)

    // Tocar Som
    const idAudio = (tipo === 'add') ? 'sound-medo-add' : 'sound-medo-use';
    const audio = document.getElementById(idAudio);
    if (audio) {
        audio.volume = 0.35;
        audio.currentTime = 0;
        audio.play().catch(err => console.log("Erro som:", err));
    }

    // Configurar Texto
    if (tipo === 'add') {
        overlay.innerHTML = `<div class="msg-medo-texto">👁️ O Mestre recolheu <span style="color:#d0a0ff">MEDO</span>...</div>`;
    } else if (tipo === 'use') {
        overlay.innerHTML = `<div class="msg-medo-texto msg-medo-uso">⚡ O Mestre usou um token de <span style="color:#bf00ff">MEDO</span>!</div>`;
    }

    // Ativar Animação CSS
    overlay.classList.add('ativo');

    // Remover após 4s
    setTimeout(() => {
        overlay.classList.remove('ativo');
    }, 4000);
}