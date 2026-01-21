# 📋 DETALHES DAS MODIFICAÇÕES

## 📄 index.html

### 1. Link CSS (Linha ~10)
```html
<!-- ANTES -->
<link rel="stylesheet" href="profissao.css?v=1.0">

<!-- DEPOIS -->
<link rel="stylesheet" href="profissao.css?v=1.0">
<link rel="stylesheet" href="selecao-classe.css?v=1.0">  ← NOVO
```

### 2. Modal de Seleção (Após login-screen, antes de app-container)
```html
<!-- NOVO BLOCO ADICIONADO -->
<div id="classe-selection-modal">
    <div class="classe-carousel-container">
        <div class="carousel-slides"></div>
        <button class="carousel-nav carousel-nav-prev" onclick="window.slideAnterior()">❮</button>
        <button class="carousel-nav carousel-nav-next" onclick="window.proximoSlide()">❯</button>
        <div class="carousel-indicators"></div>
    </div>
</div>
```

### 3. Script (Antes de </body>)
```html
<!-- ANTES -->
<script type="module" src="script.js?v=10.0"></script>
<script src="profissao.js?v=1.0"></script>

<!-- DEPOIS -->
<script type="module" src="script.js?v=10.0"></script>
<script src="profissao.js?v=1.0"></script>
<script src="selecao-classe.js?v=1.0"></script>  ← NOVO
```

---

## 🔧 script.js

### 1. Função: iniciarExperiencia()
**Linha**: ~468

```javascript
// ANTES
document.getElementById('login-screen').style.display = 'none';
document.getElementById('app-container').style.display = 'flex';

// DEPOIS
document.getElementById('login-screen').style.display = 'none';
document.getElementById('app-container').style.display = 'flex';

// Mostrar modal de seleção de classe
setTimeout(() => {
    if (typeof window.inicializarSelecaoClasse === 'function') {
        window.inicializarSelecaoClasse();
    }
}, 300);
```

**O que faz**: Após inserir nome do personagem, exibe o modal de seleção de classe com carrossel.

### 2. Função: abrirGrimorio()
**Linha**: ~287

```javascript
// ANTES
if (tipo === 'Geral') {
    titulo.innerText = "Grimório Principal";
    lista = catalogoCartas.filter(c => !['Classes','Ancestralidade','Comunidade'].includes(c.categoria));
} else {
    titulo.innerText = `Selecionar: ${tipo}`;
    lista = catalogoCartas.filter(c => c.categoria === tipo);
}

// DEPOIS
if (tipo === 'Geral') {
    titulo.innerText = "Grimório Principal";
    lista = catalogoCartas.filter(c => !['Classes','Ancestralidade','Comunidade'].includes(c.categoria));
} else if (tipo === 'Classes') {
    // NOVO: Filtrar por profissão selecionada
    const profissaoSelecionada = window.obterProfissaoSelecionada?.();
    if (profissaoSelecionada) {
        titulo.innerText = `Cartas de ${profissaoSelecionada}`;
        lista = catalogoCartas.filter(c => c.categoria === 'Classes' && c.profissao === profissaoSelecionada);
    } else {
        titulo.innerText = "Selecionar: Classes";
        lista = catalogoCartas.filter(c => c.categoria === 'Classes');
    }
} else {
    titulo.innerText = `Selecionar: ${tipo}`;
    lista = catalogoCartas.filter(c => c.categoria === tipo);
}
```

**O que faz**: Quando abre Grimório de Classes, filtra APENAS as cartas da profissão selecionada.

### 3. Função: forcarLogout()
**Linha**: ~191

