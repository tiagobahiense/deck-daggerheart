// =========================================================
// SOUND BAR & SYNC SYSTEM (V3.0 - FIX MUTE & LIST)
// =========================================================

let soundbarAudio = null;
let playerVolume = 0.5;
let isMuted = false;

window.initSoundSystemPlayer = function() {
    if (!document.getElementById('soundbar-player-element')) {
        soundbarAudio = new Audio();
        soundbarAudio.id = 'soundbar-player-element';
        soundbarAudio.loop = false;
        document.body.appendChild(soundbarAudio);
        
        soundbarAudio.addEventListener('timeupdate', atualizarBarraProgressoMestre);
        soundbarAudio.addEventListener('ended', () => {
             document.querySelectorAll('.btn-play-sound').forEach(b => {
                b.classList.remove('playing');
                b.innerHTML = "▶";
            });
             document.querySelectorAll('.sound-progress-bar').forEach(b => b.style.width = '0%');
        });
    } else {
        soundbarAudio = document.getElementById('soundbar-player-element');
    }

    // Tenta pegar o slider do Jogador OU do Mestre
    let slider = document.getElementById('player-volume-slider');
    if(!slider) slider = document.getElementById('master-volume-slider');

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
        
        if (data.action === 'play') {
            // CORREÇÃO: Garante que espaços no nome do arquivo não quebrem o link
            let safeFile = encodeURI(data.file).replace(/%20/g, " "); // Alguns browsers preferem espaço cru em local, outros %20.
            // Mas o ideal para src é encode. Vamos tentar direto primeiro.
            
            let src = `audio/sound-bar/${data.file}`;
            
            // Só troca se for musica nova
            if (!soundbarAudio.src.includes(encodeURI(data.file)) || soundbarAudio.paused) {
                soundbarAudio.src = src;
                soundbarAudio.volume = isMuted ? 0 : playerVolume;
                soundbarAudio.play().catch(e => console.error("Erro ao tocar (verifique o nome do arquivo):", e));
            }
            
        } else if (data.action === 'pause') {
            if (!soundbarAudio.paused) soundbarAudio.pause();
            
        } else if (data.action === 'stop') {
            soundbarAudio.pause();
            soundbarAudio.currentTime = 0;
        }
    });
};

function atualizarBarraProgressoMestre() {
    const modal = document.getElementById('modal-soundbar');
    if(!modal || modal.style.display === 'none') return;
    if(!soundbarAudio || !soundbarAudio.duration) return;

    const pct = (soundbarAudio.currentTime / soundbarAudio.duration) * 100;
    
    // Tenta encontrar a barra baseada no src atual
    const currentSrc = decodeURI(soundbarAudio.src);
    // Procura em todas as barras qual corresponde ao arquivo tocando
    document.querySelectorAll('.sound-progress-bar').forEach(bar => {
        if(currentSrc.includes(bar.dataset.file)) {
            bar.style.width = `${pct}%`;
        } else {
            bar.style.width = '0%';
        }
    });
}

// CORREÇÃO DO MUTE (FUNCIONA PRA JOGADOR E MESTRE)
window.toggleMute = function() {
    isMuted = !isMuted;
    
    // Tenta pegar os dois tipos de botão (index e mestre usam IDs diferentes agora)
    const btnPlayer = document.getElementById('btn-mute-icon');
    const btnMaster = document.getElementById('btn-mute-master');
    const botoes = [btnPlayer, btnMaster];

    if (isMuted) {
        soundbarAudio.volume = 0;
        botoes.forEach(btn => {
            if(btn) { btn.innerText = '🔇'; btn.classList.add('muted'); }
        });
    } else {
        atualizarVolumeReal();
        botoes.forEach(btn => {
            if(btn) { btn.innerText = '🔊'; btn.classList.remove('muted'); }
        });
    }
};

function atualizarVolumeReal() {
    if (isMuted) return;
    if (soundbarAudio) soundbarAudio.volume = playerVolume;
}

// --- FUNÇÕES MESTRE ---

window.abrirSoundBar = function() {
    document.getElementById('modal-soundbar').style.display = 'flex';
    carregarListaAudios();
};

window.fecharSoundBar = function() {
    document.getElementById('modal-soundbar').style.display = 'none';
};

window.cadastrarMusica = function() {
    const nomeDisplay = document.getElementById('input-nome-musica').value;
    const nomeArquivo = document.getElementById('input-arquivo-musica').value.trim(); // Trim para evitar espaços acidentais

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
            
            div.innerHTML = `
                <div class="sound-row-top">
                    <div class="info-sound">
                        <span class="icon-note">🎵</span>
                        <div style="display:flex; flex-direction:column; width:100%; overflow:hidden;">
                            <span class="nome-musica">${data.nome}</span>
                            <span style="font-size:0.7rem; color:#666; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${data.arquivo}</span>
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

window.tocarParaTodos = function(arquivo, btnElement) {
    if (btnElement.classList.contains('playing')) {
        btnElement.classList.remove('playing');
        btnElement.innerHTML = "▶";
        window.set(window.ref(window.db, 'mesa_rpg/soundbar/status'), {
            file: arquivo, action: 'pause', token: Date.now()
        });
    } else {
        document.querySelectorAll('.btn-play-sound').forEach(b => {
            b.classList.remove('playing'); b.innerHTML = "▶";
        });
        btnElement.classList.add('playing');
        btnElement.innerHTML = "⏸";
        window.set(window.ref(window.db, 'mesa_rpg/soundbar/status'), {
            file: arquivo, action: 'play', token: Date.now()
        });
    }
};

window.pararSomTodos = function() {
    window.set(window.ref(window.db, 'mesa_rpg/soundbar/status'), { action: 'stop', token: Date.now() });
    document.querySelectorAll('.btn-play-sound').forEach(b => { b.classList.remove('playing'); b.innerHTML = "▶"; });
    document.querySelectorAll('.sound-progress-bar').forEach(b => b.style.width = '0%');
};

window.excluirMusica = function(id) {
    if(confirm("Remover?")) window.remove(window.ref(window.db, `mesa_rpg/soundbar/library/${id}`));
};

window.addEventListener('load', () => { setTimeout(window.initSoundSystemPlayer, 1500); });