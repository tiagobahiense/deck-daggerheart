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

// Remove clicando (sem aviso global)
window.removerMedoSilencioso = function() {
    window.get(window.ref(window.db, REF_MEDO)).then(snap => {
        const atual = (snap.exists() && snap.val().qtd) ? snap.val().qtd : 0;
        if (atual > 0) {
            // Atualiza só a qtd, sem o objeto 'aviso'
            window.update(window.ref(window.db, REF_MEDO), { qtd: atual - 1 });
        }
    });
};

// --- RENDERIZAÇÃO E LISTENERS (TODOS) ---

window.iniciarSistemaMedo = function() {
    if (!window.db || !window.onValue) {
        setTimeout(window.iniciarSistemaMedo, 500);
        return;
    }

    const container = document.getElementById('medo-grid-slots');
    const overlay = document.getElementById('medo-overlay-msg');
    
    // Listener do Firebase
    window.onValue(window.ref(window.db, REF_MEDO), (snap) => {
        const dados = snap.val() || { qtd: 0 };
        const qtd = dados.qtd || 0;

        // 1. Atualiza o Grid (Visual das bolinhas)
        if (container) {
            container.innerHTML = '';
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

        // 2. Dispara a Mensagem Sombria (Se houver aviso recente < 3s)
        if (dados.aviso && (Date.now() - dados.aviso.timestamp < 3000)) {
            mostrarMensagemMedo(dados.aviso.tipo);
        }
    });
};

function mostrarMensagemMedo(tipo) {
    const overlay = document.getElementById('medo-overlay-msg');
    if (!overlay) return;

    // Reseta animação
    overlay.className = '';
    void overlay.offsetWidth; // Força reflow

    if (tipo === 'add') {
        overlay.innerHTML = `<div class="msg-medo-texto">👁️ O Mestre recolheu <span style="color:#d0a0ff">MEDO</span>...</div>`;
    } else if (tipo === 'use') {
        overlay.innerHTML = `<div class="msg-medo-texto msg-medo-gasto">🔥 O Mestre impôs <span style="color:#ffcccc">MEDO</span>!</div>`;
    }

    overlay.classList.add('anim-medo-aparecer');
}