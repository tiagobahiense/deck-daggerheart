// =========================================================
// SISTEMA DE NPCS (GERENCIAMENTO E APRESENTAÇÃO)
// =========================================================

const REF_NPCS = 'mesa_rpg/npcs_data';   
const REF_NPC_ATIVO = 'mesa_rpg/npc_ativo'; 

// --- FUNÇÕES DO MESTRE ---

window.abrirCriadorNPC = function() {
    const modal = document.getElementById('modal-criar-npc');
    if(modal) modal.style.display = 'flex';
};

window.fecharCriadorNPC = function() {
    const modal = document.getElementById('modal-criar-npc');
    if(modal) modal.style.display = 'none';
};

window.processarUploadNPC = function() {
    const fileInput = document.getElementById('npc-upload-input');
    const preview = document.getElementById('preview-npc-mini');
    const urlInput = document.getElementById('new-npc-img-data');

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            urlInput.value = e.target.result;
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
};

window.salvarNovoNPC = function() {
    const nome = document.getElementById('new-npc-name').value;
    const img = document.getElementById('new-npc-img-data').value;
    const descJog = document.getElementById('new-npc-desc-player').value;
    const descGm = document.getElementById('new-npc-desc-gm').value;

    if (!nome) return alert("O NPC precisa de um nome.");

    const novoNPC = {
        nome: nome,
        imagem: img || '',
        desc_jogador: descJog,
        desc_mestre: descGm,
        timestamp: Date.now()
    };

    window.push(window.ref(window.db, REF_NPCS), novoNPC).then(() => {
        window.fecharCriadorNPC();
        document.getElementById('new-npc-name').value = '';
        document.getElementById('new-npc-desc-player').value = '';
        document.getElementById('new-npc-desc-gm').value = '';
        document.getElementById('new-npc-img-data').value = '';
        document.getElementById('preview-npc-mini').style.display = 'none';
        alert("NPC Criado!");
    });
};

window.deletarNPC = function(id) {
    if(confirm("Excluir este NPC permanentemente?")) {
        window.remove(window.ref(window.db, `${REF_NPCS}/${id}`));
        // Se estiver ativo, recolhe
        window.get(window.ref(window.db, REF_NPC_ATIVO)).then(snap => {
            if(snap.exists() && snap.val().id === id) {
                window.recolherNPC();
            }
        });
    }
};

// 1. Abre o Preview para o Mestre (Ainda não mostra pro jogador)
window.abrirPreviewNPC = function(id, dados) {
    const previewMestre = document.getElementById('gm-npc-preview-modal');
    
    // Converte objeto para string para passar no onclick
    // (Gambiarra segura: salva no window temporariamente para evitar erro de aspas)
    window.tempNPC = { id, ...dados };

    previewMestre.innerHTML = `
        <img src="${dados.imagem}" class="gm-npc-img">
        <h2 style="color:var(--gold); margin:5px 0;">${dados.nome}</h2>
        
        <div class="gm-npc-info">
            <div class="desc-box-jogador">
                <strong>👁️ Jogadores verão:</strong><br>${dados.desc_jogador || '...'}
            </div>
            <div class="desc-box-mestre">
                <strong>🔒 Mestre vê:</strong><br>${dados.desc_mestre || '...'}
            </div>
        </div>

        <button class="btn-action-npc btn-show-player" onclick="window.transmitirNPC()">📡 MOSTRAR AOS JOGADORES</button>
        <button class="btn-action-npc btn-hide-player" onclick="window.recolherNPC()">❌ FECHAR / RECOLHER</button>
    `;
    
    previewMestre.style.display = 'flex';
};

// 2. Transmite para o Firebase (Aparece na tela de todos)
window.transmitirNPC = function() {
    if(!window.tempNPC) return;
    
    const dados = window.tempNPC;
    window.set(window.ref(window.db, REF_NPC_ATIVO), {
        id: dados.id,
        nome: dados.nome,
        imagem: dados.imagem,
        desc_jogador: dados.desc_jogador,
        ativo: true
    }).then(() => {
        alert("NPC Enviado para a tela dos jogadores!");
    });
};

// 3. Recolhe (Limpa a tela)
window.recolherNPC = function() {
    document.getElementById('gm-npc-preview-modal').style.display = 'none';
    window.set(window.ref(window.db, REF_NPC_ATIVO), null); // Limpa no banco
    window.tempNPC = null;
};

// --- LISTENERS (CARREGAMENTO) ---

// Carregar Lista de NPCs (Apenas Mestre)
window.carregarListaNPCs = function() {
    const listaContainer = document.getElementById('npc-list-scroll');
    if (!listaContainer) return;

    window.onValue(window.ref(window.db, REF_NPCS), (snap) => {
        listaContainer.innerHTML = '';
        if (!snap.exists()) {
            listaContainer.innerHTML = '<p style="color:#666; font-size:0.8rem; text-align:center;">Vazio.</p>';
            return;
        }

        const npcs = snap.val();
        
        // Verifica qual está ativo para marcar na lista
        window.get(window.ref(window.db, REF_NPC_ATIVO)).then(ativoSnap => {
            const idAtivo = ativoSnap.exists() ? ativoSnap.val().id : null;

            Object.keys(npcs).forEach(key => {
                const npc = npcs[key];
                // Cria elemento da lista
                const div = document.createElement('div');
                div.className = `npc-list-item ${idAtivo === key ? 'ativo' : ''}`;
                
                // Texto clicável para abrir preview
                const spanNome = document.createElement('span');
                spanNome.style.flex = '1';
                spanNome.innerText = npc.nome;
                spanNome.onclick = () => window.abrirPreviewNPC(key, npc);

                // Botão deletar
                const btnDel = document.createElement('button');
                btnDel.className = 'btn-del-npc';
                btnDel.innerText = 'X';
                btnDel.onclick = (e) => { e.stopPropagation(); window.deletarNPC(key); };

                div.appendChild(spanNome);
                div.appendChild(btnDel);
                listaContainer.appendChild(div);
            });
        });
    });
};

// Monitorar NPC Ativo (Para o Jogador e para Sync do Mestre)
window.monitorarNPCAtivo = function() {
    const overlay = document.getElementById('player-npc-overlay');
    if(!overlay) return; // Se não tiver o elemento no HTML (ex: admin), ignora
    
    window.onValue(window.ref(window.db, REF_NPC_ATIVO), (snap) => {
        const dados = snap.val();

        if (dados && dados.ativo) {
            // MOSTRAR (Slide In)
            overlay.innerHTML = `
                ${dados.imagem ? `<img src="${dados.imagem}" class="player-npc-img">` : ''}
                <div class="player-npc-name">${dados.nome}</div>
                ${dados.desc_jogador ? `<div class="player-npc-desc">${dados.desc_jogador}</div>` : ''}
            `;
            // Força reflow e anima
            overlay.classList.add('ativo');
        } else {
            // ESCONDER (Slide Out)
            overlay.classList.remove('ativo');
        }
    });
};