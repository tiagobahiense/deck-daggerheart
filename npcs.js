// =========================================================
// SISTEMA DE NPCS (GERENCIAMENTO E APRESENTAÇÃO)
// =========================================================

const REF_NPCS = 'mesa_rpg/npcs_data';   // Onde ficam salvos os dados
const REF_NPC_ATIVO = 'mesa_rpg/npc_ativo'; // Qual está aparecendo na tela agora

// --- FUNÇÕES DO MESTRE ---

window.abrirCriadorNPC = function() {
    document.getElementById('modal-criar-npc').style.display = 'flex';
};

window.fecharCriadorNPC = function() {
    document.getElementById('modal-criar-npc').style.display = 'none';
};

window.processarUploadNPC = function() {
    const fileInput = document.getElementById('npc-upload-input');
    const preview = document.getElementById('preview-npc-mini');
    const urlInput = document.getElementById('new-npc-img-data'); // Input hidden pra guardar base64

    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            preview.src = e.target.result;
            preview.style.display = 'block';
            urlInput.value = e.target.result; // Salva o Base64
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
};

window.salvarNovoNPC = function() {
    const nome = document.getElementById('new-npc-name').value;
    const img = document.getElementById('new-npc-img-data').value; // Base64
    const descJog = document.getElementById('new-npc-desc-player').value;
    const descGm = document.getElementById('new-npc-desc-gm').value;

    if (!nome) return alert("O NPC precisa de um nome.");

    const novoNPC = {
        nome: nome,
        imagem: img || '', // Pode ser vazio se for só texto
        desc_jogador: descJog,
        desc_mestre: descGm,
        timestamp: Date.now()
    };

    window.push(window.ref(window.db, REF_NPCS), novoNPC).then(() => {
        window.fecharCriadorNPC();
        // Limpar campos
        document.getElementById('new-npc-name').value = '';
        document.getElementById('new-npc-desc-player').value = '';
        document.getElementById('new-npc-desc-gm').value = '';
        document.getElementById('new-npc-img-data').value = '';
        document.getElementById('preview-npc-mini').style.display = 'none';
        alert("NPC Criado!");
    });
};

window.deletarNPC = function(id) {
    if(confirm("Tem certeza que deseja excluir este NPC permanentemente?")) {
        window.remove(window.ref(window.db, `${REF_NPCS}/${id}`));
        // Se ele estiver ativo na tela, remove também
        window.get(window.ref(window.db, REF_NPC_ATIVO)).then(snap => {
            if(snap.exists() && snap.val().id === id) {
                window.recolherNPC();
            }
        });
    }
};

// Exibe o NPC na tela do Mestre (Preview Central) e manda pro Jogador
window.apresentarNPC = function(id, dados) {
    // 1. Mostrar no Grid do Mestre (Preview)
    const previewMestre = document.getElementById('gm-npc-preview-modal');
    previewMestre.innerHTML = `
        <img src="${dados.imagem}" class="gm-npc-img">
        <h2 style="color:var(--gold); margin:5px 0;">${dados.nome}</h2>
        <div class="gm-npc-info">
            <div class="desc-box-jogador"><strong>👁️ Jogadores veem:</strong><br>${dados.desc_jogador || '...'}</div>
            <div class="desc-box-mestre"><strong>🔒 Mestre vê:</strong><br>${dados.desc_mestre || '...'}</div>
        </div>
        <button onclick="window.recolherNPC()" style="margin-top:15px; padding:10px; background:#8b0000; color:white; border:1px solid red; cursor:pointer; width:100%;">Recolher NPC (Sair da Tela)</button>
    `;
    previewMestre.style.display = 'flex';

    // 2. Atualizar Firebase para aparecer no Jogador
    window.set(window.ref(window.db, REF_NPC_ATIVO), {
        id: id,
        ...dados,
        ativo: true
    });
};

window.recolherNPC = function() {
    // Esconde do Mestre
    document.getElementById('gm-npc-preview-modal').style.display = 'none';
    
    // Esconde do Jogador (Update Firebase)
    window.set(window.ref(window.db, REF_NPC_ATIVO), null);
};

// --- LISTENERS (CARREGAMENTO) ---

// 1. Carregar Lista de NPCs (Apenas Mestre)
window.carregarListaNPCs = function() {
    const listaContainer = document.getElementById('npc-list-scroll');
    if (!listaContainer) return; // Não é mestre

    window.onValue(window.ref(window.db, REF_NPCS), (snap) => {
        listaContainer.innerHTML = '';
        if (!snap.exists()) {
            listaContainer.innerHTML = '<p style="color:#666; font-size:0.8rem; text-align:center;">Nenhum NPC criado.</p>';
            return;
        }

        const npcs = snap.val();
        
        // Verifica qual está ativo para marcar na lista
        window.get(window.ref(window.db, REF_NPC_ATIVO)).then(ativoSnap => {
            const idAtivo = ativoSnap.exists() ? ativoSnap.val().id : null;

            Object.keys(npcs).forEach(key => {
                const npc = npcs[key];
                const div = document.createElement('div');
                div.className = `npc-list-item ${idAtivo === key ? 'ativo' : ''}`;
                div.innerHTML = `
                    <span onclick='window.apresentarNPC("${key}", ${JSON.stringify(npc)})' style="flex:1;">${npc.nome}</span>
                    <button class="btn-del-npc" onclick="window.deletarNPC('${key}')">X</button>
                `;
                listaContainer.appendChild(div);
            });
        });
    });
};

// 2. Monitorar NPC Ativo (Para o Jogador e para Sync do Mestre)
window.monitorarNPCAtivo = function() {
    const overlay = document.getElementById('player-npc-overlay');
    
    window.onValue(window.ref(window.db, REF_NPC_ATIVO), (snap) => {
        const dados = snap.val();

        if (dados && dados.ativo) {
            // MOSTRAR (Slide In)
            overlay.innerHTML = `
                ${dados.imagem ? `<img src="${dados.imagem}" class="player-npc-img">` : ''}
                <div class="player-npc-name">${dados.nome}</div>
                ${dados.desc_jogador ? `<div class="player-npc-desc">${dados.desc_jogador}</div>` : ''}
            `;
            
            // Pequeno delay para garantir a transição
            requestAnimationFrame(() => {
                overlay.classList.add('ativo');
            });

        } else {
            // ESCONDER (Slide Out)
            overlay.classList.remove('ativo');
        }
    });
};