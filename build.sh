#!/bin/bash

# Nossa Casa - Mobile App Build Script
# Builds iOS and Android apps for App Store and Google Play

set -e

echo "🚀 Building Nossa Casa Mobile App..."
echo ""

# Check if logged in to Expo
if ! eas whoami > /dev/null 2>&1; then
  echo "❌ Not logged in to Expo"
  echo "Please run: eas login"
  exit 1
fi

echo "✅ Logged in to Expo"
echo ""

# Build for preview (testing)
echo "📱 Building preview for iOS and Android..."
echo ""

echo "Building iOS preview..."
eas build --platform ios --profile preview --wait

echo ""
echo "Building Android preview..."
eas build --platform android --profile preview --wait

echo ""
echo "✅ Preview builds complete!"
echo ""

# Optionally build for production
read -p "Build for production (App Store/Play Store)? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
  echo ""
  echo "Building iOS production..."
  eas build --platform ios --profile production --wait

  echo ""
  echo "Building Android production..."
  eas build --platform android --profile production --wait

  echo ""
  echo "✅ Production builds complete!"
  echo ""
  echo "Next steps:"
  echo "1. Review builds at: https://expo.dev/@your-username/nossa-casa/builds"
  echo "2. Submit to App Store: eas submit --platform ios --latest"
  echo "3. Submit to Play Store: eas submit --platform android --latest"
fi

echo ""
echo "🎉 Build process completed!"
