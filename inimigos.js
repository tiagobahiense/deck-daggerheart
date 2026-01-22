// =========================================================
// SISTEMA DE INIMIGOS (V2.0 - UPLOAD & UX)
// =========================================================

// --- FUNÇÕES DO MESTRE ---

window.abrirCriadorInimigo = function() {
    document.getElementById('modal-criar-inimigo').style.display = 'flex';
};

window.fecharCriadorInimigo = function() {
    document.getElementById('modal-criar-inimigo').style.display = 'none';
    // Limpa preview
    document.getElementById('preview-img-mini').style.display = 'none';
    document.getElementById('preview-img-mini').src = '';
};

// === LÓGICA DE UPLOAD DE IMAGEM (BASE64) ===
window.processarUploadImagem = function() {
    const fileInput = document.getElementById('upload-file-input');
    const urlInput = document.getElementById('new-enemy-img');
    const preview = document.getElementById('preview-img-mini');

    if (fileInput.files && fileInput.files[0]) {
        const file = fileInput.files[0];
        
        // Limite de tamanho (ex: 500kb para não lotar o banco)
        if (file.size > 500000) {
            alert("⚠️ A imagem é muito grande! Tente uma imagem menor que 500KB para não travar o jogo.");
            return;
        }

        const reader = new FileReader();
        
        reader.onload = function(e) {
            // O resultado é uma string longa (data:image/png;base64...)
            // Colocamos essa string no input de texto (que pode ficar escondido ou visível)
            urlInput.value = e.target.result;
            
            // Mostra preview
            preview.src = e.target.result;
            preview.style.display = 'block';
        };
        
        reader.readAsDataURL(file);
    }
};

window.salvarNovoInimigo = function() {
    if (!window.db || !window.push || !window.ref) return;

    const nome = document.getElementById('new-enemy-name').value;
    // Se o usuário digitou link ou fez upload, o valor está aqui:
    const img = document.getElementById('new-enemy-img').value || 'img/monsters/default.png';
    
    const pvMax = parseInt(document.getElementById('new-enemy-pv').value) || 1;
    const pfMax = parseInt(document.getElementById('new-enemy-pf').value) || 0;
    const dif = parseInt(document.getElementById('new-enemy-dif').value) || 10;
    const limiares = document.getElementById('new-enemy-limiares').value || "-/-/-";
    const ataque = document.getElementById('new-enemy-atk').value || "+0";
    const dano = document.getElementById('new-enemy-dmg').value || "1d6";
    const desc = document.getElementById('new-enemy-desc').value || "";

    const novoInimigo = {
        nome: nome,
        imagem: img,
        pv_max: pvMax,
        pv_atual: pvMax,
        pf_max: pfMax,
        pf_atual: 0,
        dificuldade: dif,
        limiares: limiares,
        ataque: ataque,
        dano: dano,
        detalhes: desc,
        efeitoVisual: null
    };

    window.push(window.ref(window.db, 'mesa_rpg/inimigos'), novoInimigo)
        .then(() => {
            window.fecharCriadorInimigo();
            // Resetar form
            document.querySelectorAll('#modal-criar-inimigo input, #modal-criar-inimigo textarea').forEach(i => i.value = '');
        })
        .catch(e => alert("Erro ao criar: " + e.message));
};

window.removerTodosInimigos = function() {
    if(confirm("Tem certeza? Isso apagará TODOS os inimigos da mesa.")) {
        window.remove(window.ref(window.db, 'mesa_rpg/inimigos'));
    }
};

// Funções de Controle (Mestre)
window.alterarStatusInimigo = function(id, tipo, valor) {
    const inimigoRef = window.ref(window.db, `mesa_rpg/inimigos/${id}`);
    
    window.get(inimigoRef).then(snap => {
        if (!snap.exists()) return;
        const data = snap.val();
        
        let novoValor = data[tipo] + valor;
        let max = tipo === 'pv_atual' ? data.pv_max : data.pf_max;
        
        if (novoValor < 0) novoValor = 0;
        if (novoValor > max) novoValor = max;
        
        const updates = {};
        updates[tipo] = novoValor;
        
        // Efeito Visual
        if (tipo === 'pv_atual') {
            updates['efeitoVisual'] = { 
                tipo: valor < 0 ? 'dano' : 'cura', 
                time: Date.now() 
            };
        }

        window.update(inimigoRef, updates);
    });
};

window.deletarInimigo = function(id) {
    if(confirm("Remover este inimigo?")) {
        window.remove(window.ref(window.db, `mesa_rpg/inimigos/${id}`));
    }
};

