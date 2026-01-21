# 🔧 Troubleshooting Vercel - Não Atualiza após Commit

## ✅ Checklist Rápido:

### 1. Verificar no Dashboard do Vercel:
- Acesse: https://vercel.com/dashboard
- Vá em seu projeto: `deck-daggerheart`
- Aba **"Deployments"**
- Veja se há novos deployments ou erros

### 2. Verificar Configuração Git:
- Vercel Dashboard → **Settings** → **Git**
- Confirme que está conectado a: `tiagobahiense/deck-daggerheart`
- Verifique a **branch**: deve ser `main` (não `master`)
- Veja se há **webhook ativo**

### 3. Verificar Webhook do GitHub:
- GitHub → Repositório → **Settings** → **Webhooks**
- Procure por webhook do Vercel
- Se não existir ou estiver com erro, reconecte no Vercel

### 4. Forçar Novo Deploy:
**Opção A - Via Dashboard:**
1. Vercel Dashboard → Deployments
2. Clique nos "..." do último deployment
3. Selecione **"Redeploy"**

**Opção B - Via Terminal:**
```bash
# Criar commit vazio para forçar
git commit --allow-empty -m "Trigger Vercel deploy"
git push
```

**Opção C - Via Vercel CLI:**
```bash
npm i -g vercel
vercel --prod
```

### 5. Verificar Logs de Build:
- Vercel Dashboard → Deployments → Clique no deployment
- Veja a aba **"Build Logs"**
- Procure por erros (vermelho)

### 6. Limpar Cache:
- Vercel Dashboard → **Settings** → **General**
- Role até **"Clear Build Cache"**
- Clique em **"Clear"**

### 7. Reconectar Repositório:
Se nada funcionar:
1. Vercel Dashboard → **Settings** → **Git**
2. Clique em **"Disconnect"**
3. Depois **"Connect Git Repository"**
4. Selecione `tiagobahiense/deck-daggerheart`
5. Configure branch `main`

### 8. Verificar Branch no GitHub:
```bash
git branch -a
```
Confirme que está fazendo push para `main` (não `master`)

## 🚨 Problemas Comuns:

### Problema: "No deployments found"
- **Solução**: Reconecte o repositório no Vercel

### Problema: "Build failed"
- **Solução**: Veja os logs e corrija o erro

### Problema: "Webhook not working"
- **Solução**: Reconecte o repositório ou crie webhook manual no GitHub

### Problema: "Deploying old version"
- **Solução**: Limpe o cache e faça redeploy

## 📝 Comandos Úteis:

```bash
# Ver último commit
git log -1

# Ver branch atual
git branch

# Verificar se está tudo commitado
git status

# Forçar push (se necessário)
git push --force-with-lease
```
