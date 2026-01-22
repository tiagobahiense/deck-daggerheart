// =========================================================
// SISTEMA DE DADOS MULTIPLAYER - DAGGERHEART
// =========================================================

let selecaoDados = { d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0, esperanca: 0, medo: 0 };
let audioRolagem = null; // Preparado para futuro audio

// --- CONTROLE DE UI LOCAL ---

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
    selecaoDados.esperanca = 1;
    selecaoDados.medo = 1;
    window.rolarDadosConfirmados();
};

function zerarSelecao() {
    selecaoDados = { d4: 0, d6: 0, d8: 0, d10: 0, d12: 0, d20: 0, esperanca: 0, medo: 0 };
    ['d4','d6','d8','d10','d12','d20'].forEach(d => {
        const el = document.getElementById(`count-${d}`);
        if(el) el.innerText = '0';
    });
}

// --- 1. ENVIO: CALCULA E MANDA PRO FIREBASE ---

window.rolarDadosConfirmados = function() {
    window.fecharSeletorDados();
    
    let dadosCalculados = [];
    
    // Gera os resultados localmente antes de enviar
    // Assim todos verão o mesmo número final
    
    // Dados Normais
    ['d4','d6','d8','d10','d12','d20'].forEach(tipo => {
        const faces = parseInt(tipo.substring(1));
        for(let i=0; i < selecaoDados[tipo]; i++) {
            dadosCalculados.push({
                tipo: tipo,
                faces: faces,
                classe: 'dado-normal',
                label: tipo,
                valorFinal: Math.floor(Math.random() * faces) + 1
            });
        }
    });

    // Dados Especiais
    for(let i=0; i < selecaoDados.esperanca; i++) {
        dadosCalculados.push({
            tipo: 'd12', faces: 12, classe: 'dado-esperanca', label: 'Esperança',
            valorFinal: Math.floor(Math.random() * 12) + 1
        });
    }
    for(let i=0; i < selecaoDados.medo; i++) {
        dadosCalculados.push({
            tipo: 'd12', faces: 12, classe: 'dado-medo', label: 'Medo',
            valorFinal: Math.floor(Math.random() * 12) + 1
        });
    }

    if (dadosCalculados.length === 0) return;

    // Identifica quem rolou
    const quem = window.nomeJogador || "Mestre"; // window.nomeJogador vem do script.js ou mestre.html

    // Envia para o Firebase
    // Usamos 'push' para criar uma nova entrada única na lista de rolagens
    if (window.push && window.ref && window.db) {
        const rolagensRef = window.ref(window.db, 'mesa_rpg/rolagens');
        window.push(rolagensRef, {
            quem: quem,
            dados: dadosCalculados,
            timestamp: Date.now()
        });
    } else {
        console.error("Erro: Firebase não disponível para enviar rolagem.");
        // Fallback local se estiver offline
        iniciarAnimacaoRolagem(quem, dadosCalculados);
    }
};

// --- 2. RECEBIMENTO: ESCUTA FIREBASE E ANIMA ---

window.escutarRolagens = function() {
    if (!window.ref || !window.db || !window.onChildAdded) {
        console.log("Aguardando conexão Firebase para dados...");
        setTimeout(window.escutarRolagens, 1000);
        return;
    }

    const rolagensRef = window.ref(window.db, 'mesa_rpg/rolagens');
    
    // Ouve novas rolagens adicionadas
    // limitToLast(1) evita carregar todo o histórico ao entrar,
    // mas precisamos filtrar por timestamp para não animar rolagens velhas
    window.onChildAdded(window.query(rolagensRef, window.limitToLast(1)), (snapshot) => {
        const rolagem = snapshot.val();
        if (!rolagem) return;

        // Só anima se a rolagem aconteceu nos últimos 10 segundos
        // Isso evita que, ao dar F5, a última rolagem apareça de novo
        const agora = Date.now();
        if (agora - rolagem.timestamp < 10000) {
            iniciarAnimacaoRolagem(rolagem.quem, rolagem.dados);
        }
    });
    
    console.log("🎲 Sistema de dados conectado ao Firebase.");
};

// --- ANIMAÇÃO VISUAL ---

function iniciarAnimacaoRolagem(nomeQuemRolou, dados) {
    const overlay = document.getElementById('overlay-rolagem');
    const container = document.getElementById('container-dados-rolando');
    const btnFechar = document.getElementById('btn-fechar-rolagem');
    const labelQuem = document.getElementById('quem-rolou-label');
    
    // Configura a tela
    labelQuem.innerText = `${nomeQuemRolou} está rolando...`;
    overlay.style.display = 'flex';
    btnFechar.style.display = 'none';
    container.innerHTML = '';

    // Cria elementos visuais
    const elementosAnimados = dados.map(dado => {
        const el = document.createElement('div');
        el.className = `dado-visual ${dado.classe}`;
        el.innerHTML = `<span class="label-dado">${dado.label}</span><span class="valor">?</span>`;
        container.appendChild(el);
        return { 
            el: el, 
            faces: dado.faces, 
            valorFinal: dado.valorFinal, // O valor já veio decidido do Firebase
            interval: null 
        };
    });

    // Animação de Shuffle (números aleatórios visuais)
    elementosAnimados.forEach(item => {
        const spanValor = item.el.querySelector('.valor');
        item.interval = setInterval(() => {
            spanValor.innerText = Math.floor(Math.random() * item.faces) + 1;
        }, 50); // Troca bem rápido
    });

    // Finaliza após 2.5 segundos
    setTimeout(() => {
        elementosAnimados.forEach(item => {
            clearInterval(item.interval);
            const spanValor = item.el.querySelector('.valor');
            spanValor.innerText = item.valorFinal;
            
            // Efeito visual de parada
            item.el.style.animation = 'resultadoFinal 0.3s ease-out forwards';
            
            // Destaque Crítico (Esperança/Medo com valor 12)
            if (item.faces === 12 && item.valorFinal === 12) {
                item.el.style.boxShadow = "0 0 50px #fff";
                item.el.style.borderColor = "#fff";
                item.el.style.zIndex = "100";
            }
        });
        
        btnFechar.style.display = 'block';
    }, 2500);
}

window.fecharResultadoRolagem = function() {
    document.getElementById('overlay-rolagem').style.display = 'none';
};