# Constrovet Website Editing Guide

Use GitHub web editing as the normal workflow. It gives you history, review,
and a clean path to GitHub Pages deployment without touching production servers
directly.

## What to Edit

| Goal | File |
| --- | --- |
| Home page copy and main buttons | `index.html` |
| Solution, demo, knowledge, company, team, client, privacy pages | `pages/<page-name>.html` |
| Navigation links | `assets/nav.html` |
| Footer links and text | `assets/footer.html` |
| Colours, typography, spacing, mobile layout | `assets/css/style.css` |
| Browser behavior such as mobile menu | `assets/js/main.js` |
| Legacy Cloud Run web server headers and caching | `nginx.conf` |

## GitHub Web Workflow

1. Open `https://github.com/tcbhagat/constrovet-website`.
2. Click the file you want to edit.
3. Use the pencil icon, make the text-only change, and preview the diff.
4. Commit to a short branch name such as `content/home-copy`.
5. Open a pull request, check the diff, then merge to `main` when ready.
6. GitHub Pages should serve the merged `main` branch.

Current app links should point to `/app/`, the GitHub Pages dashboard for
browser Analyse plus Workspace Apps Script Deep Analysis and report email. Do
not restore `app.constrovet.com`, raw Cloud Run links, service-account Drive
upload, or hosted backend email automation unless a backend revival is
explicitly approved.

## Local Ubuntu Workflow

Use local editing for layout, CSS, or multi-file changes.

```bash
cd /home/taran/constrovet-website
python3 -m http.server 8080
```

Open `http://localhost:8080`, edit files, verify mobile and desktop, then push to GitHub.

## Emergency Cloud Shell Workflow

Use Cloud Shell only when GitHub is unavailable and the public site needs a quick fix. After the emergency fix, copy the same change back into GitHub so the repository remains the source of truth.

## Publishing Rules

- Do not publish client names, private contract terms, personal data, or unverified financial claims.
- Keep testimonials, accuracy percentages, and capital-audited claims only when source evidence exists.
- Prefer replacing uncertain claims with verifiable product capabilities.
