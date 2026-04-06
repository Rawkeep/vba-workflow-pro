# VBA BEAST — Weiterarbeit

## Status: Alle 5 Phasen implementiert, Build passing

```
npm run dev    → Vite Dev-Server (localhost:5173)
npm run build  → Production-Build nach dist/ (44 Module, ~88KB JS)
npm start      → Express-Server served dist/
```

---

## Was noch manuell gemacht werden muss

### 1. Capacitor iOS einrichten
```bash
# CocoaPods installieren (einmalig)
gem install cocoapods
# oder: brew install cocoapods

# iOS-Projekt erstellen
npm run build
npm run cap:ios
# → Öffnet Xcode. Dort Signing-Profil zuweisen.
```

### 2. Capacitor Android einrichten
```bash
npm run build
npm run cap:android
# → Öffnet Android Studio. Dort Signing-Key erstellen.
```

### 3. Stripe einrichten
1. [Stripe Dashboard](https://dashboard.stripe.com) → Products erstellen:
   - **PRO Monatlich**: €9,99/Mo → `price_xxx` → in `.env`
   - **PRO Jährlich**: €79,99/Jahr → `price_xxx` → in `.env`
   - **AI PRO**: €19,99/Mo → `price_xxx` → in `.env`
2. Webhook-Endpoint anlegen: `https://deine-domain.de/api/stripe/webhook`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
3. `.env` ausfüllen (Vorlage: `.env.example`)

### 4. RevenueCat (Mobile IAP)
- Account bei [RevenueCat](https://www.revenuecat.com) erstellen
- App registrieren (iOS + Android)
- `npm install @revenuecat/purchases-capacitor`
- In `src/entitlements.js` RevenueCat-Sync ergänzen
- Apple App Store Connect + Google Play Console: In-App-Subscriptions anlegen

### 5. AI-Features aktivieren
```bash
# .env
ANTHROPIC_API_KEY=sk-ant-xxx
FREE_DAILY_LIMIT=5
```
- Server deployen (Hetzner/Railway/Fly.io)
- AI-Buttons in der UI verlinken (onclick="aiWorkflow()" etc.)

### 6. App Store Submission
- **iOS**: Xcode → Archive → App Store Connect hochladen
  - Screenshots (5 Stück, iPhone + iPad)
  - Privacy Policy URL: `https://deine-domain.de/privacy.html`
  - Category: Productivity
- **Android**: APK/AAB → Google Play Console
  - Asset Links für TWA (falls TWA statt Capacitor)

---

## Architektur-Übersicht

```
vba-workflow-pro/
├── api/
│   ├── stripe.js        # Checkout, Webhook, Portal, Status
│   └── ai.js            # 4 AI-Endpoints + Freemium/BYOK
├── public/
│   ├── icons/            # PNG Icons (192, 512, 1024)
│   ├── fonts/            # woff2 Fonts
│   └── privacy.html      # DSGVO-Datenschutzerklärung
├── src/
│   ├── main.js           # Entry Point (alle Module importiert)
│   ├── store.js          # Globaler State (S-Objekt)
│   ├── idb.js            # IndexedDB (7 Stores)
│   ├── nav.js            # Navigation, Theme, Toast
│   ├── utils.js          # $ = getElementById
│   ├── entitlements.js   # FREE/PRO/AI Feature Gates
│   ├── paywall.js        # Paywall UI + Stripe Checkout
│   ├── startup.js        # Init-Sequenz
│   ├── ai/
│   │   └── index.js      # 4 AI Features + Settings UI
│   ├── excel/            # 11 Module (Import, Export, Render, etc.)
│   ├── word/             # merge.js, docx-builder.js
│   ├── doccenter/        # Dokumenten-Center
│   ├── templates/        # Template-Bibliothek
│   ├── email/            # E-Mail Batch
│   ├── database/         # DB Manager
│   ├── hybrid/           # Workspaces + Favorites
│   ├── dashboard/        # Dashboard Engine
│   ├── ui/               # 12 UI-Module (keyboard, undo, tour, etc.)
│   ├── styles/
│   │   └── main.css      # Alle Styles (inkl. Paywall + AI)
│   └── i18n/
│       └── de.json       # UI-Strings (Vorbereitung)
├── icons/                # SVG + PNG Source
├── legacy/               # Original vba-beast-v3_z.html
├── server.js             # Express (Stripe + AI + Static)
├── vite.config.js        # Vite + PWA Plugin
├── capacitor.config.json # iOS/Android Config
├── index.html            # HTML Body (1434 Zeilen)
└── package.json          # Scripts: dev, build, cap:ios, cap:android
```

## Pricing-Modell

| Tier | Preis | Features |
|------|-------|----------|
| FREE | €0 | Import/Export CSV, Basic IF/ELSE (3 Regeln), Sort/Filter, Charts (bar/line) |
| PRO | €9,99/Mo oder €79,99/Jahr | SELECT CASE, Pipelines, Macros, PDF/DOCX, Mail-Merge, Workspaces, Pivot |
| AI PRO | €19,99/Mo | Alles PRO + 4 AI-Features (Workflow Builder, Profiler, Formeln, Templates) |

## Freemium + BYOK Pattern

- 5 kostenlose AI-Anfragen/Tag (per IP, Mitternacht-Reset)
- BYOK: User liefert eigenen Anthropic-Key → unbegrenzt
- Header: `x-user-api-key: sk-ant-xxx`
- Gleicher Pattern wie Smart Meal + Mythos
