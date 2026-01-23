// =========================================================
// SISTEMA DE INIMIGOS V7.0 (LISTA COMPACTA & TOKENS)
// =========================================================

// Configuração padrão de visibilidade (Tudo oculto exceto Nome)
const VIS_DEFAULT = {
    hp: false,
    ac: false, // Dificuldade/Evasão
    atk: false,
    dmg: false,
    desc: false
};

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
        dificuldade: parseInt(document.getElementById('new-enemy-dif').value)||12,
        ataque: document.getElementById('new-enemy-atk').value||"+0",
        dano: document.getElementById('new-enemy-dmg').value||"-",
        detalhes: document.getElementById('new-enemy-desc').value||"",
        // Visibilidade Individual dos campos
        vis: { ...VIS_DEFAULT }
    };

    window.push(window.ref(window.db, 'mesa_rpg/inimigos'), novo).then(() => {
        window.fecharCriadorInimigo();
        document.getElementById('new-enemy-name').value = '';
    });
};

window.deletarInimigo = function(id) {
    if(confirm("Apagar este inimigo da lista?")) window.remove(window.ref(window.db, `mesa_rpg/inimigos/${id}`));
};

// --- RENDERIZAÇÃO (AGORA COMO LISTA, IGUAL NPC) ---
window.iniciarSistemaInimigos = function() {
    const lista = document.getElementById('enemy-list-scroll');
    if(!lista) return; // Se não for mestre, não faz nada na lista lateral

    window.onValue(window.ref(window.db, 'mesa_rpg/inimigos'), (snap) => {
        lista.innerHTML = "";
        if(!snap.exists()) { lista.innerHTML = "<p style='color:#666;text-align:center'>Vazio</p>"; return; }

        const dados = snap.val();
        Object.keys(dados).forEach(key => {
            const mob = dados[key];
            const div = document.createElement('div');
            div.className = 'npc-list-item'; // Reutiliza estilo do NPC
            div.style.borderLeft = "3px solid #8b0000";
            
            // Dados seguros para o HTML
            const mobJson = JSON.stringify(mob).replace(/"/g, '&quot;');
            
            div.innerHTML = `
                <div style="flex:1; display:flex; flex-direction:column; cursor:pointer;" onclick='window.criarTokenMonstro("${key}", ${mobJson})'>
                    <span style="font-weight:bold; color:#ffaaaa;">${mob.nome}</span>
                    <span style="font-size:0.7rem; color:#888;">Dif: ${mob.dificuldade} | PV: ${mob.pv_atual}/${mob.pv_max}</span>
                </div>
                <button class="btn-del-npc" onclick="window.deletarInimigo('${key}')">X</button>
            `;
            lista.appendChild(div);
        });
    });
};