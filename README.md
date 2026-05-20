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

## 🚀 Production Deploys

Production is hosted on **Google Cloud Run** behind `www.constrovet.com`.

The production deployment target is:

| Setting | Value |
|---|---|
| GCP project | `gen-lang-client-0006884360` |
| GitHub repo | `tcbhagat/constrovet-website` |
| Branch | `main` |
| Cloud Run service | `constrovet-site` |
| Region | `asia-southeast1` |
| Production domain | `www.constrovet.com` |
| Cloud Build trigger ID | `89b8aca5-e812-4e7d-9392-552100669b0f` |

### Automatic deploy flow

1. Edit files in this repo.
2. Commit changes to `main`.
3. Push to `origin/main`.
4. Cloud Build trigger `89b8aca5-e812-4e7d-9392-552100669b0f` builds the repo `Dockerfile`.
5. Cloud Build pushes the image to Artifact Registry:
   `asia-southeast1-docker.pkg.dev/gen-lang-client-0006884360/cloud-run-source-deploy/constrovet-website/constrovet-site:$COMMIT_SHA`
6. Cloud Build updates Cloud Run service `constrovet-site` in `asia-southeast1`.
7. Cloud Run routes `100% LATEST` traffic to the new ready revision.
8. `www.constrovet.com` serves the updated Cloud Run revision.

Do not add a GitHub Actions deployment workflow unless the Cloud Build trigger is intentionally removed. The production deploy path is GCP Cloud Build.

The older duplicate production trigger for `asia-south1/constrovet-site` is intentionally disabled. Keep it disabled unless production is moved away from `www.constrovet.com`'s `asia-southeast1` service.

Cloud Run Console's **Source** tab can show a stale archive from an older source-based deploy. For this image-based Cloud Build deploy path, treat the Cloud Build `COMMIT_SHA`, the Cloud Run image tag, the Cloud Run `commit-sha` label, and the live HTML response as authoritative.

### Manual deploy fallback

Only use this if the Cloud Build trigger is unavailable:

```bash
gcloud config set project gen-lang-client-0006884360

gcloud run deploy constrovet-site \
  --source . \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --port 8080
```

### Verify deployment

```bash
COMMIT_SHA="$(git rev-parse HEAD)"

gcloud builds list \
  --filter='trigger_id=89b8aca5-e812-4e7d-9392-552100669b0f' \
  --limit=1 \
  --format='table(id,status,createTime,substitutions.COMMIT_SHA)'

gcloud run services describe constrovet-site \
  --region asia-southeast1 \
  --format='yaml(metadata.labels.commit-sha,spec.traffic,status.traffic,status.latestReadyRevisionName)'

curl -I -L https://www.constrovet.com
```

The Cloud Run `commit-sha` label should match `COMMIT_SHA`, traffic should be `100% LATEST`, and the site should return HTTP `200`.

For a single command verification, run:

```bash
bash scripts/verify-production-deploy.sh
```

---

## 🧪 Test Locally (optional)

```bash
# Requires Docker Desktop installed
docker build -t constrovet .
docker run -p 8080:8080 constrovet
# Open http://localhost:8080
```
