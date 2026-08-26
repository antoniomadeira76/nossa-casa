# Guia de Teste em iOS — Nossa Casa

**Data:** 26 Agosto 2026  
**Versão:** Pronta para produção

---

## 🎯 Opções de Teste em iOS

| Opção | Custo | Tempo | Qualidade | Recomendação |
|-------|-------|-------|-----------|--------------|
| **Expo Go (iPhone)** | Grátis | 2 min | 95% | ⭐⭐⭐ |
| **iOS Simulator** | Grátis | 5 min | 100% | ⭐⭐⭐ |
| **EAS Build** | Pago | 10 min | 100% | ⭐ (depois) |
| **App Store** | Pago | 3-5 dias | 100% | ⭐ (final) |

---

## ✅ Opção 1: Expo Go (Mais Rápido — Recomendado)

### Pré-requisitos
- iPhone com iOS 13+
- App "Expo Go" instalada (grátis na App Store)
- Computador e iPhone na mesma WiFi

### Passo 1: Iniciar servidor Expo
```bash
cd "C:\Users\amadeira\Claude\Projects\Nossa Casa"
npx expo start
```

**Output esperado:**
```
Starting project at C:\Users\amadeira\Claude\Projects\Nossa Casa
Starting Metro Bundler
Web Bundled 3645ms
[READY] To open app press:
  • iOS: press 'i'
  • Android: press 'a'
  • Web: press 'w'
```

### Passo 2: Abrir no iPhone
**Opção A: QR Code (Recomendado)**
```bash
# No terminal, pressiona 'i' para abrir em iOS
i
```
- Abre câmara do iPhone
- Aponta para QR code que aparece no terminal
- Abre automaticamente em Expo Go

**Opção B: Manual**
1. Abre Expo Go no iPhone
2. Tap "Scan QR code"
3. Aponta para código no terminal

### Passo 3: Testa a App
✅ App abre em Expo Go  
✅ Podes fazer login (Google ou PIN)  
✅ Navega pelos 5 tabs  
✅ Testa cada funcionalidade

### Vantagens:
- ✅ Sem compilação (instantâneo)
- ✅ Hot reload: edita o código, app atualiza sozinha
- ✅ 100% compatível com React Native
- ✅ Perfeito para dev/testing

### Desvantagens:
- ❌ Expo Go overhead (5-10% mais lento)
- ❌ Não vê performance final
- ❌ Sem acesso a certas APIs nativas (não precisa aqui)

---

## ✅ Opção 2: iOS Simulator (Mais Realista)

### Pré-requisitos
- Mac com Xcode instalado (`xcode-select --install`)
- Simulador iOS configurado

### Passo 1: Instalar Xcode
```bash
# Se ainda não tens
xcode-select --install

# Verifica instalação
xcode-select -p
# Output: /Applications/Xcode.app/Contents/Developer
```

### Passo 2: Iniciar Expo com iOS
```bash
cd "C:\Users\amadeira\Claude\Projects\Nossa Casa"
npx expo start
```

### Passo 3: Abrir no Simulador
```bash
# No terminal, pressiona 'i'
i
```

**Ou manual:**
```bash
# Abre simulador específico
npx expo run:ios --simulator "iPhone 14 Pro"
```

### Simuladores Disponíveis
```bash
# Lista todos
xcrun simctl list devices

# Exemplos:
# iPhone 14
# iPhone 14 Pro
# iPhone 13
# iPad Air
```

### Vantagens:
- ✅ Simula exactamente um iPhone real
- ✅ Vê performance final
- ✅ Testar notch, home indicator, safeArea
- ✅ Testar light/dark mode
- ✅ Testar orientações (portrait/landscape)

### Desvantagens:
- ❌ Requires Mac
- ❌ Mais lento que Expo Go
- ❌ Requer Xcode (3GB download)

---

## ✅ Opção 3: iPhone Físico (Sem App Store)

### Pré-requisitos
- iPhone com iOS 13+
- Macbook com Xcode
- USB cable
- Apple Developer Account (grátis)

