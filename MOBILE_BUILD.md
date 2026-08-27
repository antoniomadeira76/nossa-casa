# Nossa Casa - Mobile App Build Guide

## 📱 Build for iOS and Android

This app is built with Expo and can be compiled for iOS and Android using EAS Build.

### Prerequisites
```bash
npm install -g eas-cli
eas login  # Login to your Expo account
```

### Build Configurations

#### 1. **Development Build** (for development/testing)
```bash
eas build --platform ios --profile development
eas build --platform android --profile development
```

#### 2. **Preview Build** (for testing before production)
```bash
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

#### 3. **Production Build** (for App Store/Play Store)
```bash
# iOS
eas build --platform ios --profile production

# Android
eas build --platform android --profile production
```

### Test Locally with Expo Go

```bash
# Run on iOS simulator
npx expo run:ios

# Run on Android emulator
npx expo run:android

# Or use Expo Go app
npx expo start
# Scan QR code with Expo Go on your phone
```

### App Details

| Property | Value |
|----------|-------|
| **App Name** | Nossa Casa |
| **Bundle ID (iOS)** | com.bengui.nossacasa |
| **Package Name (Android)** | com.bengui.nossacasa |
| **Version** | 1.0.0 |
| **Platform** | Expo 51 / React Native 0.74.5 |

### Features Included

✅ Family household management
✅ Budget tracking with envelopes
✅ Task management with urgency
✅ Shopping list by category
✅ Calendar with event management
✅ Health records
✅ Equipment tracking
✅ Admin panel with role management
✅ Google Calendar integration

### Deployment

#### iOS App Store
```bash
eas build --platform ios --profile production
eas submit --platform ios --latest
```

#### Google Play Store
```bash
eas build --platform android --profile production
eas submit --platform android --latest
```

### Documentation

- **Design Spec**: `design/Nossa Casa App.dc.html`
- **Screen Specs**: `docs/especificacao-ecras.md`
- **Security**: `docs/seguranca.html`
- **Synchronization**: `docs/sincronizacao.html`

### Support

For issues or questions:
1. Check Expo documentation: https://docs.expo.dev
2. Review project CLAUDE.md for architecture guidelines
3. Check git history for recent changes

---

**Created**: 2026-08-27
**Status**: Production Ready ✅
