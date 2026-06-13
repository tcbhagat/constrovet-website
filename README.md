# Constrovet Website

Static HTML site for **constrovet.com** — hosted on GitHub Pages.

---

## 📁 Project Structure

```
constrovet/
├── index.html              ← Home page
├── pages/
│   ├── solution.html
│   ├── how-it-works.html
│   ├── industries.html
│   ├── knowledge.html
│   ├── company.html
│   ├── contact.html
│   ├── team.html
│   ├── client.html
│   └── privacy.html
├── assets/
│   ├── nav.html            ← Shared navigation (edit ONCE, updates all pages)
│   ├── footer.html         ← Shared footer   (edit ONCE, updates all pages)
│   ├── css/
│   │   └── style.css       ← All styles (edit ONCE, updates all pages)
│   └── js/
│       └── main.js         ← Nav loader + hamburger logic
├── app/
│   └── index.html          ← Legacy no-login browser analysis demo
├── apps-script/
│   └── Code.gs             ← Workspace Apps Script processor for Deep Analysis + email
├── colab/
│   └── constrovet_gemini_verifier.ipynb ← legacy verifier reference
├── Dockerfile              ← Legacy Cloud Run rollback reference
├── nginx.conf              ← Legacy web server config
└── .gitignore
```

---

## ✏️ How to Edit

| Task | File to edit |
|---|---|
| Change nav links | `assets/nav.html` |
| Change footer text | `assets/footer.html` |
| Change colours / fonts / spacing | `assets/css/style.css` → top `:root {}` block |
| Edit Home page content | `index.html` |
| Edit any other page | `pages/<page-name>.html` |

---

## 🚀 Production Deploys

Production is hosted on **GitHub Pages** behind `www.constrovet.com`.

The active public routing model is:

- Website: `https://www.constrovet.com`
- Authenticated app: `https://app.constrovet.com`
- Legacy no-login browser demo: `https://www.constrovet.com/app/`

The static `/app/` page is retained only for lightweight PDF/CSV evaluation and
must be labelled as legacy. It is not the canonical authenticated product app.

The canonical app now lives on the branded app subdomain. Do not publish raw
Cloud Run URLs in public CTAs.

The authenticated app produces cited findings, executive intelligence, Atomic
Apex risk signals, top executive actions, evidence summaries, audit trails, and
reports. The legacy browser demo remains no-login and no-persistence.

The production deployment target is:

| Setting | Value |
|---|---|
| GitHub repo | `tcbhagat/constrovet-website` |
| Branch | `main` |
| GitHub Pages source | `main` branch, `/` |
| Production domain | `www.constrovet.com` |
| App target | `https://app.constrovet.com` |
| Legacy browser demo | `https://www.constrovet.com/app/` |

### Automatic deploy flow

1. Edit files in this repo.
2. Commit changes to `main`.
3. Push to `origin/main`.
4. GitHub Pages serves the updated static files for `www.constrovet.com`.

Cloud Run deployment for the authenticated app is managed from the app repo.
Keep public website deployment on GitHub Pages.

### Legacy GCP rollback reference

Historical Cloud Run files remain in the repository only for rollback analysis.
They are not the active production path.

### Verify deployment

```bash
curl -I -L https://www.constrovet.com
curl -I -L https://www.constrovet.com/demo
curl -I -L https://www.constrovet.com/app/
curl -I -L https://app.constrovet.com/api/health
curl -I -L https://www.constrovet.com/llms.txt
curl -I -L https://www.constrovet.com/sitemap.xml
curl -I -L https://www.constrovet.com/robots.txt
```

The `www` routes should return `200` from GitHub Pages. The app health endpoint
should return `200` from the authenticated app deployment.

---

## 🧪 Test Locally (optional)

```bash
# Requires Docker Desktop installed
docker build -t constrovet .
docker run -p 8080:8080 constrovet
# Open http://localhost:8080
```
