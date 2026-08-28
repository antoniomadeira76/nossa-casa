#!/bin/bash
# Deploy to GitHub Pages
# This script copies dist/ contents to root for GitHub Pages deployment

echo "📦 Preparing GitHub Pages deployment..."

# Copy dist contents to root (for GitHub Pages)
cp -r dist/* .

echo "✅ GitHub Pages configuration ready!"
echo "📝 Next steps:"
echo "   1. Commit: git add . && git commit -m 'chore: prepare for GitHub Pages'"
echo "   2. Create repo on GitHub: https://github.com/new"
echo "   3. Add remote: git remote add origin https://github.com/YOUR_USERNAME/nossa-casa.git"
echo "   4. Push: git branch -M main && git push -u origin main"
echo "   5. Enable Pages: Settings > Pages > Branch: main > Save"
echo "🚀 App will be live at: https://YOUR_USERNAME.github.io/nossa-casa/"