window.toggleDetalhesInimigo = function(id) {
    const el = document.getElementById(`detalhes-${id}`);
    if(el) {
        el.classList.toggle('aberto');
    }
};

// --- RENDERIZAÇÃO ---

window.iniciarSistemaInimigos = function() {
    if (!window.db || !window.onValue) {
        setTimeout(window.iniciarSistemaInimigos, 1000);
        return;
    }

    const container = document.getElementById('area-inimigos');
    const inimigosRef = window.ref(window.db, 'mesa_rpg/inimigos');

    window.onValue(inimigosRef, (snapshot) => {
        container.innerHTML = "";
        
        if (!snapshot.exists()) return;

        const inimigos = snapshot.val();
        Object.keys(inimigos).forEach(key => {
            const data = inimigos[key];
            const card = criarCardInimigo(key, data);
            container.appendChild(card);
            
            // Aplica animação se for recente (< 800ms)
            if (data.efeitoVisual && (Date.now() - data.efeitoVisual.time < 800)) {
                card.classList.add(data.efeitoVisual.tipo === 'dano' ? 'anim-dano' : 'anim-cura');
                setTimeout(() => card.classList.remove('anim-dano', 'anim-cura'), 500);
            }
        });
    });
};

function criarCardInimigo(id, data) {
    const card = document.createElement('div');
    card.className = 'inimigo-card';
    card.id = `enemy-${id}`;

    const pvPct = Math.max(0, (data.pv_atual / data.pv_max) * 100);
    const pfPct = data.pf_max > 0 ? Math.max(0, (data.pf_atual / data.pf_max) * 100) : 0;
    
    // Verifica se é mestre (pelo nome ou URL)
    const isGM = (window.nomeJogador === "Mestre") || (window.location.pathname.includes('mestre.html'));

    let gmControls = '';
    if (isGM) {
        gmControls = `
            <div class="gm-overlay-controls">
                <div class="linha-botoes">
                    <button class="btn-inimigo btn-dano" onclick="alterarStatusInimigo('${id}', 'pv_atual', -1)">-1 PV</button>
                    <button class="btn-inimigo btn-cura" onclick="alterarStatusInimigo('${id}', 'pv_atual', 1)">+1 PV</button>
                    <button class="btn-inimigo btn-del" onclick="deletarInimigo('${id}')">🗑️</button>
                </div>
                ${data.pf_max > 0 ? `
                <div class="linha-botoes">
                    <button class="btn-inimigo btn-dano" style="background:#1565c0; color:#bbdefb" onclick="alterarStatusInimigo('${id}', 'pf_atual', -1)">-1 PF</button>
                    <button class="btn-inimigo btn-cura" style="background:#1565c0; color:#bbdefb" onclick="alterarStatusInimigo('${id}', 'pf_atual', 1)">+1 PF</button>
                </div>` : ''}
            </div>
        `;
    }

    card.innerHTML = `
        <div class="inimigo-header">
            <img src="${data.imagem}" class="inimigo-img" alt="${data.nome}" onerror="this.src='https://via.placeholder.com/200x150?text=Monstro'">
            <div class="barras-container">
                <div class="barra-wrapper" title="Vida: ${data.pv_atual}/${data.pv_max}">
                    <div class="barra-fill barra-pv" style="width: ${pvPct}%"></div>
                </div>
                ${data.pf_max > 0 ? `
                <div class="barra-wrapper" title="Estresse: ${data.pf_atual}/${data.pf_max}">
                    <div class="barra-fill barra-pf" style="width: ${pfPct}%"></div>
                </div>` : ''}
            </div>
            <div class="status-numerico">
                Dif: ${data.dificuldade} | PV: ${data.pv_atual}
            </div>
        </div>
        <div class="inimigo-body">
            <div class="inimigo-nome">${data.nome}</div>
            <div class="inimigo-stats-grid">
                <div class="stat-item"><strong>Atk:</strong> ${data.ataque}</div>
                <div class="stat-item"><strong>Dano:</strong> ${data.dano}</div>
                <div class="stat-item form-full"><strong>Limiares:</strong> ${data.limiares}</div>
            </div>
            <button class="btn-toggle-detalhes" onclick="toggleDetalhesInimigo('${id}')">👁️ Ver Habilidades</button>
            <div id="detalhes-${id}" class="inimigo-detalhes">
                ${data.detalhes.replace(/\n/g, '<br>')}
            </div>
        </div>
        ${gmControls}
    `;

    return card;
}