// =========================================================
// SOUND BAR & SYNC SYSTEM (V2.0 - Progress & Pause)
// =========================================================

// --- PLAYER: GERENCIAMENTO DE ÁUDIO ---
let soundbarAudio = null; // O elemento de áudio global
let playerVolume = 0.5;   // Volume padrão
let isMuted = false;

window.initSoundSystemPlayer = function() {
    if (!document.getElementById('soundbar-player-element')) {
        soundbarAudio = new Audio();
        soundbarAudio.id = 'soundbar-player-element';
        soundbarAudio.loop = false;
        document.body.appendChild(soundbarAudio);
        
        // --- NOVO: Listener para atualizar barra de progresso no Mestre ---
        // Como o mestre também tem esse audio tocando, usamos ele como referência de tempo
        soundbarAudio.addEventListener('timeupdate', atualizarBarraProgressoMestre);
        soundbarAudio.addEventListener('ended', () => {
             // Reseta visual quando acaba
             document.querySelectorAll('.btn-play-sound').forEach(b => {
                b.classList.remove('playing');
                b.innerHTML = "▶";
            });
             document.querySelectorAll('.sound-progress-bar').forEach(b => b.style.width = '0%');
        });

    } else {
        soundbarAudio = document.getElementById('soundbar-player-element');
    }

    const slider = document.getElementById('player-volume-slider');
    if (slider) {
        slider.value = playerVolume;
        slider.addEventListener('input', (e) => {
            playerVolume = parseFloat(e.target.value);
            atualizarVolumeReal();
        });
    }

    window.onValue(window.ref(window.db, 'mesa_rpg/soundbar/status'), (snap) => {
        if (!snap.exists()) return;
        const data = snap.val();
        
        // Lógica de Play/Pause
        if (data.action === 'play') {
            let src = data.file;
            if (!src.startsWith('http') && !src.startsWith('data:')) {
                src = `audio/sound-bar/${data.file}`;
            }
            
            // Se já é a mesma música
            if (decodeURI(soundbarAudio.src).endsWith(encodeURI(src))) {
                if(soundbarAudio.paused) soundbarAudio.play().catch(e => console.log(e));
            } else {
                // Música nova
                soundbarAudio.src = src;
                soundbarAudio.play().catch(e => console.log("Interação necessária:", e));
            }
            
        } else if (data.action === 'pause') {
            // --- NOVO: Lógica de Pausa ---
            if (!soundbarAudio.paused) soundbarAudio.pause();
            
        } else if (data.action === 'stop') {
            soundbarAudio.pause();
            soundbarAudio.currentTime = 0;
        }
    });
};

// --- NOVA FUNÇÃO DE PROGRESSO ---
function atualizarBarraProgressoMestre() {
    // Só roda se o modal do mestre estiver aberto para economizar recurso
    const modal = document.getElementById('modal-soundbar');
    if(!modal || modal.style.display === 'none') return;

    if(!soundbarAudio || !soundbarAudio.duration) return;

    // Calcula %
    const pct = (soundbarAudio.currentTime / soundbarAudio.duration) * 100;
    
    // Acha o arquivo que está tocando agora (precisamos do nome do arquivo no src)
    // Decodifica URI para lidar com espaços (%20)
    const currentSrc = decodeURI(soundbarAudio.src);
    const fileName = currentSrc.split('/').pop(); 
    
    // Procura a barra correspondente no DOM do Mestre
    // (Adicionamos um data-attribute no HTML gerado para facilitar)
    const progressBar = document.querySelector(`.sound-progress-bar[data-file="${fileName}"]`);
    if(progressBar) {
        progressBar.style.width = `${pct}%`;
    }
}

window.toggleMute = function() {
    isMuted = !isMuted;
    const btn = document.getElementById('btn-mute-icon');
    
    if (isMuted) {
        soundbarAudio.volume = 0;
        if(btn) {
            btn.innerText = '🔇';
            btn.classList.add('muted');
        }
    } else {
        atualizarVolumeReal();
        if(btn) {
            btn.innerText = '🔊';
            btn.classList.remove('muted');
        }
    }
};

function atualizarVolumeReal() {
    if (isMuted) return;
    if (soundbarAudio) soundbarAudio.volume = playerVolume;
}

