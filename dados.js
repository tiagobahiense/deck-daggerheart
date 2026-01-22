// =========================================================
// SISTEMA DE DADOS - DAGGERHEART
// =========================================================

// Estado da seleção de dados
let selecaoDados = {
    d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0,
    esperanca: 0, // d12 especial
    medo: 0       // d12 especial
};

// --- CONTROLE DE UI ---

window.abrirSeletorDados = function() {
    zerarSelecao();
    document.getElementById('modal-selecao-dados').style.display = 'flex';
};

window.fecharSeletorDados = function() {
    document.getElementById('modal-selecao-dados').style.display = 'none';
};

window.alterarQtdDado = function(tipo, delta) {
    if (selecaoDados[tipo] + delta >= 0) {
        selecaoDados[tipo] += delta;
        document.getElementById(`count-${tipo}`).innerText = selecaoDados[tipo];
    }
};

window.adicionarDualidade = function() {
    // Adiciona 1 Esperança e 1 Medo
    selecaoDados.esperanca = 1;
    selecaoDados.medo = 1;
    
    // Feedback visual ou rolar direto? 
    // Vamos rolar direto para agilidade, conforme pedido "clica e roda"
    window.rolarDadosConfirmados();
};

function zerarSelecao() {
    selecaoDados = { d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0, esperanca: 0, medo: 0 };
    // Reseta visual dos contadores
    ['d4','d6','d8','d10','d12','d20'].forEach(d => {
        const el = document.getElementById(`count-${d}`);
        if(el) el.innerText = '0';
    });
}

// --- LÓGICA DE ROLAGEM ---

window.rolarDadosConfirmados = function() {
    window.fecharSeletorDados();
    
    // Monta array de dados para rolar
    let pilhaDeDados = [];

    // Adiciona dados normais
    ['d4','d6','d8','d10','d12','d20'].forEach(tipo => {
        for(let i=0; i < selecaoDados[tipo]; i++) {
            pilhaDeDados.push({ tipo: tipo, faces: parseInt(tipo.substring(1)), classe: 'dado-normal', label: tipo });
        }
    });

    // Adiciona dados especiais Daggerheart
    for(let i=0; i < selecaoDados.esperanca; i++) {
        pilhaDeDados.push({ tipo: 'd12', faces: 12, classe: 'dado-esperanca', label: 'Esperança' });
    }
    for(let i=0; i < selecaoDados.medo; i++) {
        pilhaDeDados.push({ tipo: 'd12', faces: 12, classe: 'dado-medo', label: 'Medo' });
    }

    if (pilhaDeDados.length === 0) return; // Nada para rolar

    iniciarAnimacaoRolagem(pilhaDeDados);
};

// --- ANIMAÇÃO ---

function iniciarAnimacaoRolagem(dados) {
    const overlay = document.getElementById('overlay-rolagem');
    const container = document.getElementById('container-dados-rolando');
    const btnFechar = document.getElementById('btn-fechar-rolagem');
    
    overlay.style.display = 'flex';
    btnFechar.style.display = 'none'; // Esconde botão de fechar durante animação
    container.innerHTML = '';

    // Som de dados (opcional, se tiver o arquivo)
    // const audio = new Audio('audio/dice-roll.mp3'); audio.play();

    // 1. Cria os elementos visuais
    const elementosAnimados = dados.map(dado => {
        const el = document.createElement('div');
        el.className = `dado-visual ${dado.classe}`;
        el.innerHTML = `<span class="label-dado">${dado.label}</span><span class="valor">?</span>`;
        container.appendChild(el);
        return { 
            el: el, 
            faces: dado.faces, 
            valorFinal: Math.floor(Math.random() * dado.faces) + 1,
            interval: null 
        };
    });

    // 2. Animação de números rodando (Shuffle)
    elementosAnimados.forEach(item => {
        const spanValor = item.el.querySelector('.valor');
        
        // Troca números a cada 50ms
        item.interval = setInterval(() => {
            spanValor.innerText = Math.floor(Math.random() * item.faces) + 1;
        }, 50);
    });

    // 3. Parar e Fixar Resultado após 3 segundos (3000ms)
    setTimeout(() => {
        elementosAnimados.forEach(item => {
            clearInterval(item.interval); // Para a troca aleatória
            
            const spanValor = item.el.querySelector('.valor');
            spanValor.innerText = item.valorFinal;
            
            // Remove tremedeira e aplica efeito de "chegada"
            item.el.style.animation = 'resultadoFinal 0.3s ease-out forwards';
            
            // Destaque visual para Críticos no D12 (Esperança/Medo)
            if (item.faces === 12 && item.valorFinal === 12) {
                item.el.style.boxShadow = "0 0 50px #fff"; // Brilho extra
                item.el.style.borderColor = "#fff";
            }
        });
        
        // Mostra botão de fechar
        btnFechar.style.display = 'block';

        // Aqui você poderia adicionar lógica para enviar o resultado para o chat/log do Firebase
        // registrarRolagemNoFirebase(elementosAnimados);

    }, 3000);
}

window.fecharResultadoRolagem = function() {
    document.getElementById('overlay-rolagem').style.display = 'none';
};