```javascript
// ANTES
window.forcarLogout = function() {
    signOut(auth).then(() => {
        currentUser = null;
        nomeJogador = "";
        maoDoJogador = [];
        reservaDoJogador = [];
        document.getElementById('login-screen').style.display = 'block';
        document.getElementById('app-container').style.display = 'none';
        window.voltarParaSelecao();
    }).catch((error) => console.error("Erro ao fazer logout:", error));
};

// DEPOIS
window.forcarLogout = function() {
    signOut(auth).then(() => {
        currentUser = null;
        nomeJogador = "";
        maoDoJogador = [];
        reservaDoJogador = [];
        // Resetar profissão selecionada
        if (typeof window.resetarSelecaoClasse === 'function') {
            window.resetarSelecaoClasse();
        }
        // Desativar aura de profissão
        if (typeof window.desativarProfissao === 'function') {
            window.desativarProfissao();
        }
        document.getElementById('login-screen').style.display = 'block';
        document.getElementById('app-container').style.display = 'none';
        window.voltarParaSelecao();
    }).catch((error) => console.error("Erro ao fazer logout:", error));
};
```

**O que faz**: Ao fazer logout, reseta a profissão selecionada e desativa aura/partículas.

---

## 💅 profissao.js

### 1. Expor window.ativarProfissao()
**Linha**: ~87

```javascript
// ANTES
function ativarProfissao(profissao) { ... }

// DEPOIS
function ativarProfissao(profissao) { ... }

// Expor como function global
window.ativarProfissao = ativarProfissao;
```

**O que faz**: Permite chamar a função de fora do arquivo.

### 2. Expor window.desativarProfissao()
**Linha**: ~160

```javascript
// ANTES
function desativarProfissao() { ... }

// DEPOIS
function desativarProfissao() { ... }

// Expor como function global
window.desativarProfissao = desativarProfissao;
```

**O que faz**: Permite chamar a função de fora do arquivo.

---

## ✨ ARQUIVOS NOVOS

### selecao-classe.css (165 linhas)
- Estilos do modal `.classe-selection-modal`
- Estilos do carrossel `.carousel-slides`
- Estilos dos botões `.btn-classe-select`
- Estilos das setas `.carousel-nav`
- Estilos dos indicadores `.carousel-indicators`
- Media queries para responsividade

### selecao-classe.js (180 linhas)
- `const profissaoPrincipal` - Mapeamento de cores
- `const profissaoParaNomePDF` - Nomes dos arquivos PDF
- `let classeSelectionState` - Estado do carrossel
- `window.inicializarSelecaoClasse()` - Criar modal
- `window.proximoSlide()` - Próximo slide
- `window.slideAnterior()` - Slide anterior
- `window.irParaSlide(index)` - Ir para slide
- `window.selecionarClasse(profissao)` - Confirmar seleção
- `window.fecharSelecaoClasse()` - Fechar modal
- `window.obterProfissaoSelecionada()` - Obter profissão
- `window.obterCorProfissao()` - Obter cor
- `window.resetarSelecaoClasse()` - Reset
- Event listeners de teclado

---

## 📊 RESUMO DE MUDANÇAS

| Arquivo | Tipo | Linhas | O Que Mudou |
|---------|------|--------|-----------|
| index.html | Modificado | +20 | Link CSS + Modal + Script |
| script.js | Modificado | +25 | 3 funções atualizadas |
| profissao.js | Modificado | +2 | 2 linhas para expor funções |
| selecao-classe.css | Novo | 165 | Estilos do carrossel |
| selecao-classe.js | Novo | 180 | Lógica de seleção |
| **TOTAL** | - | **~440** | **Código novo/modificado** |

---

## 🔗 DEPENDÊNCIAS ENTRE ARQUIVOS

```
selecao-classe.js
├─ Depende: lista_cartas_v2.json (opcional - para nome da profissão)
└─ Chama: window.ativarProfissao() (de profissao.js)
         window.renderizar() (de script.js)

script.js
├─ Chama: window.inicializarSelecaoClasse() (de selecao-classe.js)
├─ Chama: window.obterProfissaoSelecionada() (de selecao-classe.js)
├─ Chama: window.resetarSelecaoClasse() (de selecao-classe.js)
├─ Chama: window.desativarProfissao() (de profissao.js)
└─ Depende: lista_cartas_v2.json (carrega cartas)

profissao.js
└─ Chama: window.monitorarClasseFundamental() (no renderizar)

index.html
├─ Carrega: style.css
├─ Carrega: profissao.css
├─ Carrega: selecao-classe.css (novo)
├─ Carrega: script.js
├─ Carrega: profissao.js
└─ Carrega: selecao-classe.js (novo)
```

