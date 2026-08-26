# Google Calendar Integration — Setup & Verification

**Status:** ⏳ NOT STARTED  
**Timeline:** 4-6 weeks (Google verification process)  
**Priority:** 🔴 CRITICAL — Start immediately

---

## 1. Prerequisites

- Google Cloud Project created
- OAuth 2.0 credentials (Client ID + Client Secret)
- Redirect URI configured: `https://nossacasa.app/auth/google/callback`
- Gmail/Google Account for testing

---

## 2. Google Calendar API Setup (Self - Complete Now)

### Step 1: Create Google Cloud Project
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project: "Nossa Casa"
3. Enable APIs:
   - Google Calendar API
   - Google People API (for contact info)

### Step 2: Create OAuth 2.0 Credentials
1. Credentials → Create Credentials → OAuth 2.0 Client ID
2. Application type: **Web application**
3. Authorized redirect URIs:
   - `http://localhost:8081/auth/google/callback` (dev)
   - `https://nossacasa.app/auth/google/callback` (prod)
   - `https://nossacasa.app/auth/google/callback` (Expo app)

### Step 3: Download Client ID & Secret
- Save securely in `.env` (never commit)
- Will need for Supabase integration (Tarefa 7)

---

## 3. Google Verification (Google - 4-6 Weeks)

### Why Verification is Required
- App accesses users' Google Calendar
- Google has strict requirements for Calendar API access
- Cannot publish without Google's approval

### Verification Checklist

**Application Information:**
- [ ] App name: "Nossa Casa"
- [ ] App type: Family household management
- [ ] Homepage: https://nossacasa.app
- [ ] Privacy policy: https://nossacasa.app/privacy (required!)
- [ ] Support email: support@nossacasa.app
- [ ] Logo: 256×256px PNG

**OAuth Scopes Required:**
```
https://www.googleapis.com/auth/calendar.readonly
https://www.googleapis.com/auth/calendar.events.readonly
```

**Data Access Justification:**
- "Read-only access to user's Google Calendar to import family events into the household management app"
- "We do NOT modify, delete, or share calendar data"
- "Data is stored locally on user's device only"

**Security Information:**
- [ ] App uses HTTPS (✅ Expo/Web)
- [ ] No third-party sharing (✅)
- [ ] Data encrypted in transit (✅)
- [ ] Privacy policy available (⏳ TO CREATE)

---

## 4. Verification Process (Google - 4-6 Weeks)

### Submit Application
1. Open [Google Cloud Console](https://console.cloud.google.com)
2. APIs & Services → OAuth consent screen
3. Select "External" (not internal)
4. Fill in required information (see checklist above)
5. Add scopes (calendar.readonly)
6. Submit for Google verification

### What to Expect
- Google sends confirmation email
- Submits app to security team
- May ask clarifying questions
- Typical timeline: **4-6 weeks**
- Success notification when approved

---

## 5. Testing Phase (After Google Approval)

### Local Testing
```bash
# Env variables
REACT_APP_GOOGLE_CLIENT_ID=your_client_id
REACT_APP_GOOGLE_REDIRECT_URI=http://localhost:8081/auth/google/callback
```

### Test Cases
- [ ] Sign in with Google
- [ ] Calendar import dialog appears
- [ ] Select events to import
- [ ] Events appear in Agenda
- [ ] Recurrent events handled correctly
- [ ] Private events marked (if permitted by Google)

---

## 6. Timeline

| Week | Action | Owner |
|------|--------|-------|
| **Now** | Submit Google verification | Engineer |
| **1-2** | Google acknowledges request | Google |
| **2-4** | Google reviews app security | Google |
| **4-5** | Google approves/requests info | Google/Engineer |
| **5-6** | Approval granted | Google |
| **After** | Integrate with Supabase | Engineer (Tarefa 7) |

---

## 7. Fallback Plan

If Google verification takes longer than expected:
- [ ] Publish app WITHOUT calendar import (feature disabled)
- [ ] Document calendar feature as "coming soon"
- [ ] Enable it immediately after Google approval
- [ ] No app re-submission needed

---

## 8. References

- [Google Calendar API Docs](https://developers.google.com/calendar)
- [OAuth Consent Screen Guide](https://support.google.com/cloud/answer/10311614)
- [Data Verification & Compliance](https://developers.google.com/apps-script/guides/support/data-verification)

---

**Action Item:** Start Google verification process TODAY before other tasks!
