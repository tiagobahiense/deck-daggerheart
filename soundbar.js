// =========================================================
// SOUND BAR & SYNC SYSTEM (V5.0 - FIXED INIT & VISUALS)
// =========================================================

let soundbarAudio = null;
let savedVolume = 0.5; // Guarda o volume anterior ao mutar
let isMuted = false;

// Função principal de inicialização
window.initSoundSystemPlayer = function() {
    // Evita rodar se o Firebase (db) ainda não carregou
    if (!window.db || !window.ref) {
        console.log("Aguardando Firebase para iniciar SoundBar...");
        setTimeout(window.initSoundSystemPlayer, 500);
        return;
    }

    console.log("Iniciando Sistema de Som...");

    // 1. Cria o elemento de áudio se não existir
    if (!document.getElementById('soundbar-player-element')) {
        soundbarAudio = new Audio();
        soundbarAudio.id = 'soundbar-player-element';
        soundbarAudio.loop = false;
        document.body.appendChild(soundbarAudio);
        
        // Listeners
        soundbarAudio.addEventListener('timeupdate', atualizarBarraProgressoMestre);
        soundbarAudio.addEventListener('ended', () => {
             document.querySelectorAll('.btn-play-sound').forEach(b => {
                b.classList.remove('playing');
                b.innerHTML = "▶";
            });
             document.querySelectorAll('.sound-progress-bar').forEach(b => b.style.width = '0%');
        });
        soundbarAudio.addEventListener('error', (e) => {
            console.error("Erro ao carregar áudio:", soundbarAudio.src);
        });
    } else {
        soundbarAudio = document.getElementById('soundbar-player-element');
    }

    // 2. Recupera volume salvo do LocalStorage (Individual para cada navegador)
    const storedVol = localStorage.getItem('daggerheart_bgm_volume');
    if (storedVol !== null) {
        savedVolume = parseFloat(storedVol);
    }

    // 3. Configura o Slider (Tenta pegar Jogador ou Mestre)
    let slider = document.getElementById('player-volume-slider');
    if(!slider) slider = document.getElementById('master-volume-slider');

    if (slider) {
        // Inicializa o slider com o volume salvo
        slider.value = savedVolume;
        soundbarAudio.volume = savedVolume;
        
        // Se já começar mutado (opcional, por enquanto reseta pro volume salvo)
        isMuted = false;
        atualizarBotoesMuteVisualmente(false);
        
        slider.addEventListener('input', (e) => {
            // Se mexer no slider, sai do mudo automaticamente
            if (isMuted) window.toggleMute(); 
            
            const vol = parseFloat(e.target.value);
            soundbarAudio.volume = vol;
            savedVolume = vol;
            localStorage.setItem('daggerheart_bgm_volume', vol);
        });
    }

    // 4. Monitora Firebase para Tocar/Pausar
    // (Apenas ouve comandos, não sincroniza volume, volume é local)
    window.onValue(window.ref(window.db, 'mesa_rpg/soundbar/status'), (snap) => {
        if (!snap.exists()) return;
        const data = snap.val();
        
        if (data.action === 'play') {
            // Tratamento do nome do arquivo
            let nomeArquivo = data.file.trim();
            // Caminho relativo. Certifique-se que a pasta existe.
            let src = `audio/sound-bar/${nomeArquivo}`;
            
            let currentSrcDecoded = decodeURI(soundbarAudio.src);
            
            // Só troca a música se for diferente ou se estiver parada
            if (!currentSrcDecoded.endsWith(nomeArquivo) || soundbarAudio.paused) {
                soundbarAudio.src = src;
                soundbarAudio.volume = isMuted ? 0 : savedVolume;
                
                var playPromise = soundbarAudio.play();
                if (playPromise !== undefined) {
                    playPromise.catch(error => {
                        console.warn("Autoplay impedido ou arquivo não encontrado. Interaja com a página.", error);
                    });
                }
            }
            atualizarBotoesPlay(nomeArquivo, true);

        } else if (data.action === 'pause') {
            if (!soundbarAudio.paused) soundbarAudio.pause();
            atualizarBotoesPlay(data.file, false);
            
        } else if (data.action === 'stop') {
            soundbarAudio.pause();
            soundbarAudio.currentTime = 0;
            // Reseta visual
            document.querySelectorAll('.btn-play-sound').forEach(b => { b.classList.remove('playing'); b.innerHTML = "▶"; });
            document.querySelectorAll('.sound-progress-bar').forEach(b => b.style.width = '0%');
        }
    });
};

