# 🔗 Configurar Webhook do Vercel no GitHub (Manual)

## Passo a Passo:

### 1. No Vercel Dashboard:
1. Vá em: **Settings** → **Git**
2. Anote a **URL do Webhook** (algo como: `https://api.vercel.com/v1/integrations/github/...`)

### 2. No GitHub:
1. Acesse: https://github.com/tiagobahiense/deck-daggerheart
2. Vá em: **Settings** → **Webhooks**
3. Clique em **"Add webhook"**
4. Cole a URL do webhook do Vercel
5. **Content type**: `application/json`
6. **Events**: Selecione **"Just the push event"**
7. Clique em **"Add webhook"**

### 3. Testar:
1. Faça um commit vazio:
   ```bash
   git commit --allow-empty -m "Test webhook"
   git push
   ```
2. Volte no GitHub → **Settings** → **Webhooks**
3. Clique no webhook do Vercel
4. Veja se aparece um novo delivery (deve ser verde ✅)

## Se ainda não funcionar:

### Solução Alternativa - Vercel CLI:

1. Instale o Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Faça login:
   ```bash
   vercel login
   ```

3. Conecte ao projeto:
   ```bash
   vercel link
   ```

4. Faça deploy manual:
   ```bash
   vercel --prod
   ```

Isso vai fazer deploy direto, sem depender do webhook.
