// =========================================================
// SISTEMA DE INIMIGOS V5.0 (SYNC INSTANTÂNEO & BARRA PF)
// =========================================================

// --- FUNÇÕES DE CONTROLE (MESTRE) ---

window.abrirCriadorInimigo = function() {
    document.getElementById('modal-criar-inimigo').style.display = 'flex';
};

window.fecharCriadorInimigo = function() {
    document.getElementById('modal-criar-inimigo').style.display = 'none';
};

window.salvarNovoInimigo = function() {
    if (!window.db || !window.push || !window.ref) return;

    const nome = document.getElementById('new-enemy-name').value || "Inimigo";
    const img = document.getElementById('new-enemy-img').value || '';
    const pvMax = parseInt(document.getElementById('new-enemy-pv').value) || 1;
    const pfMax = parseInt(document.getElementById('new-enemy-pf').value) || 0;
    const dif = parseInt(document.getElementById('new-enemy-dif').value) || 12;
    
    const limiares = document.getElementById('new-enemy-limiares').value || "-";
    const ataque = document.getElementById('new-enemy-atk').value || "+0";
    const dano = document.getElementById('new-enemy-dmg').value || "-";
    const desc = document.getElementById('new-enemy-desc').value || "";

    const novoInimigo = {
        nome: nome,
        imagem: img,
        pv_max: pvMax, pv_atual: pvMax,
        pf_max: pfMax, pf_atual: 0,
        dificuldade: dif,
        limiares: limiares,
        ataque: ataque,
        dano: dano,
        detalhes: desc,
        visivel: false, // PADRÃO: INVISÍVEL
        efeitoVisual: null
    };

    window.push(window.ref(window.db, 'mesa_rpg/inimigos'), novoInimigo)
        .then(() => window.fecharCriadorInimigo());
};

window.removerTodosInimigos = function() {
    if(confirm("Limpar toda a mesa de batalha?")) {
        window.remove(window.ref(window.db, 'mesa_rpg/inimigos'));
    }
};

window.alterarStatusInimigo = function(id, tipo, delta) {
    const refPath = window.ref(window.db, `mesa_rpg/inimigos/${id}`);
    window.get(refPath).then(snap => {
        if(!snap.exists()) return;
        const data = snap.val();
        
        // Verifica limite baseado no tipo (PV ou PF)
        const max = tipo === 'pv_atual' ? data.pv_max : (data.pf_max || 0);
        let novo = (data[tipo] || 0) + delta;
        
        if(novo < 0) novo = 0;
        if(novo > max) novo = max;
        
        const updates = {};
        updates[tipo] = novo;
        
        // Efeito visual apenas para PV (Dano/Cura)
        if(tipo === 'pv_atual') {
            updates['efeitoVisual'] = { tipo: delta < 0 ? 'dano' : 'cura', time: Date.now() };
        }
        
        window.update(refPath, updates);
    });
};

window.toggleVisibilidadeInimigo = function(id) {
    const refPath = window.ref(window.db, `mesa_rpg/inimigos/${id}/visivel`);
    window.get(refPath).then(snap => {
        const atual = snap.val();
        window.set(refPath, !atual); // Inverte e salva
    });
};

window.deletarInimigoIndividual = function(id) {
    if(confirm("Remover este inimigo?")) {
        window.remove(window.ref(window.db, `mesa_rpg/inimigos/${id}`));
    }
};

window.toggleDetalhesToken = function(id) {
    const el = document.getElementById(`detalhes-${id}`);
    if(el) el.classList.toggle('ativo');
};

// --- RENDERIZAÇÃO ---

// Variável para evitar loops, mas permitindo reiniciar
let listenerAtivo = false;

window.iniciarSistemaInimigos = function() {
    // Se o Firebase ainda não carregou no módulo principal, tenta de novo em breve
    if (!window.db || !window.onValue) {
        console.log("⏳ (Inimigos) Aguardando conexão DB...");
        setTimeout(window.iniciarSistemaInimigos, 500);
        return;
    }
    
    // Identifica Mestre ou Jogador
    const isGM = (window.nomeJogador === "Mestre") || (document.getElementById('controles-mestre') !== null);
    document.body.classList.remove('modo-mestre', 'modo-jogador');
    document.body.classList.add(isGM ? 'modo-mestre' : 'modo-jogador');

    const container = document.getElementById('area-inimigos');
    if (!container) return;

    console.log("🚀 Sistema de Inimigos Iniciado. Modo GM:", isGM);

    // Conecta ao Firebase (Realtime)
    // O onValue dispara SEMPRE que algo muda no banco
    window.onValue(window.ref(window.db, 'mesa_rpg/inimigos'), (snap) => {
        container.innerHTML = ""; // Limpa a tela
        
        if(!snap.exists()) return; // Se não tem inimigos, fica vazio

        const inimigos = snap.val();
        
        // Renderiza cada inimigo
        Object.keys(inimigos).forEach(key => {
            const data = inimigos[key];
            
            // LÓGICA DE VISIBILIDADE
            // Se NÃO for GM e o monstro estiver invisível, pula e não desenha nada
            if (!isGM && !data.visivel) return; 

            container.appendChild(criarTokenInimigo(key, data, isGM));
        });
    });
};

