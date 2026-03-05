# ================================================================
# Dockerfile — Constrovet static site on Google Cloud Run
# Uses nginx to serve static HTML files.
# No Node.js, no build step needed.
# ================================================================
FROM nginx:alpine

# Copy all site files into nginx's default web root
COPY . /usr/share/nginx/html

# Copy custom nginx config (handles SPA-style routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 8080