---

## 🎯 FLUXO DE EXECUÇÃO

```
1. Page Load
   └─ Carrega CSS + JS

2. User Login
   └─ script.js: fazerLoginJogador()

3. Insira Nome Personagem
   └─ Clique em "Jogar"

4. iniciarExperiencia()
   ├─ Verifica limite 3 chars
   ├─ Cria character no Firebase
   ├─ Mostra app-container
   └─ Chama: window.inicializarSelecaoClasse()

5. inicializarSelecaoClasse()
   ├─ Cria 9 slides
   ├─ Cada slide tem imagem + botão
   └─ Modal.classList.add('ativo')

6. User Navega
   ├─ Clica setas (❮ ❯)
   ├─ Clica dots
   ├─ Pressiona (← →)
   └─ proximoSlide() ou slideAnterior()

7. User Seleciona
   ├─ Clica "Ser [Classe]"
   └─ selecionarClasse(profissao)

8. selecionarClasse(profissao)
   ├─ localStorage.setItem('profissaoSelecionada')
   ├─ window.ativarProfissao(profissao)
   ├─ window.renderizar()
   └─ Modal fecha

9. Board Renderizado
   ├─ Aura colorida aparece
   ├─ Partículas flutuam
   └─ Jogador pode jogar

10. Abrir Grimório de Classes
    ├─ window.obterProfissaoSelecionada()
    ├─ Filtra cartas por profissão
    └─ Mostra ~3-6 cartas

11. Logout
    ├─ window.resetarSelecaoClasse()
    ├─ window.desativarProfissao()
    ├─ localStorage apagado
    └─ Volta ao login
```

---

## 📈 ESTRUTURA DO ESTADO

```javascript
// Em localStorage
{
    "profissaoSelecionada": "Bardo"
}

// Em memoria (selecao-classe.js)
classeSelectionState = {
    profissaoAtualSelecionada: "Bardo",
    indiceSlideAtual: 1,
    totalSlides: 9,
    paginasCarregadas: {}
}

// Em memoria (script.js)
window.slotsFixos = {
    'Fundamental': { 
        nome: "Fundamental - Beletrista",
        profissao: "Bardo",
        caminho: "img/cartas/Classes/...",
        estado: "ativo"
    },
    'Especializacao': null,
    'Maestria': null,
    ...
}
```

---

## 🧪 COMO TESTAR CADA MUDANÇA

### Teste 1: Modal Aparece
```
1. Login
2. Insira nome
3. Clique "Jogar"
4. Verifique: Modal com carrossel aparecer
```

### Teste 2: Navegação
```
1. Modal aberto
2. Clique seta direita (❯)
3. Verifique: Slide muda, dot atualiza
4. Pressione tecla seta esquerda (←)
5. Verifique: Slide volta, dot atualiza
```

### Teste 3: Seleção
```
1. Clique em "Ser [Classe]"
2. Verifique: Modal fecha, aura aparece
3. F12 → Console
4. Digite: localStorage.getItem('profissaoSelecionada')
5. Verifique: Mostra o nome da classe
```

### Teste 4: Filtro de Cartas
```
1. Clique em slot de Classes
2. Verifique: Grid mostra APENAS cartas da profissão
3. Se Bardo: só vê Bardo, não Guerreiro, etc
```

### Teste 5: Logout
```
1. Clique logout
2. Verifique: localStorage['profissaoSelecionada'] apagado
3. Verifique: Aura/Partículas desaparecem
```

---

**FIM DA DOCUMENTAÇÃO**
