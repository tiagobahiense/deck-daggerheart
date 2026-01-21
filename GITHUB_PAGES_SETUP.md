# 🚀 Configurar GitHub Pages

## Vantagens sobre Vercel:
- ✅ Integração nativa com GitHub
- ✅ Atualiza automaticamente a cada push
- ✅ Mais simples de configurar
- ✅ Sem necessidade de webhooks externos
- ✅ Totalmente gratuito

## Como Configurar:

### ⚠️ IMPORTANTE: Configuração no GitHub Settings

1. **Acesse o repositório no GitHub:**
   - https://github.com/tiagobahiense/deck-daggerheart

2. **Vá em Settings:**
   - Clique em **Settings** (no topo do repositório)

3. **Vá em Pages:**
   - No menu lateral esquerdo, clique em **Pages**

4. **Configure a Source (CRUCIAL):**
   - **Source**: Selecione **"GitHub Actions"** (NÃO "Deploy from a branch")
   - Clique em **Save**

5. **Aguarde alguns minutos:**
   - GitHub Actions vai fazer o build automaticamente
   - Você receberá uma URL: `https://tiagobahiense.github.io/deck-daggerheart/`

### ⚠️ Se não aparecer a opção "GitHub Actions":
- Verifique se você tem permissões de admin no repositório
- Tente fazer um push novo após configurar

### Opção 2: Via GitHub Actions (Automático)

Crie um arquivo `.github/workflows/deploy.yml` (já criado abaixo)

## Após Configurar:

- **URL do site**: `https://tiagobahiense.github.io/deck-daggerheart/`
- **Atualizações**: Automáticas a cada push na branch `main`
- **Tempo de deploy**: ~1-2 minutos após push

## Dica:

Se quiser usar um domínio customizado, adicione um arquivo `CNAME` na raiz do projeto.
