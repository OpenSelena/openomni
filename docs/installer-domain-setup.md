# `open-omni.sh` Installer Domain Configuration Guide

This guide explains how to configure the domain **`open-omni.sh`** so running:
```sh
curl -fsSL https://open-omni.sh | sh
```
downloads and executes the Open Omni installer ([`install.sh`](../install.sh)).

---

## Architecture Overview

When a user runs `curl -fsSL https://open-omni.sh | sh`:
1. `open-omni.sh` receives the HTTP `GET` request.
2. The edge server returns the raw POSIX shell script content from GitHub `main` with:
   - `Content-Type: text/plain; charset=utf-8`
   - `Cache-Control: public, max-age=300` (caches for 5 minutes at the edge so GitHub API/raw rate limits are never hit)
3. If an interactive web browser opens `https://open-omni.sh`, the server can optionally redirect directly to the GitHub repository [`https://github.com/OpenSelena/openomni`](https://github.com/OpenSelena/openomni).

---

## Deployment Options

### Method 1: Cloudflare Workers (Recommended)

Using Cloudflare Workers provides global edge caching (<10ms worldwide) and works even if the user omits `-L` from curl.

1. Log into your [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Workers & Pages** > **Create application** > **Create Worker**.
3. Name the Worker (e.g. `open-omni-installer`).
4. Click **Deploy**, then **Edit Code**.
5. Paste the contents of [`workers/installer.js`](../workers/installer.js) into `index.js`.
6. Click **Save and Deploy**.
7. Connect your custom domain:
   - Go to **Workers & Pages** > `open-omni-installer` > **Settings** > **Domains & Routes**.
   - Click **Add Custom Domain**.
   - Enter `open-omni.sh` (and optionally `www.open-omni.sh`).
   - Cloudflare will automatically provision SSL/TLS certificates and configure DNS routing.

---

### Method 2: Cloudflare Page Rule / Redirect Rule (Simplest, Zero Code)

If you manage `open-omni.sh` in Cloudflare and prefer a pure redirect:

1. Open domain `open-omni.sh` in Cloudflare.
2. Go to **Rules** > **Redirect Rules** (or **Page Rules**).
3. Create rule:
   - **Rule Name**: `Installer Redirect`
   - **When incoming requests match**: `(http.host eq "open-omni.sh" or http.host eq "www.open-omni.sh")`
   - **Type**: `Dynamic` or `Static`
   - **Target URL**: `https://raw.githubusercontent.com/OpenSelena/openomni/main/install.sh`
   - **Status code**: `302 Found` (or `307 Temporary Redirect`)
4. Click **Deploy**.
5. Since `curl -fsSL` includes the `-L` (follow redirects) flag, the script will execute seamlessly.

---

### Method 3: GitHub Pages (Direct Hosting)

If you prefer hosting directly via GitHub Pages on the repo:
1. In the repository settings: **Settings** > **Pages**.
2. Set source branch to `main` and folder to `/` or `/docs`.
3. Add custom domain `open-omni.sh`.
4. Point DNS A-records to GitHub Pages IPs (`185.199.108.153`, etc.).

---

## Verifying the Domain

Once the DNS propagates (usually 1-5 minutes on Cloudflare):

```sh
# 1. Test headers
curl -I https://open-omni.sh

# 2. Test raw execution
curl -fsSL https://open-omni.sh | sh
```