// --- MESTRE: GERENCIAMENTO ---

window.abrirSoundBar = function() {
    document.getElementById('modal-soundbar').style.display = 'flex';
    carregarListaAudios();
};

window.fecharSoundBar = function() {
    document.getElementById('modal-soundbar').style.display = 'none';
};

window.cadastrarMusica = function() {
    const nomeDisplay = document.getElementById('input-nome-musica').value;
    const nomeArquivo = document.getElementById('input-arquivo-musica').value;

    if (!nomeDisplay || !nomeArquivo) return alert("Preencha tudo.");

    const novoRef = window.push(window.ref(window.db, 'mesa_rpg/soundbar/library'));
    window.set(novoRef, {
        nome: nomeDisplay,
        arquivo: nomeArquivo,
        timestamp: Date.now()
    }).then(() => {
        document.getElementById('input-nome-musica').value = "";
        document.getElementById('input-arquivo-musica').value = "";
        alert("Cadastrado!");
    });
};

function carregarListaAudios() {
    const listaDiv = document.getElementById('lista-soundbar-content');
    window.onValue(window.ref(window.db, 'mesa_rpg/soundbar/library'), (snap) => {
        listaDiv.innerHTML = "";
        if (!snap.exists()) {
            listaDiv.innerHTML = "<p style='color:#666; text-align:center'>Vazio.</p>";
            return;
        }

        snap.forEach(child => {
            const data = child.val();
            const id = child.key;

            const div = document.createElement('div');
            div.className = 'item-soundbar';
            
            // Adicionado data-file na barra de progresso para acharmos ela depois
            div.innerHTML = `
                <div class="sound-row-top">
                    <div class="info-sound">
                        <span class="icon-note">🎵</span>
                        <div style="display:flex; flex-direction:column; width:100%;">
                            <span class="nome-musica">${data.nome}</span>
                            <span style="font-size:0.7rem; color:#666;">${data.arquivo}</span>
                        </div>
                    </div>
                    <div class="controls-sound">
                        <button class="btn-play-sound" onclick="window.tocarParaTodos('${data.arquivo}', this)">▶</button>
                        <button class="btn-delete-sound" onclick="window.excluirMusica('${id}')">🗑️</button>
                    </div>
                </div>
                <div class="sound-progress-container">
                    <div class="sound-progress-bar" data-file="${data.arquivo}"></div>
                </div>
            `;
            listaDiv.appendChild(div);
        });
    });
}

// 3. Tocar/Pausar (Lógica Melhorada)
window.tocarParaTodos = function(arquivo, btnElement) {
    // Verifica se já está tocando ESTA música (classe playing)
    if (btnElement.classList.contains('playing')) {
        // --- PAUSA ---
        btnElement.classList.remove('playing');
        btnElement.innerHTML = "▶";
        
        window.set(window.ref(window.db, 'mesa_rpg/soundbar/status'), {
            file: arquivo,
            action: 'pause', // Nova ação
            token: Date.now()
        });

    } else {
        // --- PLAY ---
        // Reseta todos os outros botões visualmente
        document.querySelectorAll('.btn-play-sound').forEach(b => {
            b.classList.remove('playing');
            b.innerHTML = "▶";
        });
        
        btnElement.classList.add('playing');
        btnElement.innerHTML = "⏸"; // Simbolo de Pause

        window.set(window.ref(window.db, 'mesa_rpg/soundbar/status'), {
            file: arquivo,
            action: 'play',
            token: Date.now()
        });
    }
};

window.pararSomTodos = function() {
    window.set(window.ref(window.db, 'mesa_rpg/soundbar/status'), {
        action: 'stop',
        token: Date.now()
    });
    document.querySelectorAll('.btn-play-sound').forEach(b => {
        b.classList.remove('playing');
        b.innerHTML = "▶";
    });
    // Zera todas as barras
    document.querySelectorAll('.sound-progress-bar').forEach(b => b.style.width = '0%');
};

window.excluirMusica = function(id) {
    if(confirm("Remover?")) {
        window.remove(window.ref(window.db, `mesa_rpg/soundbar/library/${id}`));
    }
};

window.addEventListener('load', () => {
    setTimeout(window.initSoundSystemPlayer, 1500);
});