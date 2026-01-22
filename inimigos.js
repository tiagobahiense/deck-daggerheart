// =========================================================
// SISTEMA DE INIMIGOS (GM & JOGADORES)
// =========================================================

// --- FUNÇÕES DO MESTRE (CRIAÇÃO E CONTROLE) ---

window.abrirCriadorInimigo = function() {
    document.getElementById('modal-criar-inimigo').style.display = 'flex';
};

window.fecharCriadorInimigo = function() {
    document.getElementById('modal-criar-inimigo').style.display = 'none';
};

window.salvarNovoInimigo = function() {
    if (!window.db || !window.push || !window.ref) return;

    const nome = document.getElementById('new-enemy-name').value;
    const img = document.getElementById('new-enemy-img').value || 'img/monsters/default.png'; // Fallback
    const pvMax = parseInt(document.getElementById('new-enemy-pv').value) || 1;
    const pfMax = parseInt(document.getElementById('new-enemy-pf').value) || 0;
    const dif = parseInt(document.getElementById('new-enemy-dif').value) || 10;
    const limiares = document.getElementById('new-enemy-limiares').value || "Nenhum";
    const ataque = document.getElementById('new-enemy-atk').value || "+0";
    const dano = document.getElementById('new-enemy-dmg').value || "1d6";
    const desc = document.getElementById('new-enemy-desc').value || "";

    const novoInimigo = {
        nome: nome,
        imagem: img,
        pv_max: pvMax,
        pv_atual: pvMax,
        pf_max: pfMax,
        pf_atual: 0, // Começa com 0 de estresse
        dificuldade: dif,
        limiares: limiares,
        ataque: ataque,
        dano: dano,
        detalhes: desc,
        efeitoVisual: null // Para disparar animações
    };

    window.push(window.ref(window.db, 'mesa_rpg/inimigos'), novoInimigo)
        .then(() => {
            window.fecharCriadorInimigo();
            // Limpa form
            document.querySelectorAll('#modal-criar-inimigo input').forEach(i => i.value = '');
        })
        .catch(e => alert("Erro ao criar: " + e.message));
};

window.removerTodosInimigos = function() {
    if(confirm("Tem certeza? Isso apagará TODOS os inimigos da mesa.")) {
        window.remove(window.ref(window.db, 'mesa_rpg/inimigos'));
    }
};

// Funções de Controle Individual (Usadas nos botões do card)
window.alterarStatusInimigo = function(id, tipo, valor) {
    // tipo: 'pv_atual' ou 'pf_atual'
    // valor: delta (+1 ou -1)
    
    const inimigoRef = window.ref(window.db, `mesa_rpg/inimigos/${id}`);
    
    // Primeiro buscamos o valor atual e o max
    window.get(inimigoRef).then(snap => {
        if (!snap.exists()) return;
        const data = snap.val();
        
        let novoValor = data[tipo] + valor;
        let max = tipo === 'pv_atual' ? data.pv_max : data.pf_max;
        
        // Limites
        if (novoValor < 0) novoValor = 0;
        if (novoValor > max) novoValor = max;
        
        const updates = {};
        updates[tipo] = novoValor;
        
        // Disparar efeito visual
        if (tipo === 'pv_atual') {
            if (valor < 0) updates['efeitoVisual'] = { tipo: 'dano', time: Date.now() }; // Dano
            if (valor > 0) updates['efeitoVisual'] = { tipo: 'cura', time: Date.now() }; // Cura
        }

        window.update(inimigoRef, updates);
    });
};

window.deletarInimigo = function(id) {
    if(confirm("Remover este inimigo?")) {
        window.remove(window.ref(window.db, `mesa_rpg/inimigos/${id}`));
    }
};

// --- RENDERIZAÇÃO E LISTENERS (COMUM A JOGADOR E MESTRE) ---

window.iniciarSistemaInimigos = function() {
    if (!window.db || !window.onValue) {
        console.log("Aguardando DB para inimigos...");
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
            
            // Verifica se tem efeito visual recente (últimos 500ms)
            if (data.efeitoVisual && (Date.now() - data.efeitoVisual.time < 800)) {
                if (data.efeitoVisual.tipo === 'dano') {
                    card.classList.add('anim-dano');
                    setTimeout(() => card.classList.remove('anim-dano'), 500);
                }
                if (data.efeitoVisual.tipo === 'cura') {
                    card.classList.add('anim-cura');
                    setTimeout(() => card.classList.remove('anim-cura'), 500);
                }
            }
        });
    });
};

function criarCardInimigo(id, data) {
    const card = document.createElement('div');
    card.className = 'inimigo-card';
    card.id = `enemy-${id}`;

    // Cálculo das barras
    const pvPct = (data.pv_atual / data.pv_max) * 100;
    const pfPct = (data.pf_atual / data.pf_max) * 100;
    
    // É mestre? (Verificação simples via window.nomeJogador == Mestre ou URL)
    const isGM = (window.nomeJogador === "Mestre") || (window.location.pathname.includes('mestre.html'));

    let gmControls = '';
    if (isGM) {
        gmControls = `
            <div class="gm-overlay-controls" style="display: flex;">
                <button class="btn-inimigo btn-dano" onclick="alterarStatusInimigo('${id}', 'pv_atual', -1)">-PV</button>
                <button class="btn-inimigo btn-cura" onclick="alterarStatusInimigo('${id}', 'pv_atual', 1)">+PV</button>
                <button class="btn-inimigo btn-cura" style="background:#1976d2; border-color:#64b5f6;" onclick="alterarStatusInimigo('${id}', 'pf_atual', 1)">+PF</button>
                <button class="btn-inimigo btn-dano" style="background:#1976d2; border-color:#64b5f6;" onclick="alterarStatusInimigo('${id}', 'pf_atual', -1)">-PF</button>
                <button class="btn-inimigo btn-del" onclick="deletarInimigo('${id}')">🗑️</button>
            </div>
        `;
    }

    // HTML do Card
    card.innerHTML = `
        <div class="inimigo-header">
            <img src="${data.imagem}" class="inimigo-img" alt="${data.nome}" onerror="this.src='img/monsters/default.png'">
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
                <div class="stat-item"><strong>Ataque:</strong> ${data.ataque}</div>
                <div class="stat-item"><strong>Dano:</strong> ${data.dano}</div>
                <div class="stat-item" style="grid-column: 1/-1"><strong>Limiares:</strong> ${data.limiares}</div>
            </div>
            <div class="inimigo-detalhes">
                ${data.detalhes}
            </div>
        </div>
        ${gmControls}
    `;

    return card;
}