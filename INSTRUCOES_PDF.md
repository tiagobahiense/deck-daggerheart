# Instruções: Converter PDF de Classes em Imagens

## 📋 Resumo
O sistema foi configurado para exibir as páginas do PDF das classes em um carrossel interativo. Você precisa converter o `Classes.pdf` em imagens (uma por classe).

## 📁 Estrutura de Pastas Esperada

```
img/cartas/Classes/
├── guardiao1.jpg          (Página do Guardião)
├── bardo1.jpg             (Página do Bardo)
├── mago1.jpg              (Página do Mago)
├── feiticeiro1.jpg        (Página do Feiticeiro)
├── guerreiro1.jpg         (Página do Guerreiro)
├── ladino1.jpg            (Página do Ladino)
├── serafim1.jpg           (Página do Serafim)
├── druida1.jpg            (Página do Druida)
└── patrulheiro1.jpg       (Página do Patrulheiro)
```

## 🔄 Como Converter o PDF

### Opção 1: Usando Python (Recomendado)
Se tem Python instalado, você pode usar a biblioteca `pdf2image`:

```bash
pip install pdf2image pillow
```

Depois crie um arquivo `converter_pdf.py` na raiz do projeto:

```python
from pdf2image import convert_from_path
import os

# Configuração
pdf_path = 'Classes.pdf'
output_folder = 'img/cartas/Classes'

# Profissões na ordem do PDF
profissoes = [
    'guardiao', 'bardo', 'mago', 'feiticeiro', 
    'guerreiro', 'ladino', 'serafim', 'druida', 'patrulheiro'
]

# Converter PDF em imagens
images = convert_from_path(pdf_path)

# Salvar uma imagem por profissão
for idx, (profissao, image) in enumerate(zip(profissoes, images)):
    output_path = os.path.join(output_folder, f'{profissao}1.jpg')
    image.save(output_path, 'JPEG', quality=95)
    print(f'✅ Salvo: {output_path}')

print(f'\n✨ Conversão completa! {len(profissoes)} imagens criadas.')
```

Execute:
```bash
python converter_pdf.py
```

### Opção 2: Usando Ferramentas Online
1. Acesse: https://ilovepdf.com/pt/pdf-para-jpg
2. Faça upload do `Classes.pdf`
3. Selecione "Converter para JPG"
4. Download das imagens
5. Renomeie cada imagem conforme a profissão

### Opção 3: Usando ImageMagick (Windows)
```bash
magick convert -density 150 Classes.pdf output_%d.jpg
```

Depois renomeie as imagens conforme a ordem.

## ✅ Verificação

Após converter, verifique se:
- [ ] Todas as 9 imagens estão em `img/cartas/Classes/`
- [ ] Nomes exatamente: `guardiao1.jpg`, `bardo1.jpg`, etc
- [ ] Qualidade das imagens é boa (mínimo 800x600px)

## 🎯 Como o Sistema Funciona

1. **Seleção de Classe** (Após Login)
   - Carrossel exibe as 9 páginas do PDF
   - Cada página tem um botão "Ser [Classe]" com a cor da profissão
   - Ao clicar, salva a profissão selecionada

2. **Board Principal**
   - Aura da cor da profissão aparece nas bordas da tela
   - Partículas flutuam continuamente
   - Ao abrir Grimório de Classes, mostra APENAS as cartas da profissão selecionada

3. **Cartas Filtradas**
   - Fundamental (1 carta)
   - Especialização (pode ter 1-2 variações)
   - Maestria (pode ter 1-2 variações)
   - Total: ~3-6 cartas por profissão

## 🔧 Personalizações Possíveis

### Adicionar Múltiplas Páginas por Classe
Se quiser mostrar 2-3 páginas por classe, renomeie:
- `guardiao1.jpg`, `guardiao2.jpg`, `guardiao3.jpg`

E modifique `selecao-classe.js` linha ~47:
```javascript
img.src = `img/cartas/Classes/${profissaoParaNomePDF[profissao]}1.jpg`;
// Para múltiplas páginas:
img.src = `img/cartas/Classes/${profissaoParaNomePDF[profissao]}${pageIndex}.jpg`;
```

### Customizar Cores das Profissões
No arquivo `selecao-classe.js`, customize a object `profissaoPrincipal`:

```javascript
const profissaoPrincipal = {
    'Guardião': { cor: 'rgb(0, 200, 255)', rgb: [0, 200, 255] }, // AQUI
    'Bardo': { cor: 'rgb(200, 0, 255)', rgb: [200, 0, 255] },
    // ... etc
};
```

## 🐛 Troubleshooting

**"Imagens não aparecem no carrossel"**
- Verifique se as imagens estão em `img/cartas/Classes/`
- Verifique os nomes exatos (case-sensitive): `guardiao1.jpg` não `Guardiao1.jpg`
- Abra o DevTools (F12) e veja os erros no Console

**"Profissão não filtra as cartas"**
- Certifique-se de que o `lista_cartas_v2.json` tem o campo "profissao" nas cartas Classes
- Limpe o cache do navegador (Ctrl+Shift+Delete)

**"Aura/Partículas não aparecem"**
- Verifique se `profissao.css` e `profissao.js` estão sendo carregados (F12 → Network)
- Verifique console para erros

## 📝 Próximos Passos

Após converter o PDF e testar:
1. Faça login e veja o carrossel de classes
2. Clique em cada classe e verifique se as cores estão corretas
3. Abra o Grimório de Classes e veja apenas as cartas da profissão
4. Verifique se a aura aparece nas bordas
5. (V5) Começar com a mesa de jogo (grid de batalha)

---

**Dúvidas?** Verifique os console logs (F12 → Console) para mensagens de debug.
