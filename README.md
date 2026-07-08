# Constrovet Website

Static HTML site for **constrovet.com** — hosted on GitHub Pages.

For operating procedures, route checks, incident runbooks, and zero-budget controls, see [OPERATIONS_MAINTENANCE.md](OPERATIONS_MAINTENANCE.md).

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
│   └── index.html          ← GCP-free Analyse / Deep Analysis dashboard
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

The active GCP-free app workflow is:

- Website: `https://www.constrovet.com`
- App launcher: `https://www.constrovet.com/app/`
- First-pass execution: browser-side PDF/CSV analysis from the static `/app/`
  dashboard
- Storage and async processing: Google Workspace Drive and Apps Script owned by
  `admin@constrovet.com`
- Optional deeper execution: the **Deep Analysis** button submits an
  evidence-bound payload to the Workspace Apps Script processor, which uses the
  approved Gemini key from Script Properties and emails the report.
- GCP status: all visible projects have been moved to `DELETE_REQUESTED`

Legacy Cloud Run/GCP notes in this repository are retained only as rollback
references. Do not re-enable GCP hosting or paid infrastructure without an
explicit approval and a new rollback plan.

Do not add service-account Drive upload, GCS, Cloud Run, Cloud SQL, Firestore,
or a hosted app backend to the active workflow unless a future backend revival
is explicitly approved. Workspace Apps Script is the approved free-tier
processor for Deep Analysis and email.

The browser dashboard now produces risk scoring, top executive actions,
recoverable exposure, control-failure notes, missing-evidence blockers, a
7/30/90 action plan, citations/rationale, and optional Workspace report
submission. **Analyse** is browser-only and no-cost. **Deep Analysis** calls
Gemini only through the deployed Apps Script processor after explicit user
action and must receive only cited findings, quoted spans, calculations, action
plans, honesty check, and audit metadata.

The production deployment target is:

| Setting | Value |
|---|---|
| GitHub repo | `tcbhagat/constrovet-website` |
| Branch | `main` |
| GitHub Pages source | `main` branch, `/` |
| Production domain | `www.constrovet.com` |
| App launcher | `https://www.constrovet.com/app/` |

### Automatic deploy flow

1. Edit files in this repo.
2. Commit changes to `main`.
3. Push to `origin/main`.
4. GitHub Pages serves the updated static files for `www.constrovet.com`.

Do not restore Cloud Build or Cloud Run deployment unless the GCP rollback path is explicitly approved.

### Legacy GCP rollback reference

Historical Cloud Run files remain in the repository only for rollback analysis.
They are not the active production path.

### Verify deployment

```bash
curl -I -L https://www.constrovet.com
curl -I -L https://www.constrovet.com/demo
curl -I -L https://www.constrovet.com/app/
curl -I -L https://www.constrovet.com/llms.txt
curl -I -L https://www.constrovet.com/sitemap.xml
curl -I -L https://www.constrovet.com/robots.txt
```

All routes should return `200` from GitHub Pages.

---

## 🧪 Test Locally (optional)

```bash
# Requires Docker Desktop installed
docker build -t constrovet .
docker run -p 8080:8080 constrovet
# Open http://localhost:8080
```
