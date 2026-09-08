# Custom Installer Domain Configuration Guide (`sarada.mvp.bd`)

This guide explains how to configure a custom domain or subdomain such as **`sarada.mvp.bd`** (or `open-omni.sh`) so running:
```sh
curl -fsSL https://sarada.mvp.bd | sh
```
downloads and executes the Open Omni installer ([`install.sh`](../install.sh)).

---

## Architecture Overview

When a user runs `curl -fsSL https://sarada.mvp.bd | sh`:
1. `sarada.mvp.bd` receives the HTTP `GET` request.
2. The server / edge worker returns the raw POSIX shell script content from GitHub `main` (or 302 redirects to `https://raw.githubusercontent.com/OpenSelena/openomni/main/install.sh`).
3. If an interactive web browser opens `https://sarada.mvp.bd`, the server can redirect directly to the GitHub repository [`https://github.com/OpenSelena/openomni`](https://github.com/OpenSelena/openomni).

---

## Deployment Options

### Method 1: Web Server on Existing Host (`103.174.51.100`)

Since `sarada.mvp.bd` already points to `103.174.51.100`:

#### Nginx
Add to the server block for `sarada.mvp.bd`:
```nginx
server {
    server_name sarada.mvp.bd;
    listen 80;
    listen 443 ssl;

    location = / {
        return 302 https://raw.githubusercontent.com/OpenSelena/openomni/main/install.sh;
    }
}
```

#### Caddy
```caddyfile
sarada.mvp.bd {
    redir / https://raw.githubusercontent.com/OpenSelena/openomni/main/install.sh 302
}
```

---

### Method 2: Cloudflare Workers (Edge Caching & Auto-SSL)

1. Navigate to **Workers & Pages** in Cloudflare.
2. Create a worker and paste the contents of [`workers/installer.js`](../workers/installer.js).
3. Under **Settings > Domains & Routes**, add `sarada.mvp.bd` (or `omni.sarada.mvp.bd`).

---

## Verifying the Domain

Once configured:

```sh
# 1. Test headers
curl -I https://sarada.mvp.bd

# 2. Test raw execution
curl -fsSL https://sarada.mvp.bd | sh
```
