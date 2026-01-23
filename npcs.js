// =========================================================
// SISTEMA DE NPCS (GERENCIAMENTO E APRESENTAÇÃO)
// =========================================================

const REF_NPCS = 'mesa_rpg/npcs_data';   
const REF_NPC_ATIVO = 'mesa_rpg/npc_ativo'; 

// Estado local do preview
window.npcAtualEstado = { id: null, dados: null, visivel: false };

// --- FUNÇÕES DE CRIAÇÃO ---

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
    if(confirm("Tem certeza que deseja excluir este NPC?")) {
        window.remove(window.ref(window.db, `${REF_NPCS}/${id}`));
        // Se ele estiver ativo na tela, remove também
        window.get(window.ref(window.db, REF_NPC_ATIVO)).then(snap => {
            if(snap.exists() && snap.val().id === id) {
                window.recolherNPC();
            }
        });
    }
};

// --- FUNÇÕES DE APRESENTAÇÃO (COM TOGGLE) ---

// 1. Abre o Preview para o Mestre (Reseta estado para Oculto)
window.apresentarNPC = function(id, dados) {
    const previewMestre = document.getElementById('gm-npc-preview-modal');
    
    // Reseta estado local
    window.npcAtualEstado = { id: id, dados: dados, visivel: false };

    // HTML do Preview com botão TOGGLE
    previewMestre.innerHTML = `
        <img src="${dados.imagem}" class="gm-npc-img">
        <h2 style="color:var(--gold); margin:5px 0;">${dados.nome}</h2>
        <div class="gm-npc-info">
            <div class="desc-box-jogador"><strong>👁️ Jogadores veem:</strong><br>${dados.desc_jogador || '...'}</div>
            <div class="desc-box-mestre"><strong>🔒 Mestre vê:</strong><br>${dados.desc_mestre || '...'}</div>
        </div>
        
        <button id="btn-eye-toggle" class="btn-eye-npc oculto" onclick="window.toggleVisibilidadeNPC()">
            🙈 Oculto para Jogadores
        </button>

        <button onclick="window.recolherNPC()" style="margin-top:10px; padding:10px; background:#333; color:#ddd; border:1px solid #555; cursor:pointer; width:100%;">
            ❌ Fechar Janela
        </button>
    `;
    previewMestre.style.display = 'flex';
};

// 2. Função que Liga/Desliga a visibilidade (SEM ALERT)
window.toggleVisibilidadeNPC = function() {
    const btn = document.getElementById('btn-eye-toggle');
    const estado = window.npcAtualEstado;

    if (!estado.visivel) {
        // MOSTRAR
        estado.visivel = true;
        
        // Atualiza Botão para VERDE
        btn.className = "btn-eye-npc visivel";
        btn.innerHTML = "👁️ VISÍVEL PARA JOGADORES";

        // Manda pro Firebase
        window.set(window.ref(window.db, REF_NPC_ATIVO), {
            id: estado.id,
            nome: estado.dados.nome,
            imagem: estado.dados.imagem,
            desc_jogador: estado.dados.desc_jogador,
            ativo: true
        });

    } else {
        // OCULTAR
        estado.visivel = false;

        // Atualiza Botão para VERMELHO
        btn.className = "btn-eye-npc oculto";
        btn.innerHTML = "🙈 Oculto para Jogadores";

        // Remove do Firebase
        window.set(window.ref(window.db, REF_NPC_ATIVO), null);
    }
};

// 3. Fecha janela e limpa tela
window.recolherNPC = function() {
    document.getElementById('gm-npc-preview-modal').style.display = 'none';
    window.set(window.ref(window.db, REF_NPC_ATIVO), null);
    window.npcAtualEstado = { id: null, dados: null, visivel: false };
};

// --- LISTENERS (CARREGAMENTO) ---

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
        
        Object.keys(npcs).forEach(key => {
            const npc = npcs[key];
            const div = document.createElement('div');
            div.className = `npc-list-item`;
            div.innerHTML = `
                <span onclick='window.apresentarNPC("${key}", ${JSON.stringify(npc)})' style="flex:1;">${npc.nome}</span>
                <button class="btn-del-npc" onclick="window.deletarNPC('${key}')">X</button>
            `;
            listaContainer.appendChild(div);
        });
    });
};

window.monitorarNPCAtivo = function() {
    const overlay = document.getElementById('player-npc-overlay');
    if(!overlay) return;
    
    window.onValue(window.ref(window.db, REF_NPC_ATIVO), (snap) => {
        const dados = snap.val();

        if (dados && dados.ativo) {
            overlay.innerHTML = `
                ${dados.imagem ? `<img src="${dados.imagem}" class="player-npc-img">` : ''}
                <div class="player-npc-name">${dados.nome}</div>
                ${dados.desc_jogador ? `<div class="player-npc-desc">${dados.desc_jogador}</div>` : ''}
            `;
            requestAnimationFrame(() => { overlay.classList.add('ativo'); });
        } else {
            overlay.classList.remove('ativo');
        }
    });
};