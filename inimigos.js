// =========================================================
// SISTEMA DE INIMIGOS V8.0 (INTEGRAÇÃO TOTAL)
// =========================================================

// --- CONTROLES ---
window.abrirCriadorInimigo = function() { document.getElementById('modal-criar-inimigo').style.display = 'flex'; };
window.fecharCriadorInimigo = function() { document.getElementById('modal-criar-inimigo').style.display = 'none'; };

window.salvarNovoInimigo = function() {
    const nome = document.getElementById('new-enemy-name').value || "Inimigo";
    const img = document.getElementById('new-enemy-img').value || '';
    
    const novo = {
        nome: nome, imagem: img,
        pv_max: parseInt(document.getElementById('new-enemy-pv').value)||1,
        pv_atual: parseInt(document.getElementById('new-enemy-pv').value)||1,
        pf_max: parseInt(document.getElementById('new-enemy-pf').value)||0,
        pf_atual: 0,
        dificuldade: parseInt(document.getElementById('new-enemy-dif').value)||12,
        ataque: document.getElementById('new-enemy-atk').value||"+0",
        dano: document.getElementById('new-enemy-dmg').value||"-",
        detalhes: document.getElementById('new-enemy-desc').value||"",
        limiares: document.getElementById('new-enemy-limiares').value||"-"
    };

    window.push(window.ref(window.db, 'mesa_rpg/inimigos'), novo).then(() => {
        window.fecharCriadorInimigo();
        document.getElementById('new-enemy-name').value = '';
        document.getElementById('new-enemy-img').value = '';
    });
};

window.removerTodosInimigos = function() {
    if(confirm("LIMPAR TUDO? (Lista e Tokens do Mapa)")) {
        window.remove(window.ref(window.db, 'mesa_rpg/inimigos')); // Limpa Lista
        window.remove(window.ref(window.db, 'mesa_rpg/tabuleiro/tokens')); // Limpa Mapa
    }
};

window.deletarInimigo = function(id) {
    if(confirm("Apagar da lista?")) window.remove(window.ref(window.db, `mesa_rpg/inimigos/${id}`));
};

// --- RENDERIZAÇÃO DA LISTA LATERAL (GAVETA) ---
window.iniciarSistemaInimigos = function() {
    const lista = document.getElementById('enemy-list-scroll');
    if(!lista) return; 

    window.onValue(window.ref(window.db, 'mesa_rpg/inimigos'), (snap) => {
        lista.innerHTML = "";
        if(!snap.exists()) { lista.innerHTML = "<p style='color:#666;text-align:center'>Vazio</p>"; return; }

        const dados = snap.val();
        Object.keys(dados).forEach(key => {
            const mob = dados[key];
            const div = document.createElement('div');
            div.className = 'list-item'; 
            div.style.borderLeft = "3px solid #8b0000";
            
            // Serialização segura para onclick
            const mobJson = JSON.stringify(mob).replace(/"/g, '&quot;');
            
            div.innerHTML = `
                <div style="flex:1; display:flex; flex-direction:column;" onclick='window.criarTokenMonstro("${key}", ${mobJson})'>
                    <span style="font-weight:bold; color:#ffaaaa;">${mob.nome}</span>
                    <span style="font-size:0.7rem; color:#888;">PV: ${mob.pv_max} | Dif: ${mob.dificuldade}</span>
                    <span style="font-size:0.6rem; color:#666;">(Clique para criar token)</span>
                </div>
                <button style="background:none; border:none; color:#666; font-weight:bold; cursor:pointer;" onclick="window.deletarInimigo('${key}')">X</button>
            `;
            lista.appendChild(div);
        });
    });
};

window.toggleListaInimigos = function() {
    const el = document.getElementById('gm-enemy-list-container');
    const npcEl = document.getElementById('gm-npc-list-container');
    if(el.style.display === 'flex') {
        el.style.display = 'none';
    } else {
        el.style.display = 'flex';
        npcEl.style.display = 'none'; // Fecha o outro pra não sobrepor
    }
};

window.toggleListaNPCs = function() {
    const el = document.getElementById('gm-npc-list-container');
    const iniEl = document.getElementById('gm-enemy-list-container');
    if(el.style.display === 'flex') {
        el.style.display = 'none';
    } else {
        el.style.display = 'flex';
        iniEl.style.display = 'none'; // Fecha o outro
    }
};