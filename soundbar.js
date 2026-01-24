// =========================================================
// SOUND BAR & SYNC SYSTEM (V4.0 - VISUAL MUTE & LOCAL VOL)
// =========================================================

let soundbarAudio = null;
let savedVolume = 0.5; // Guarda o volume anterior ao mutar
let isMuted = false;

window.initSoundSystemPlayer = function() {
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
            console.error("Erro ao carregar áudio:", soundbarAudio.src, e);
            // alert("Erro ao tocar. Verifique se o arquivo está na pasta audio/sound-bar/");
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
        
        slider.addEventListener('input', (e) => {
            // Se mexer no slider, sai do mudo automaticamente
            if (isMuted) window.toggleMute(); 
            
            const vol = parseFloat(e.target.value);
            soundbarAudio.volume = vol;
            savedVolume = vol;
            localStorage.setItem('daggerheart_bgm_volume', vol);
        });
    }

    // 4. Monitora Firebase (Apenas Play/Pause - Volume é local)
    window.onValue(window.ref(window.db, 'mesa_rpg/soundbar/status'), (snap) => {
        if (!snap.exists()) return;
        const data = snap.val();
        
        if (data.action === 'play') {
            // Constrói o caminho. EncodeURI ajuda com espaços
            // IMPORTANTE: O arquivo DEVE estar em 'audio/sound-bar/'
            let nomeArquivo = data.file.trim();
            let src = `audio/sound-bar/${nomeArquivo}`;
            
            // Verifica se precisa trocar a música
            // Decodificamos o src atual para comparar com o nome simples
            let currentSrcDecoded = decodeURI(soundbarAudio.src);
            
            if (!currentSrcDecoded.endsWith(nomeArquivo) || soundbarAudio.paused) {
                soundbarAudio.src = src;
                // Aplica o volume local (se estiver mutado, mantém 0)
                soundbarAudio.volume = isMuted ? 0 : savedVolume;
                
                soundbarAudio.play().catch(e => {
                    console.warn("Autoplay bloqueado ou arquivo não encontrado:", e);
                });
            }
            
            // Atualiza botões visuais (caso tenha entrado no meio da sessão)
            atualizarBotoesPlay(nomeArquivo, true);

        } else if (data.action === 'pause') {
            if (!soundbarAudio.paused) soundbarAudio.pause();
            atualizarBotoesPlay(data.file, false);
            
        } else if (data.action === 'stop') {
            soundbarAudio.pause();
            soundbarAudio.currentTime = 0;
            document.querySelectorAll('.btn-play-sound').forEach(b => { b.classList.remove('playing'); b.innerHTML = "▶"; });
            document.querySelectorAll('.sound-progress-bar').forEach(b => b.style.width = '0%');
        }
    });
};

function atualizarBotoesPlay(arquivo, isPlaying) {
    document.querySelectorAll('.btn-play-sound').forEach(btn => {
        // O botão tem um onclick que passa o nome do arquivo. 
        // Vamos tentar identificar pelo contexto ou refazer a lista.
        // Como simplificação, resetamos todos e ativamos o que clicou se formos o mestre.
        // Se formos jogador, essa função é apenas visual.
        
        // Reset geral
        if(isPlaying) {
             // Se o botão chama a função com esse arquivo
             if (btn.getAttribute('onclick').includes(arquivo)) {
                 btn.classList.add('playing');
                 btn.innerHTML = "⏸";
             } else {
                 btn.classList.remove('playing');
                 btn.innerHTML = "▶";
             }
        } else {
             if (btn.getAttribute('onclick').includes(arquivo)) {
                 btn.classList.remove('playing');
                 btn.innerHTML = "▶";
             }
        }
    });
}

function atualizarBarraProgressoMestre() {
    const modal = document.getElementById('modal-soundbar');
    // Só atualiza se o modal estiver visível (performance)
    if(!modal || modal.style.display === 'none') return;
    if(!soundbarAudio || !soundbarAudio.duration) return;

    const pct = (soundbarAudio.currentTime / soundbarAudio.duration) * 100;
    const currentSrc = decodeURI(soundbarAudio.src);
    
    document.querySelectorAll('.sound-progress-bar').forEach(bar => {
        // Verifica se a barra pertence ao arquivo tocando
        if(currentSrc.endsWith(bar.dataset.file)) {
            bar.style.width = `${pct}%`;
        } else {
            bar.style.width = '0%';
        }
    });
}

// LÓGICA DE MUDO VISUAL (SLIDER DESCE)
window.toggleMute = function() {
    isMuted = !isMuted;
    
    let slider = document.getElementById('player-volume-slider');
    if(!slider) slider = document.getElementById('master-volume-slider');
    
    // Pega botões de ícone (Jogador e Mestre)
    const btnPlayer = document.getElementById('btn-mute-icon');
    const btnMaster = document.getElementById('btn-mute-master'); // ID corrigido no HTML do Mestre
    const botoes = [btnPlayer, btnMaster];

    if (isMuted) {
        // MUTADO
        soundbarAudio.volume = 0;
        
        if(slider) {
            slider.value = 0; // Slider desce visualmente
            slider.classList.add('muted-slider'); // Opcional: muda cor do thumb
        }

        botoes.forEach(btn => {
            if(btn) { 
                btn.innerHTML = '🔇'; // Ícone mudo
                btn.classList.add('muted'); // Fica transparente via CSS
            }
        });

    } else {
        // DESMUTADO (Restaura)
        soundbarAudio.volume = savedVolume;
        
        if(slider) {
            slider.value = savedVolume; // Slider volta para onde estava
            slider.classList.remove('muted-slider');
        }

        botoes.forEach(btn => {
            if(btn) { 
                btn.innerHTML = '🔊'; 
                btn.classList.remove('muted'); // Volta opacidade normal
            }
        });
    }
};

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
    const nomeArquivo = document.getElementById('input-arquivo-musica').value.trim();

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
    // Se clicar no botão que já está tocando -> PAUSA
    if (btnElement.classList.contains('playing')) {
        btnElement.classList.remove('playing');
        btnElement.innerHTML = "▶";
        window.set(window.ref(window.db, 'mesa_rpg/soundbar/status'), {
            file: arquivo, action: 'pause', token: Date.now()
        });
    } else {
        // Se clicar em outro -> TOCA
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