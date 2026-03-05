# Constrovet Website

Static HTML site for **constrovet.com** — hosted on Google Cloud Run.

---

## 📁 Project Structure

```
constrovet/
├── index.html              ← Home page
├── pages/
│   ├── solution.html
│   ├── how-it-works.html
│   ├── industries.html
│   ├── demo.html
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
├── Dockerfile              ← Cloud Run container config
├── nginx.conf              ← Web server config
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

## 🚀 Deploy to Google Cloud Run (Copy-Paste Steps)

### Step 1 — One-time setup (run in Google Cloud Shell)

```bash
# Set your project ID (find it in GCP Console)
gcloud config set project YOUR_PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com artifactregistry.googleapis.com cloudbuild.googleapis.com
```

### Step 2 — Deploy (run this every time you push changes)

```bash
# From the root of this repo:
gcloud run deploy constrovet \
  --source . \
  --platform managed \
  --region asia-south1 \
  --allow-unauthenticated \
  --port 8080
```

Cloud Run will build the Docker image, push it, and give you a live HTTPS URL.

### Step 3 — Map your custom domain (constrovet.com)

1. Go to **Cloud Run → constrovet → Custom Domains → Add mapping**
2. Enter `www.constrovet.com`
3. Copy the DNS records shown and add them in your domain registrar
4. GCP auto-provisions an SSL certificate (takes ~15 min)

---

## 🔄 GitHub → Auto-deploy (Cloud Build trigger)

1. Push this repo to GitHub
2. In GCP Console → **Cloud Build → Triggers → Create Trigger**
3. Connect your GitHub repo, branch: `main`
4. Build config: **Dockerfile**
5. Add deploy step — every push to `main` auto-deploys to Cloud Run

---

## 🧪 Test Locally (optional)

```bash
# Requires Docker Desktop installed
docker build -t constrovet .
docker run -p 8080:8080 constrovet
# Open http://localhost:8080
```
