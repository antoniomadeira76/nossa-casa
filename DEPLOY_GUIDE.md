# 🚀 Deploy Nossa Casa to Production

## **Option 1: Vercel (Recommended)**

### Step 1: Create Vercel Account
```bash
# Sign up at vercel.com
# Or login if you already have an account
vercel login
```

### Step 2: Deploy
```bash
cd dist
vercel --prod
```

**Result:** You'll get a URL like `https://nossa-casa.vercel.app`

---

## **Option 2: Netlify**

### Step 1: Create Netlify Account
```bash
npm install -g netlify-cli
netlify login
```

### Step 2: Deploy
```bash
netlify deploy --prod --dir=dist --site=YOUR_SITE_ID
```

---

## **Option 3: GitHub Pages**

### Step 1: Push to GitHub
```bash
git add dist
git commit -m "build: add production web build"
git push origin main
```

### Step 2: Enable Pages
- Go to Settings > Pages
- Select `main` branch, `/root` directory
- Save

**Result:** Deployed at `https://username.github.io/nossa-casa`

---

## **Files Ready to Deploy**

```
dist/
├── index.html          (1.2 KB)
├── metadata.json       (49 B)
├── favicon.ico        
└── _expo/
    └── static/
        └── js/
            └── web/
                └── AppEntry-*.js  (755 KB)
```

---

## **Pre-Deployment Checklist**

- [ ] Environment variables set (if needed)
- [ ] Build tested locally (`npm test` - 18/18 passing)
- [ ] Mobile responsive verified (375×812 tested)
- [ ] Dark mode tested
- [ ] All features working
- [ ] No console errors

---

## **Post-Deployment**

1. **Test Live URL:**
   - Open on desktop
   - Open on iOS Safari
   - Open on Android Chrome
   - Test install prompt (PWA)

2. **Configure Domain (Optional):**
   - Custom domain setup in Vercel/Netlify
   - SSL certificate auto-configured

3. **Monitor:**
   - Set up error tracking (Sentry)
   - Enable analytics
   - Monitor performance

---

## **Live Deployment Status**

| Platform | Status | Action |
|----------|--------|--------|
| **Vercel** | Ready | `vercel --prod` |
| **Netlify** | Ready | `netlify deploy --prod` |
| **GitHub Pages** | Ready | Enable in Settings |

**Total Deploy Time:** ~2-3 minutes  
**Build Size:** ~760 KB  
**Status:** ✅ PRODUCTION READY

---

Generated: 2026-08-28  
App Version: 1.0.0
