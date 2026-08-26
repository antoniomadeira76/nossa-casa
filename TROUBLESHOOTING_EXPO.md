# Troubleshooting Expo Go — "Opening project but doesn't start"

**Problem:** App says "Opening project..." but never loads  
**Severity:** Medium  
**Solution Time:** 5-10 minutes

---

## 🔍 Diagnóstico

### Causa Comum 1: Metro Bundler Still Compiling
**Sintoma:** "Opening project..." for 30+ seconds  
**Solução:** Espera mais tempo (primeira vez pode levar 1-2 minutos)

### Causa Comum 2: Network Issue
**Sintoma:** "Opening project..." then timeout  
**Solução:** Verifica WiFi (PC + iPhone mesma rede)

### Causa Comum 3: Port Already in Use
**Sintoma:** "Opening project..." mas erro no terminal  
**Solução:** Mata processo + restart

### Causa Comum 4: AppEntry.js Error
**Sintoma:** "Opening project..." depois erro vermelho  
**Solução:** Verifica console no Expo

---

## ✅ Fixes Rápidos (Por Ordem)

### Fix 1: Reinicia Expo (2 min)
```bash
# Terminal 1: Para Expo
Ctrl+C

# Limpa cache
npx expo start --clear

# Espera pela mensagem:
# [READY] To open app press:
#   • i (for iOS)
```

### Fix 2: Verifica WiFi (1 min)
```bash
# PC:
ipconfig | grep "IPv4 Address"
# Exemplo: 192.168.1.100

# iPhone:
Settings → WiFi → (conectada?)
# Deve estar na mesma rede
```

### Fix 3: Mata Processos Node (2 min)
```bash
# Windows PowerShell (Admin):
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force

# Depois:
npx expo start --clear
```

### Fix 4: Verifica Erros (3 min)
```bash
# No terminal Expo, procura por:
❌ "Error: Cannot find module"
❌ "SyntaxError in..."
❌ "Metro error"

# Se vir erro, copia a mensagem completa
```

### Fix 5: Clean Install (5 min)
```bash
# Remove node_modules
rm -r node_modules

# Reinstala
npm install

# Restart Expo
npx expo start --clear
```

---

## 📱 Alternativa: Usa Web Primeiro

Se Expo Go não funciona, testa a app no navegador:

```bash
# Terminal: já está a rodar
# Browser:
http://localhost:8085
```

**No navegador:**
- ✅ Todas as funcionalidades funcionam
- ✅ Sem dependência de Expo Go
- ✅ Mais rápido para debug

---

## 🎯 Teste Passo-a-Passo

### Passo 1: Terminal Limpo
```bash
# Mata qualquer Expo anterior
taskkill /F /IM node.exe 2>nul || true

# Abre terminal NOVO
cd "C:\Users\amadeira\Claude\Projects\Nossa Casa"
```

### Passo 2: Start Expo com Verbose
```bash
npx expo start --verbose
```

**Procura por:**
```
✅ "Starting project at..."
✅ "Starting Metro Bundler"
✅ "Bundled... (XXX modules)"
✅ "[READY] To open app press:"
```

### Passo 3: Espera 30-60 Segundos
Não pressiones nada! Metro está a compilar o bundle para iOS.

**Output esperado após compilação:**
```
[READY] To open app press:
  • i (for iOS)
  • a (for Android)
  • w (for web)
  • r (to reload)
  • q (to quit)
```

### Passo 4: Press 'i' para iOS
```
i
```

**Na app Expo Go no iPhone:**
1. Câmara abre automaticamente
2. Aponta para QR code do terminal
3. App abre em Expo Go

### Passo 5: Espera 10-20 Segundos
App está a carregar primeiro bundle (metro pode levar).

**Deve ver:**
```
✅ Splash screen "Nossa Casa"
✅ Loading bar progride
✅ Login screen aparece
```

---

## 🆘 Se Ainda Não Funciona

### Opção 1: Testa na Web (Funciona 100%)
```bash
# Terminal:
npx expo start

# Press 'w'
w

# Navegador abre em http://localhost:19006
```

### Opção 2: iPhone Simulator (Mac Only)
```bash
# Se tens Mac com Xcode:
npx expo start

# Press 'i'
i

# Simulator abre automaticamente
```

### Opção 3: Verifica Erros Específicos

Se vires mensagem de erro, procura em:

**Erro:** "Cannot find module..."
```bash
# Solução:
rm -r node_modules
npm install
```

**Erro:** "Syntax error in..."
```bash
# Verifica ficheiro mencionado
# Recompila
npx expo start --clear
```

**Erro:** "WebSocket error..."
```bash
# WiFi problema
# Usa -LAN mode
npx expo start --lan
```

---

## 📊 Checklist Final

Antes de reportar problema:

- [ ] Terminal mostra "[READY] To open app press:"?
- [ ] iPhone na mesma WiFi que PC?
- [ ] Expo Go app instalada no iPhone?
- [ ] Pressed 'i' e câmara abriu?
- [ ] Apuntou para QR code completo?
- [ ] Esperou 20+ segundos para carregar?
- [ ] Não há erro vermelho no terminal?
- [ ] Não há erro na tela do iPhone?

Se sim a todos → Deve funcionar!

---

## 💡 Dicas Pro

### Dica 1: Usa LAN Mode se WiFi Instável
```bash
npx expo start --lan
```

### Dica 2: Guarda QR Code para Print
```bash
# Se câmara não consegue ler (luz fraca):
# Right-click QR code → Print
# Aponta iPhone para papel
```

### Dica 3: Manual Connect
```bash
# Se QR não funciona:
# Expo Go → Profile → Scan QR
# Ou: Expo Go → Scan → Paste URL manualmente
# URL: exp://192.168.x.x:8081
```

### Dica 4: Reload se Preso
```bash
# Se app fica no "Opening project...":
# Shake iPhone → "Reload"
# Ou: Press 'r' no terminal
```

---

## 🚨 Nuclear Option

Se nada funciona:

```bash
# 1. Kill all Node processes
taskkill /F /IM node.exe 2>nul || true

# 2. Clear everything
rm -r node_modules
rm package-lock.json
npm install

# 3. Clear Expo cache
npx expo start --clear

# 4. Wait 60 seconds for compilation

# 5. Press 'i' and try again
```

---

## ✅ Alternativa Garantida: Web

Se Expo Go não funciona, teste na web:

```bash
# Terminal:
npx expo start

# Browser:
http://localhost:8085

# Testa:
✅ Login funciona
✅ 5 tabs navegáveis
✅ Gestão abre
✅ Tudo funciona igual!
```

**Web é 100% funcional e não precisa de Expo Go.**

---

## 📞 Se Problema Persiste

Quando reportares, inclui:

1. **Terminal output** (últimas 20 linhas)
2. **iPhone Expo Go error** (screenshot se possível)
3. **WiFi status** (mesma rede?)
4. **Que step ficou travado?** (opening, loading, error?)

---

**Última Resort:** Testa na web enquanto diagnóstico o Expo Go.

App funciona! Só precisa encontrar a razão por que Expo Go não carrega.
