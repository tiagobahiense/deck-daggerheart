// =========================================================
// SISTEMA DE INIMIGOS V6.1 (COM INTEGRAÇÃO TABLETOP)
// =========================================================

// --- FUNÇÕES DE CONTROLE (MESTRE) ---

window.abrirCriadorInimigo = function() {
    const modal = document.getElementById('modal-criar-inimigo');
    if(modal) modal.style.display = 'flex';
};

window.fecharCriadorInimigo = function() {
    const modal = document.getElementById('modal-criar-inimigo');
    if(modal) modal.style.display = 'none';
};

window.salvarNovoInimigo = function() {
    if (!window.db || !window.push || !window.ref) {
        alert("Erro: Sem conexão com o banco.");
        return;
    }

    const btnInvocar = document.querySelector('.btn-invocar'); 
    if(btnInvocar) { btnInvocar.innerText = "Invocando..."; btnInvocar.disabled = true; }

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
        nome: nome, imagem: img,
        pv_max: pvMax, pv_atual: pvMax,
        pf_max: pfMax, pf_atual: 0,
        dificuldade: dif, limiares: limiares,
        ataque: ataque, dano: dano, detalhes: desc,
        visivel: false, efeitoVisual: null
    };

    window.push(window.ref(window.db, 'mesa_rpg/inimigos'), novoInimigo)
        .then(() => {
            window.fecharCriadorInimigo();
            if(btnInvocar) { btnInvocar.innerText = "Invocar"; btnInvocar.disabled = false; }
            // Limpa campos
            document.getElementById('new-enemy-name').value = '';
            document.getElementById('new-enemy-img').value = '';
            document.getElementById('new-enemy-desc').value = '';
        })
        .catch(e => {
            alert("Erro: " + e.message);
            if(btnInvocar) { btnInvocar.innerText = "Invocar"; btnInvocar.disabled = false; }
        });
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
        
        const max = tipo === 'pv_atual' ? data.pv_max : (data.pf_max || 0);
        let novo = (data[tipo] || 0) + delta;
        
        if(novo < 0) novo = 0;
        if(novo > max) novo = max;
        
        const updates = {};
        updates[tipo] = novo;
        
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
        window.set(refPath, !atual);
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

// Variável para guardar a referência do listener ativo e poder desligar
let inimigosRefAtivo = null;
let callbackInimigos = null;

window.iniciarSistemaInimigos = function() {
    if (!window.db || !window.onValue) {
        setTimeout(window.iniciarSistemaInimigos, 500);
        return;
    }
    
    // Identifica Mestre ou Jogador
    const isGM = (window.nomeJogador === "Mestre") || (document.getElementById('controles-mestre') !== null);
    document.body.classList.remove('modo-mestre', 'modo-jogador');
    document.body.classList.add(isGM ? 'modo-mestre' : 'modo-jogador');

    const container = document.getElementById('area-inimigos');
    if (!container) return;

    // LIMPEZA: Se já existe um listener rodando, desliga ele antes de criar um novo
    if (inimigosRefAtivo && window.off && callbackInimigos) {
        try {
            window.off(inimigosRefAtivo, 'value', callbackInimigos); 
        } catch(e) { console.warn("Erro ao limpar listener antigo", e); }
    }

    inimigosRefAtivo = window.ref(window.db, 'mesa_rpg/inimigos');
    
    // Callback separado para poder ser removido depois
    callbackInimigos = (snap) => {
        container.innerHTML = "";
        
        if(!snap.exists()) return;

        const inimigos = snap.val();
        Object.keys(inimigos).forEach(key => {
            const data = inimigos[key];
            if (!isGM && !data.visivel) return; 
            container.appendChild(criarTokenInimigo(key, data, isGM));
        });
    };

    window.onValue(inimigosRefAtivo, callbackInimigos);
};

function criarTokenInimigo(id, data, isGM) {
    const el = document.createElement('div');
    el.className = 'inimigo-token';
    if(isGM && !data.visivel) el.classList.add('invisivel');
    el.id = `token-${id}`;
    
    if (data.efeitoVisual && (Date.now() - data.efeitoVisual.time < 800)) {
        el.classList.add(data.efeitoVisual.tipo === 'dano' ? 'anim-hit-red' : 'anim-hit-green');
        setTimeout(() => el.classList.remove('anim-hit-red', 'anim-hit-green'), 800);
    }

    const pvPct = Math.max(0, (data.pv_atual / data.pv_max) * 100);
    const pfMax = data.pf_max || 0;
    const pfAtual = data.pf_atual || 0;
    const pfPct = pfMax > 0 ? Math.max(0, (pfAtual / pfMax) * 100) : 0;
    
    const imgSrc = (data.imagem && data.imagem.length > 10) ? data.imagem : 'img/monsters/default.png';

    // Botões PF
    let pfControlsHTML = '';
    if (pfMax > 0 && isGM) {
        pfControlsHTML = `
            <div class="gm-btn-row">
                <div class="btn-gm-mini btn-gm-est-dano" onclick="alterarStatusInimigo('${id}', 'pf_atual', -1)" title="-1 Estresse">-</div>
                <div class="btn-gm-mini btn-gm-est-cura" onclick="alterarStatusInimigo('${id}', 'pf_atual', 1)" title="+1 Estresse">+</div>
            </div>
        `;
    }

    // Barra PF
    let pfBarraHTML = '';
    if (pfMax > 0) {
        pfBarraHTML = `
            <div class="barra-mini" style="margin-top:2px;" title="Estresse: ${pfAtual}/${pfMax}">
                <div class="fill-pf" style="width: ${pfPct}%"></div>
            </div>
        `;
    }

    let controlsHTML = '';
    if(isGM) {
        // Prepara objeto seguro para passar no onclick
        const dataSafe = JSON.stringify(data).replace(/"/g, '&quot;');

        controlsHTML = `
            <div class="token-gm-controls">
                <div class="gm-btn-row">
                    <div class="btn-gm-mini btn-gm-dano" onclick="alterarStatusInimigo('${id}', 'pv_atual', -1)" title="-PV">-</div>
                    <div class="btn-gm-mini btn-gm-cura" onclick="alterarStatusInimigo('${id}', 'pv_atual', 1)" title="+PV">+</div>
                </div>
                ${pfControlsHTML}
                <div class="gm-btn-row">
                    <div class="btn-gm-mini btn-gm-eye ${data.visivel ? 'ativo' : ''}" onclick="toggleVisibilidadeInimigo('${id}')" title="Visibilidade">👁️</div>
                    <div class="btn-gm-mini btn-gm-info" onclick="toggleDetalhesToken('${id}')" title="Detalhes">i</div>
                    <div class="btn-gm-mini btn-gm-trash" onclick="deletarInimigoIndividual('${id}')" title="Remover">🗑️</div>
                </div>
                <div class="gm-btn-row" style="margin-top:4px;">
                     <button class="btn-gm-mini" style="width:100%; background:#222; border:1px solid #666;" onclick="window.criarTokenMonstro('${id}', ${dataSafe})">♟️ Virar Token</button>
                </div>
            </div>
        `;
    } else {
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

window.processarUploadImagem = function() {
    const fileInput = document.getElementById('upload-file-input');
    const urlInput = document.getElementById('new-enemy-img');
    const preview = document.getElementById('preview-img-mini');

    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        if (file.size > 1000000) { alert("Imagem muito grande! Limite 1MB."); return; }
        const reader = new FileReader();
        reader.onload = function(e) {
            urlInput.value = e.target.result;
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        reader.readAsDataURL(file);
    }
};