function atualizarBotoesPlay(arquivo, isPlaying) {
    // Atualiza ícones de Play/Pause na lista do Mestre
    document.querySelectorAll('.btn-play-sound').forEach(btn => {
        // Tenta identificar se o botão pertence ao arquivo atual
        // O onclick tem o nome do arquivo, usamos isso para comparar
        let btnOnClick = btn.getAttribute('onclick');
        if (btnOnClick && btnOnClick.includes(arquivo)) {
             if(isPlaying) {
                 btn.classList.add('playing');
                 btn.innerHTML = "⏸";
             } else {
                 btn.classList.remove('playing');
                 btn.innerHTML = "▶";
             }
        } else if (isPlaying) {
             // Se começou a tocar outro, reseta este
             btn.classList.remove('playing');
             btn.innerHTML = "▶";
        }
    });
}

function atualizarBarraProgressoMestre() {
    const modal = document.getElementById('modal-soundbar');
    if(!modal || modal.style.display === 'none') return;
    if(!soundbarAudio || !soundbarAudio.duration) return;

    const pct = (soundbarAudio.currentTime / soundbarAudio.duration) * 100;
    const currentSrc = decodeURI(soundbarAudio.src);
    
    document.querySelectorAll('.sound-progress-bar').forEach(bar => {
        if(currentSrc.endsWith(bar.dataset.file)) {
            bar.style.width = `${pct}%`;
        } else {
            bar.style.width = '0%';
        }
    });
}

// LÓGICA DE MUDO VISUAL E FUNCIONAL
window.toggleMute = function() {
    isMuted = !isMuted;
    
    let slider = document.getElementById('player-volume-slider');
    if(!slider) slider = document.getElementById('master-volume-slider');

    if (isMuted) {
        // MUDO ATIVADO
        soundbarAudio.volume = 0;
        if(slider) {
            slider.value = 0; // Desce a barra visualmente
            slider.classList.add('muted-slider');
        }
    } else {
        // MUDO DESATIVADO
        soundbarAudio.volume = savedVolume;
        if(slider) {
            slider.value = savedVolume; // Restaura a barra visualmente
            slider.classList.remove('muted-slider');
        }
    }
    
    atualizarBotoesMuteVisualmente(isMuted);
};

function atualizarBotoesMuteVisualmente(muted) {
    const btnPlayer = document.getElementById('btn-mute-icon');
    const btnMaster = document.getElementById('btn-mute-master');
    const botoes = [btnPlayer, btnMaster];

    botoes.forEach(btn => {
        if(btn) {
            if(muted) {
                btn.innerHTML = '🔇'; 
                btn.classList.add('muted'); // Classe CSS que dá transparência
            } else {
                btn.innerHTML = '🔊'; 
                btn.classList.remove('muted');
            }
        }
    });
}

// --- FUNÇÕES DE GERENCIAMENTO (MESTRE) ---

window.abrirSoundBar = function() {
    document.getElementById('modal-soundbar').style.display = 'flex';
    carregarListaAudios();
};

window.fecharSoundBar = function() {
    document.getElementById('modal-soundbar').style.display = 'none';
};

window.cadastrarMusica = function() {
    const nomeDisplay = document.getElementById('input-nome-musica').value;
    const nomeArquivo = document.getElementById('input-arquivo-musica').value.trim();

    if (!nomeDisplay || !nomeArquivo) return alert("Preencha nome e arquivo.");

    const novoRef = window.push(window.ref(window.db, 'mesa_rpg/soundbar/library'));
    window.set(novoRef, {
        nome: nomeDisplay,
        arquivo: nomeArquivo,
        timestamp: Date.now()
    }).then(() => {
        document.getElementById('input-nome-musica').value = "";
        document.getElementById('input-arquivo-musica').value = "";
        // alert("Cadastrado!"); // Feedback sutil é melhor, removi o alert
        carregarListaAudios(); // Recarrega lista
    });
};

function carregarListaAudios() {
    const listaDiv = document.getElementById('lista-soundbar-content');
    window.onValue(window.ref(window.db, 'mesa_rpg/soundbar/library'), (snap) => {
        listaDiv.innerHTML = "";
        if (!snap.exists()) {
            listaDiv.innerHTML = "<p style='color:#666; text-align:center'>Nenhuma música.</p>";
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
        // Pausar
        window.set(window.ref(window.db, 'mesa_rpg/soundbar/status'), {
            file: arquivo, action: 'pause', token: Date.now()
        });
    } else {
        // Tocar
        window.set(window.ref(window.db, 'mesa_rpg/soundbar/status'), {
            file: arquivo, action: 'play', token: Date.now()
        });
    }
};

window.pararSomTodos = function() {
    window.set(window.ref(window.db, 'mesa_rpg/soundbar/status'), { action: 'stop', token: Date.now() });
};

window.excluirMusica = function(id) {
    if(confirm("Remover da lista?")) window.remove(window.ref(window.db, `mesa_rpg/soundbar/library/${id}`));
};

// --- INICIALIZAÇÃO CORRIGIDA ---
// Tenta iniciar imediatamente. Se o DB não estiver pronto, a função tenta de novo sozinha.
window.initSoundSystemPlayer();