function criarTokenInimigo(id, data, isGM) {
    const el = document.createElement('div');
    el.className = 'inimigo-token';
    
    // Se for GM e o monstro estiver invisível, adiciona classe visual (transparente)
    if(isGM && !data.visivel) el.classList.add('invisivel');
    
    el.id = `token-${id}`;
    
    // Animação de Dano/Cura
    if (data.efeitoVisual && (Date.now() - data.efeitoVisual.time < 800)) {
        el.classList.add(data.efeitoVisual.tipo === 'dano' ? 'anim-hit-red' : 'anim-hit-green');
        setTimeout(() => el.classList.remove('anim-hit-red', 'anim-hit-green'), 800);
    }

    // Porcentagens das Barras
    const pvPct = Math.max(0, (data.pv_atual / data.pv_max) * 100);
    
    // Tratamento de PF (Estresse)
    const pfMax = data.pf_max || 0;
    const pfAtual = data.pf_atual || 0;
    const pfPct = pfMax > 0 ? Math.max(0, (pfAtual / pfMax) * 100) : 0;
    
    // Imagem
    const imgSrc = data.imagem && data.imagem.length > 10 ? data.imagem : 'img/monsters/default.png';

    // === BOTÕES DE CONTROLE DE PF (AZUL) ===
    let pfControlsHTML = '';
    if (pfMax > 0 && isGM) {
        pfControlsHTML = `
            <div class="gm-btn-row">
                <div class="btn-gm-mini btn-gm-est-dano" onclick="alterarStatusInimigo('${id}', 'pf_atual', -1)" title="-1 Estresse">-</div>
                <div class="btn-gm-mini btn-gm-est-cura" onclick="alterarStatusInimigo('${id}', 'pf_atual', 1)" title="+1 Estresse">+</div>
            </div>
        `;
    }

    // === BARRA DE PF (AZUL) ===
    let pfBarraHTML = '';
    if (pfMax > 0) {
        pfBarraHTML = `
            <div class="barra-mini" style="margin-top:2px;" title="Estresse: ${pfAtual}/${pfMax}">
                <div class="fill-pf" style="width: ${pfPct}%"></div>
            </div>
        `;
    }

    // === HTML CONDICIONAL (GM vs JOGADOR) ===
    let controlsHTML = '';
    if(isGM) {
        controlsHTML = `
            <div class="token-gm-controls">
                <div class="gm-btn-row">
                    <div class="btn-gm-mini btn-gm-dano" onclick="alterarStatusInimigo('${id}', 'pv_atual', -1)" title="-1 PV (Dano)">-</div>
                    <div class="btn-gm-mini btn-gm-cura" onclick="alterarStatusInimigo('${id}', 'pv_atual', 1)" title="+1 PV (Cura)">+</div>
                </div>
                ${pfControlsHTML}
                <div class="gm-btn-row">
                    <div class="btn-gm-mini btn-gm-eye ${data.visivel ? 'ativo' : ''}" onclick="toggleVisibilidadeInimigo('${id}')" title="Visível/Invisível">👁️</div>
                    <div class="btn-gm-mini btn-gm-info" onclick="toggleDetalhesToken('${id}')" title="Detalhes">i</div>
                    <div class="btn-gm-mini btn-gm-trash" onclick="deletarInimigoIndividual('${id}')" title="Excluir">🗑️</div>
                </div>
            </div>
        `;
    } else {
        // Jogador só vê botão info
        controlsHTML = `
            <div class="token-gm-controls" style="display:flex; background:transparent; border:none; margin-top:0;">
                <div class="btn-gm-mini btn-gm-info" onclick="toggleDetalhesToken('${id}')" style="background:rgba(0,0,0,0.6)">i</div>
            </div>
        `;
    }

    el.innerHTML = `
        <div class="token-barras">
            <div class="barra-mini" title="Vida: ${data.pv_atual}/${data.pv_max}">
                <div class="fill-pv" style="width: ${pvPct}%"></div>
            </div>
            ${pfBarraHTML}
        </div>

        <div class="token-img-wrapper">
            <img src="${imgSrc}" class="token-img">
        </div>

        <div class="token-info">
            <div class="token-nome">${data.nome}</div>
            <div class="token-numeros">Dif: ${data.dificuldade}</div>
        </div>

        ${controlsHTML}

        <div id="detalhes-${id}" class="token-detalhes-float">
            <h4 style="margin:0 0 8px 0; color:var(--gold); text-align:center;">${data.nome}</h4>
            <p><strong>Ataque:</strong> ${data.ataque} | <strong>Dano:</strong> ${data.dano}</p>
            <p><strong>Limiares:</strong> ${data.limiares}</p>
            <p><strong>PV:</strong> ${data.pv_atual}/${data.pv_max} ${pfMax > 0 ? `| <strong>PF:</strong> ${pfAtual}/${pfMax}` : ''}</p>
            <hr style="border-color:#333; margin:8px 0;">
            <div style="white-space: pre-wrap; line-height:1.4;">${data.detalhes}</div>
            <button onclick="toggleDetalhesToken('${id}')" style="width:100%; margin-top:10px; background:#333; color:#fff; border:1px solid #555; padding:5px; cursor:pointer;">Fechar</button>
        </div>
    `;

    return el;
}

// Upload Imagem Local
window.processarUploadImagem = function() {
    const fileInput = document.getElementById('upload-file-input');
    const urlInput = document.getElementById('new-enemy-img');
    const preview = document.getElementById('preview-img-mini');

    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        if (file.size > 800000) { alert("Imagem muito grande! Use arquivos menores que 800KB."); return; }
        const reader = new FileReader();
        reader.onload = function(e) {
            urlInput.value = e.target.result;
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
};