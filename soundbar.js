// =========================================================
// SOUND BAR & SYNC SYSTEM
// =========================================================

// --- PLAYER: GERENCIAMENTO DE ÁUDIO ---
let soundbarAudio = null; // O elemento de áudio global
let playerVolume = 0.5;   // Volume padrão
let isMuted = false;

window.initSoundSystemPlayer = function() {
    // Cria o elemento de áudio via JS para não sujar o HTML
    if (!document.getElementById('soundbar-player-element')) {
        soundbarAudio = new Audio();
        soundbarAudio.id = 'soundbar-player-element';
        soundbarAudio.loop = false; // Como pedido: sem loop
        document.body.appendChild(soundbarAudio);
    } else {
        soundbarAudio = document.getElementById('soundbar-player-element');
    }

    // Configura o slider de volume visual
    const slider = document.getElementById('player-volume-slider');
    if (slider) {
        slider.value = playerVolume;
        slider.addEventListener('input', (e) => {
            playerVolume = parseFloat(e.target.value);
            atualizarVolumeReal();
        });
    }

    // Monitora o Banco de Dados para tocar música
    window.onValue(window.ref(window.db, 'mesa_rpg/soundbar/status'), (snap) => {
        if (!snap.exists()) return;
        const data = snap.val();
        
        // Verifica se é um comando novo comparando timestamp (token)
        // Mas se a página acabou de carregar, tocamos o que estiver ativo se não for muito antigo
        const now = Date.now();
        const timeDiff = now - (data.token || 0);

        if (data.action === 'play') {
            // Toca a música
            // Se for arquivo local (nome curto), adiciona o caminho. Se for URL completa (firebase), usa direta.
            let src = data.file;
            if (!src.startsWith('http') && !src.startsWith('data:')) {
                src = `audio/sound-bar/${data.file}`;
            }
            
            // Só troca o source se for diferente ou se for um comando forçado
            if (decodeURI(soundbarAudio.src).endsWith(encodeURI(src)) && !soundbarAudio.paused) {
                // Já está tocando essa música, não reinicia
            } else {
                soundbarAudio.src = src;
                soundbarAudio.play().catch(e => console.log("Interação necessária para áudio:", e));
            }
        } else if (data.action === 'stop') {
            soundbarAudio.pause();
            soundbarAudio.currentTime = 0;
        }
    });
};

window.toggleMute = function() {
    isMuted = !isMuted;
    const btn = document.getElementById('btn-mute-icon');
    
    if (isMuted) {
        soundbarAudio.volume = 0;
        if(btn) btn.innerText = '🔇';
        if(btn) btn.classList.add('muted');
    } else {
        atualizarVolumeReal();
        if(btn) btn.innerText = '🔊';
        if(btn) btn.classList.remove('muted');
    }
};

function atualizarVolumeReal() {
    if (isMuted) return;
    if (soundbarAudio) soundbarAudio.volume = playerVolume;
}

// --- MESTRE: GERENCIAMENTO DE TRACKS ---

window.abrirSoundBar = function() {
    document.getElementById('modal-soundbar').style.display = 'flex';
    carregarListaAudios();
};

window.fecharSoundBar = function() {
    document.getElementById('modal-soundbar').style.display = 'none';
};

// 1. Cadastrar nova música (Salva apenas o nome do arquivo no DB)
window.cadastrarMusica = function() {
    const nomeDisplay = document.getElementById('input-nome-musica').value; // Ex: Tema de Batalha
    const nomeArquivo = document.getElementById('input-arquivo-musica').value; // Ex: batalha.mp3

    if (!nomeDisplay || !nomeArquivo) return alert("Preencha o nome de exibição e o nome exato do arquivo.");

    const novoRef = window.push(window.ref(window.db, 'mesa_rpg/soundbar/library'));
    window.set(novoRef, {
        nome: nomeDisplay,
        arquivo: nomeArquivo,
        timestamp: Date.now()
    }).then(() => {
        document.getElementById('input-nome-musica').value = "";
        document.getElementById('input-arquivo-musica').value = "";
        alert("Música cadastrada! Certifique-se que o arquivo está na pasta audio/sound-bar/");
    });
};

// 2. Listar músicas
function carregarListaAudios() {
    const listaDiv = document.getElementById('lista-soundbar-content');
    window.onValue(window.ref(window.db, 'mesa_rpg/soundbar/library'), (snap) => {
        listaDiv.innerHTML = "";
        if (!snap.exists()) {
            listaDiv.innerHTML = "<p style='color:#666; text-align:center'>Nenhuma música cadastrada.</p>";
            return;
        }

        snap.forEach(child => {
            const data = child.val();
            const id = child.key;

            const div = document.createElement('div');
            div.className = 'item-soundbar';
            div.innerHTML = `
                <div class="info-sound">
                    <span class="icon-note">🎵</span>
                    <div style="display:flex; flex-direction:column;">
                        <span class="nome-musica">${data.nome}</span>
                        <span style="font-size:0.7rem; color:#666;">${data.arquivo}</span>
                    </div>
                </div>
                <div class="controls-sound">
                    <button class="btn-play-sound" onclick="window.tocarParaTodos('${data.arquivo}', this)">▶</button>
                    <button class="btn-delete-sound" onclick="window.excluirMusica('${id}')">🗑️</button>
                </div>
            `;
            listaDiv.appendChild(div);
        });
    });
}

// 3. Tocar (Envia comando para todos)
window.tocarParaTodos = function(arquivo, btnElement) {
    // Feedback visual
    document.querySelectorAll('.btn-play-sound').forEach(b => {
        b.classList.remove('playing');
        b.innerHTML = "▶";
    });
    
    if (btnElement) {
        btnElement.classList.add('playing');
        btnElement.innerHTML = "⏸"; // Ícone de pausar/parar (simbólico, pois o clique re-toca)
    }

    window.set(window.ref(window.db, 'mesa_rpg/soundbar/status'), {
        file: arquivo,
        action: 'play',
        token: Date.now()
    });
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
};

window.excluirMusica = function(id) {
    if(confirm("Remover da lista?")) {
        window.remove(window.ref(window.db, `mesa_rpg/soundbar/library/${id}`));
    }
};

// Inicializador
window.addEventListener('load', () => {
    // Inicia o sistema de player (para jogador e mestre ouvirem)
    setTimeout(window.initSoundSystemPlayer, 1500);
});