# 🚀 Configurar GitHub Pages

## Vantagens sobre Vercel:
- ✅ Integração nativa com GitHub
- ✅ Atualiza automaticamente a cada push
- ✅ Mais simples de configurar
- ✅ Sem necessidade de webhooks externos
- ✅ Totalmente gratuito

## Como Configurar:

### Opção 1: Via GitHub Settings (Mais Fácil)

1. **Acesse o repositório no GitHub:**
   - https://github.com/tiagobahiense/deck-daggerheart

2. **Vá em Settings:**
   - Clique em **Settings** (no topo do repositório)

3. **Vá em Pages:**
   - No menu lateral esquerdo, clique em **Pages**

4. **Configure a Source:**
   - **Source**: Selecione **"Deploy from a branch"**
   - **Branch**: Selecione **"main"**
   - **Folder**: Selecione **"/ (root)"**
   - Clique em **Save**

5. **Aguarde alguns minutos:**
   - GitHub vai fazer o build
   - Você receberá uma URL: `https://tiagobahiense.github.io/deck-daggerheart/`

### Opção 2: Via GitHub Actions (Automático)

Crie um arquivo `.github/workflows/deploy.yml` (já criado abaixo)

## Após Configurar:

- **URL do site**: `https://tiagobahiense.github.io/deck-daggerheart/`
- **Atualizações**: Automáticas a cada push na branch `main`
- **Tempo de deploy**: ~1-2 minutos após push

## Dica:

Se quiser usar um domínio customizado, adicione um arquivo `CNAME` na raiz do projeto.
