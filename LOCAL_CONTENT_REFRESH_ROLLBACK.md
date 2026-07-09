# Local Content Refresh Rollback

Created for local-only review. Do not push this branch until approved.

## Branch

- Working branch: `content-refresh-local-ca-public`
- Backup folder: `/home/taran/constrovet-website_backup_20260708T142751Z`

## Inspect Locally

```bash
cd /home/taran/constrovet-website
python3 -m http.server 4173
```

Open `http://localhost:4173/`.

## Discard Git Changes Only

```bash
cd /home/taran/constrovet-website
git restore .
git clean -fd
git switch main
```

## Full Folder Restore

```bash
rm -rf /home/taran/constrovet-website
cp -a /home/taran/constrovet-website_backup_20260708T142751Z /home/taran/constrovet-website
```

## Rule

No GitHub push was planned for this refresh. Review locally first, then approve, discard, or request changes.
