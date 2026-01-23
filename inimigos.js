// SISTEMA DE INIMIGOS V10.0 (BOX TOGGLE FIX)

window.abrirCriadorInimigo = function() { document.getElementById('modal-criar-inimigo').style.display = 'flex'; };
window.fecharCriadorInimigo = function() { document.getElementById('modal-criar-inimigo').style.display = 'none'; };

window.salvarNovoInimigo = function() {
    const nome = document.getElementById('new-enemy-name').value || "Inimigo";
    const img = document.getElementById('new-enemy-img').value;
    const tamanho = document.getElementById('new-enemy-size').value || 1;
    
    const novo = {
        nome: nome, imagem: img, tamanho: parseInt(tamanho),
        pv_max: parseInt(document.getElementById('new-enemy-pv').value)||1,
        pv_atual: parseInt(document.getElementById('new-enemy-pv').value)||1,
        pf_max: parseInt(document.getElementById('new-enemy-pf').value)||0,
        pf_atual: 0,
        dificuldade: parseInt(document.getElementById('new-enemy-dif').value)||12,
        ataque: document.getElementById('new-enemy-atk').value||"+0",
        dano: document.getElementById('new-enemy-dmg').value||"-",
        detalhes: document.getElementById('new-enemy-desc').value||""
    };

    window.push(window.ref(window.db, 'mesa_rpg/inimigos'), novo).then(() => {
        window.fecharCriadorInimigo();
        document.getElementById('new-enemy-name').value = '';
    });
};

window.processarUploadImagem = function() {
    const fileInput = document.getElementById('upload-file-input');
    const urlInput = document.getElementById('new-enemy-img');
    const preview = document.getElementById('preview-img-mini');
    if (fileInput.files && fileInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
            urlInput.value = e.target.result;
            preview.src = e.target.result;
            preview.style.display = 'block';
            fileInput.value = '';
        };
        reader.readAsDataURL(fileInput.files[0]);
    }
};

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
            const mobJson = JSON.stringify(mob).replace(/"/g, '&quot;');
            div.innerHTML = `
                <div style="flex:1; display:flex; flex-direction:column;" onclick='window.criarTokenMonstro("${key}", ${mobJson})'>
                    <span style="font-weight:bold; color:#ffaaaa;">${mob.nome}</span>
                    <span style="font-size:0.7rem; color:#888;">Tam: ${mob.tamanho} | PV: ${mob.pv_max}</span>
                </div>
                <button style="background:none; border:none; color:#666; cursor:pointer;" onclick="window.deletarInimigo('${key}')">X</button>
            `;
            lista.appendChild(div);
        });
    });
};

window.deletarInimigo = function(id) { if(confirm("Apagar?")) window.remove(window.ref(window.db, `mesa_rpg/inimigos/${id}`)); };
window.removerTodosInimigos = function() { if(confirm("Limpar tudo?")) { window.remove(window.ref(window.db, 'mesa_rpg/inimigos')); window.remove(window.ref(window.db, 'mesa_rpg/tabuleiro/tokens')); } };

// FUNÇÕES DE TOGGLE (CRÍTICO: CSS USA .active PARA DISPLAY FLEX)
window.toggleListaInimigos = function() {
    const el = document.getElementById('gm-enemy-list-container');
    const npcEl = document.getElementById('gm-npc-list-container');
    if(el.classList.contains('active')) {
        el.classList.remove('active');
    } else {
        el.classList.add('active');
        npcEl.classList.remove('active'); // Fecha NPC se abrir Inimigo
    }
};

window.toggleListaNPCs = function() {
    const el = document.getElementById('gm-npc-list-container');
    const iniEl = document.getElementById('gm-enemy-list-container');
    if(el.classList.contains('active')) {
        el.classList.remove('active');
    } else {
        el.classList.add('active');
        iniEl.classList.remove('active'); // Fecha Inimigo se abrir NPC
    }
};