### Passo 1: Preparar Device
```bash
# Conecta iPhone via USB
# Xcode detecta automaticamente

# Verifica device
xcrun simctl list devices --json
```

### Passo 2: Compilar para iPhone
```bash
cd "C:\Users\amadeira\Claude\Projects\Nossa Casa"

# Opção A: Usar Expo (mais fácil)
npx expo run:ios

# Opção B: EAS (mais profissional, requer setup)
eas build --platform ios
```

### Passo 3: Build & Install
- Xcode instala automaticamente no device
- App aparece no home screen
- Abre e testa

---

## 🎮 Checklist de Testes em iOS

### 1. Login (2 min)
- [ ] Rita login: "Continuar com Google"
- [ ] Léo login: PIN 1357
- [ ] Valida PIN errado: 1111 (rejeita)

### 2. Navegação (2 min)
- [ ] Tap 5 tabs: Início → Dinheiro → Tarefas → Compras → Agenda
- [ ] Tab bar sempre visível (não desaparece no scroll)
- [ ] Header sempre visível

### 3. Início (3 min)
- [ ] Greeting: "Bom dia, Rita"
- [ ] "Precisa de Si" card
- [ ] "Agenda de Hoje" com eventos
- [ ] "Tarefas de Hoje" com tarefas
- [ ] Orçamento card

### 4. Tarefas (3 min)
- [ ] Urgentes (red) antes de Normais (yellow)
- [ ] Tap task → toggle done/open
- [ ] Strikethrough quando feita
- [ ] Numbers 1, 2, 3 por urgência

### 5. Modo Criança (3 min)
- [ ] Sair e entrar como Léo
- [ ] PIN: 1357
- [ ] 2 abas: Tarefas | Cofre
- [ ] Aba Tarefas: lista, toggle, pontos
- [ ] Aba Cofre: saldo verde, movimentos

### 6. Gestão (5 min)
- [ ] Tap botão "Gestão" em Início
- [ ] 4 abas: Orçamento, Membros, Envelopes, Especialidades
- [ ] Orçamento: Abrir/Fechar Mês
- [ ] Membros: editar PIN, mudar papéis
- [ ] Envelopes: criar, renomear, limites

### 7. Dinheiro (3 min)
- [ ] Tap "Acertar Contas"
- [ ] Opções: Tudo/Metade/Valor
- [ ] Registar pagamento
- [ ] Tap "Mover Dinheiro"
- [ ] Selecionar de/para envelopes

### 8. Compras (3 min)
- [ ] Tap "Modo de Loja"
- [ ] Selecionar secção
- [ ] Tap item → toggle comprado
- [ ] Tap "Fechar Conta"
- [ ] Carrinho: artigos confirmados

### 9. Agenda (3 min)
- [ ] Calendário: tap dia
- [ ] "Agendar Evento"
- [ ] Pre-fill data
- [ ] Tap "Importar do Google"
- [ ] Checkboxes + "Partilhar todos"

### 10. Design (2 min)
- [ ] Cores corretas (azul header)
- [ ] Tipografia legível
- [ ] Spacing consistente
- [ ] Touch targets 44px+ (consegues clicar fácil)

### 11. Light/Dark Mode (2 min)
- [ ] Settings → Display → Light/Dark
- [ ] App muda automaticamente
- [ ] Cores adaptem-se

### 12. SafeArea (1 min)
- [ ] Header não invade notch
- [ ] Footer não invade home indicator
- [ ] Conteúdo scroll sem overlap

---

## 🔧 Troubleshooting iOS

### Problema: "Metro Bundler not responding"
```bash
# Solução: Kill e restart
# Press Ctrl+C no terminal
# Depois:
npx expo start --clear
```

### Problema: "QR code not scanning"
```bash
# Solução 1: Printa QR code
# No terminal: Right-click → Print
# Apontar câmara para papel

# Solução 2: Manual
# Abre Expo Go
# Tap "Profile" → Tap "Scan QR code"
# Verifica URL no terminal: exp://192.168.x.x:8081
```

