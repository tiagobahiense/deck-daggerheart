// =========================================================
// SISTEMA DE CENÁRIOS (MODULAR)
// =========================================================

let imagemCenarioTemp = "";

// --- FUNÇÕES DO MESTRE ---

window.abrirGerenciadorCenarios = function() {
    document.getElementById('modal-gerenciar-cenarios').style.display = 'flex';
    carregarListaCenariosAdmin();
};

window.fecharGerenciadorCenarios = function() {
    document.getElementById('modal-gerenciar-cenarios').style.display = 'none';
};

// 1. Processar Upload e Converter para Base64
window.processarUploadCenario = function(input) {
    if (input.files && input.files[0]) {
        const file = input.files[0];
        
        // Validação simples de tamanho (limite sugerido 2MB para não travar o Firebase)
        if(file.size > 3 * 1024 * 1024) {
            alert("Atenção: Imagem muito grande (>3MB). Pode deixar o sistema lento.");
        }

        const reader = new FileReader();
        reader.onload = function(e) {
            imagemCenarioTemp = e.target.result;
            // Feedback visual no botão
            const label = document.getElementById('label-upload-cenario');
            label.style.borderColor = "#00ff00";
            label.style.color = "#00ff00";
            label.innerHTML = "Imagem Pronta! ✅";
        };
        reader.readAsDataURL(file);
    }
};

// 2. Salvar no Firebase
window.salvarCenario = function() {
    const nome = document.getElementById('input-nome-cenario').value;
    
    if (!nome) return alert("Dê um nome ao cenário.");
    if (!imagemCenarioTemp) return alert("Faça upload de uma imagem.");

    const novoRef = window.push(window.ref(window.db, 'mesa_rpg/cenarios'));
    
    window.set(novoRef, {
        nome: nome,
        imagem: imagemCenarioTemp,
        visivel: false,
        timestamp: Date.now()
    }).then(() => {
        // Resetar formulário
        document.getElementById('input-nome-cenario').value = "";
        document.getElementById('input-file-cenario').value = "";
        imagemCenarioTemp = "";
        
        const label = document.getElementById('label-upload-cenario');
        label.style.borderColor = "#555";
        label.style.color = "white";
        label.innerHTML = "Escolher Imagem 📂";
        
        alert("Cenário salvo!");
    });
};

// 3. Listar Cenários
function carregarListaCenariosAdmin() {
    const listaDiv = document.getElementById('lista-cenarios-content');
    if(!listaDiv) return;

    window.onValue(window.ref(window.db, 'mesa_rpg/cenarios'), (snapshot) => {
        listaDiv.innerHTML = "";
        if (!snapshot.exists()) {
            listaDiv.innerHTML = "<p style='color:#666; text-align:center;'>Nenhum cenário salvo.</p>";
            return;
        }

        const cenarios = [];
        snapshot.forEach(child => {
            cenarios.push({ id: child.key, ...child.val() });
        });

        // Ordenar: Visíveis primeiro, depois os mais novos
        cenarios.sort((a, b) => (b.visivel === a.visivel) ? 0 : b.visivel ? 1 : -1);

        cenarios.forEach(cenario => {
            const div = document.createElement('div');
            div.className = 'item-cenario';
            // Se estiver visível, destaca borda verde
            if(cenario.visivel) div.style.borderColor = "#00ff00";

            div.innerHTML = `
                <div class="thumb-cenario" style="background-image: url('${cenario.imagem}')"></div>
                <div class="info-cenario">
                    <span class="nome-cenario">${cenario.nome}</span>
                    <span class="status-cenario">${cenario.visivel ? '🟢 Exibindo para Jogadores' : '⚪ Oculto'}</span>
                </div>
                <div class="controles-cenario">
                    <button class="btn-olho ${cenario.visivel ? 'ativo' : ''}" onclick="window.alternarCenario('${cenario.id}', ${!cenario.visivel})">
                        ${cenario.visivel ? '👁️' : '👁️‍🗨️'}
                    </button>
                    <button class="btn-lixo" onclick="window.excluirCenario('${cenario.id}')">🗑️</button>
                </div>
            `;
            listaDiv.appendChild(div);
        });
    });
}

// 4. Alternar Visibilidade (Lógica Exclusiva: Só um por vez)
window.alternarCenario = function(id, novoStatus) {
    if (novoStatus === true) {
        // Se for ativar um, desativa TODOS os outros primeiro
        window.get(window.ref(window.db, 'mesa_rpg/cenarios')).then((snap) => {
            const updates = {};
            snap.forEach((child) => {
                // Desliga tudo
                updates[`mesa_rpg/cenarios/${child.key}/visivel`] = false;
            });
            // Liga o atual
            updates[`mesa_rpg/cenarios/${id}/visivel`] = true;
            
            window.update(window.ref(window.db), updates);
        });
    } else {
        // Se for desativar, apenas desativa ele
        window.update(window.ref(window.db, `mesa_rpg/cenarios/${id}`), { visivel: false });
    }
};

window.excluirCenario = function(id) {
    if(confirm("Tem certeza que deseja excluir este cenário?")) {
        window.remove(window.ref(window.db, `mesa_rpg/cenarios/${id}`));
    }
};


// --- FUNÇÕES DO JOGADOR ---

let cenarioMinimizado = false;

window.iniciarMonitoramentoCenarios = function() {
    const overlay = document.getElementById('cenario-overlay-player');
    const bg = document.getElementById('cenario-imagem-bg');
    const btnRestaurar = document.getElementById('btn-restaurar-cenario');
    
    if(!overlay || !bg) return; // Se não estiver na tela do jogador

    window.onValue(window.ref(window.db, 'mesa_rpg/cenarios'), (snapshot) => {
        let cenarioAtivo = null;

        if (snapshot.exists()) {
            snapshot.forEach((child) => {
                if (child.val().visivel) cenarioAtivo = child.val();
            });
        }

        if (cenarioAtivo) {
            // Existe um cenário para mostrar
            bg.style.backgroundImage = `url('${cenarioAtivo.imagem}')`;
            
            if (cenarioMinimizado) {
                // Se o jogador minimizou, mantém o botão, esconde o overlay
                overlay.style.display = 'none';
                overlay.classList.remove('ativo');
                if(btnRestaurar) btnRestaurar.style.display = 'block';
            } else {
                // Mostra full
                overlay.style.display = 'flex';
                // Pequeno delay para a animação CSS funcionar
                setTimeout(() => overlay.classList.add('ativo'), 10);
                if(btnRestaurar) btnRestaurar.style.display = 'none';
            }
        } else {
            // Nenhum cenário ativo: esconde tudo e reseta minimização
            overlay.classList.remove('ativo');
            setTimeout(() => { overlay.style.display = 'none'; }, 500); // Espera fade out
            if(btnRestaurar) btnRestaurar.style.display = 'none';
            cenarioMinimizado = false; 
        }
    });
};

window.minimizarCenario = function() {
    cenarioMinimizado = true;
    const overlay = document.getElementById('cenario-overlay-player');
    overlay.classList.remove('ativo');
    setTimeout(() => { overlay.style.display = 'none'; }, 500);
    document.getElementById('btn-restaurar-cenario').style.display = 'block';
};

window.restaurarCenario = function() {
    cenarioMinimizado = false;
    const overlay = document.getElementById('cenario-overlay-player');
    overlay.style.display = 'flex';
    setTimeout(() => overlay.classList.add('ativo'), 10);
    document.getElementById('btn-restaurar-cenario').style.display = 'none';
};