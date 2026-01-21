// ============ SISTEMA DE PROFISSÃO ============

const profissaoConfig = {
    'Guardião': { classe: 'guardiao', cor: 'rgb(0, 200, 255)' },
    'Bardo': { classe: 'bardo', cor: 'rgb(200, 0, 255)' },
    'Mago': { classe: 'mago', cor: 'rgb(100, 200, 255)' },
    'Feiticeiro': { classe: 'feiticeiro', cor: 'rgb(150, 0, 200)' },
    'Guerreiro': { classe: 'guerreiro', cor: 'rgb(255, 100, 0)' },
    'Ladino': { classe: 'ladino', cor: 'rgb(100, 200, 0)' },
    'Serafim': { classe: 'serafim', cor: 'rgb(255, 215, 0)' },
    'Druida': { classe: 'druida', cor: 'rgb(0, 255, 100)' },
    'Patrulheiro': { classe: 'patrulheiro', cor: 'rgb(255, 200, 0)' }
};

let profissaoAtiva = null;
let particulasAnimadas = [];
let cartasDisponiveis = [];

// Detecta quando a classe fundamental é preenchida
window.monitorarClasseFundamental = function() {
    const slotFundamental = document.getElementById('slot-Fundamental');
    if (!slotFundamental) return;

    // Observer para mudanças no elemento
    const observer = new MutationObserver(() => {
        const img = slotFundamental.querySelector('img');
        if (img && img.src) {
            // Tira a profissão baseado na imagem e slotsFixos
            if (typeof window.slotsFixos !== 'undefined' && window.slotsFixos && window.slotsFixos['Fundamental']) {
                const cartaFundamental = window.slotsFixos['Fundamental'];
                if (cartaFundamental && cartaFundamental.profissao) {
                    ativarProfissao(cartaFundamental.profissao);
                } else {
                    // Tenta procurar por nome na lista
                    procurarProfissaoPorNome(cartaFundamental.nome);
                }
            }
        } else {
            // Sem imagem = sem profissão
            desativarProfissao();
        }
    });

    observer.observe(slotFundamental, { childList: true, subtree: true, attributes: true });
};

// Procura a profissão pelo nome da carta
function procurarProfissaoPorNome(nomeCarta) {
    // Tenta carregar a lista de cartas
    fetch('lista_cartas.json')
        .then(res => res.json())
        .then(cartas => {
            for (let carta of cartas) {
                if (carta.nome === nomeCarta && carta.profissao) {
                    ativarProfissao(carta.profissao);
                    return;
                }
            }
        })
        .catch(err => console.warn('Erro ao carregar cartas:', err));
}

// Ativa os efeitos visuais da profissão
function ativarProfissao(profissao) {
    if (profissaoAtiva === profissao) return; // Já ativa

    profissaoAtiva = profissao;
    const config = profissaoConfig[profissao];

    if (!config) return;

    // Aplica a classe CSS na aura
    const aura = document.getElementById('aura-profissao');
    if (aura) {
        // Remove todas as classes anteriores
        Object.keys(profissaoConfig).forEach(prof => {
            aura.classList.remove(`${profissaoConfig[prof].classe}-aura`);
        });

        // Adiciona a nova classe
        aura.classList.add(`${config.classe}-aura`, 'profissao-aura-ativa');
    }

    // Inicia as partículas
    iniciarParticulasProfissao(config);

    console.log(`✨ Profissão ativada: ${profissao}`);
}

// Expor como function global
window.ativarProfissao = ativarProfissao;

// Cria e anima partículas flutuantes
function iniciarParticulasProfissao(config) {
    const container = document.getElementById('particulas-profissao');
    if (!container) return;

    // Limpa partículas antigas
    container.innerHTML = '';
    particulasAnimadas = [];

    // Cria 20-30 partículas
    const numPartículas = 20 + Math.random() * 10;
    for (let i = 0; i < numPartículas; i++) {
        setTimeout(() => criarPartícula(container, config, i), i * 100);
    }

    // Cria novas partículas continuamente
    setInterval(() => {
        if (profissaoAtiva && container) {
            criarPartícula(container, config, Math.random());
        }
    }, 2000);
}

function criarPartícula(container, config, index) {
    const particula = document.createElement('div');
    particula.className = `particula ${config.classe}`;

    // Tamanho aleatório (2-8px)
    const tamanho = 2 + Math.random() * 6;
    particula.style.width = tamanho + 'px';
    particula.style.height = tamanho + 'px';

    // Posição inicial aleatória
    const x = Math.random() * window.innerWidth;
    const y = window.innerHeight + 50;

    particula.style.left = x + 'px';
    particula.style.top = y + 'px';

    // Desvio horizontal aleatório (drift)
    const drift = (Math.random() - 0.5) * 200;
    particula.style.setProperty('--drift', drift + 'px');

    // Duração variável da animação
    const duration = 8 + Math.random() * 6; // 8-14s
    particula.style.animation = `flutuar ${duration}s ease-in linear`;

    container.appendChild(particula);

    // Remove depois que a animação termina
    setTimeout(() => {
        particula.remove();
    }, duration * 1000);
}

// Desativa os efeitos de profissão
function desativarProfissao() {
    if (profissaoAtiva === null) return;

    profissaoAtiva = null;
    const aura = document.getElementById('aura-profissao');
    if (aura) {
        aura.className = ''; // Remove todas as classes
    }

    const container = document.getElementById('particulas-profissao');
    if (container) {
        container.innerHTML = '';
    }

    console.log('✨ Profissão desativada');
}

// Expor como function global
window.desativarProfissao = desativarProfissao;