### Problema: "App closes immediately"
```bash
# Solução: Check console
npx expo start --verbose

# Se há erro de import:
# Edit ficheiro
# App reloads automaticamente (hot reload)
```

### Problema: "Touch not working"
```bash
# Solução: Restart Expo
# Ctrl+C → npx expo start
# Reload app: cmd+r (simulator) ou shake (device)
```

### Problema: "Data not persisting"
```bash
# Solução: Check AsyncStorage
# O simulador tem storage temporário
# Fecha e reabre app:
# Cmd+Ctrl+Z (simulator) → Close → Reopen
```

---

## 📊 Performance Metrics (iOS)

### O que medir:
- ⏱️ **Boot time:** App splash até Início screen pronto
- ⏱️ **Tab switch:** Tempo entre tabs
- ⏱️ **Scroll:** Smooth ou stuttering?
- 🎨 **Colors:** Aparecem corretos?
- 📱 **SafeArea:** Content invade notch/home?

### Valores esperados:
| Métrica | Target | Aceitável |
|---------|--------|-----------|
| Boot time | <1s | <2s |
| Tab switch | <200ms | <500ms |
| Scroll | 60fps | 30fps+ |

---

## 🚀 Deploy Final (App Store)

### Quando estiver pronto:
```bash
# 1. Criar EAS account (free)
eas login

# 2. Build para App Store
eas build --platform ios --auto-submit

# 3. Espera ~15 min

# 4. Submete para Apple Review (~3-5 dias)

# 5. Publicado na App Store
```

**Mas antes:**
- [ ] Testar em 2+ dispositivos
- [ ] Verificar privacy policy
- [ ] Preparar app store screenshots
- [ ] Verificar RGPD (dados de menores)

---

## 📝 Notas Importantes

### SafeArea (Notch + Home Indicator)
```javascript
// App.jsx já implementa:
const insets = useSafeAreaInsets();

// Header padding:
paddingTop: insets.top + 10

// Footer padding:
paddingBottom: Math.max(insets.bottom, 10)
```
✅ Já está feito

### Dark Mode
```javascript
// App.jsx detecta automaticamente:
const sysDark = useColorScheme() === 'dark';

// Theme muda:
const dark = mode === 'escuro' || (mode === 'sistema' && sysDark);
const t = buildTheme(scheme, dark);
```
✅ Já está feito

### Orientation (Portrait/Landscape)
```javascript
// React Native suporta automaticamente
// Scroll adapt-se ao width
// Tabs reflow se largar device
```
✅ Já está implementado

---

## 🎯 Guia Rápido (Passo a Passo)

### 5 Minutos com Expo Go
```bash
# 1. Start Expo
npx expo start

# 2. Pressiona 'i'
i

# 3. Abre Expo Go no iPhone
# 4. Aponta camera para QR code
# 5. App abre automaticamente
# 6. Testa tudo!
```

### 15 Minutos com Simulator (Mac)
```bash
# 1. Instala Xcode (first time: 3GB)
xcode-select --install

# 2. Start Expo
npx expo start

# 3. Pressiona 'i'
i

# 4. Simulator abre com app
# 5. Testa tudo!
```

---

## ✅ Checklist Final

- [ ] Expo ou Simulator a rodar
- [ ] App abre sem erros
- [ ] Login funciona
- [ ] Todos os 5 tabs funcionam
- [ ] KidApp mode funciona
- [ ] Todas as sheets funcionam
- [ ] Dados persistem
- [ ] SafeArea correto
- [ ] Colors corretos
- [ ] Touch targets 44px+

---

## 🎉 Conclusão

**Está pronto para testar em iOS!**

Recomendação:
1. ⭐ **Primeiro:** Expo Go (2 min setup)
2. ⭐ **Depois:** Simulator (mais realista)
3. ⭐ **Final:** iPhone físico (com Xcode)

**Qualquer problema?** Os erros do terminal têm soluções — copia a mensagem de erro e busca documentação Expo ou React Native.

Boa sorte! 🚀
