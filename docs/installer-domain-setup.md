# Custom Installer Domain Configuration Guide (`mint.dev.cv`)

This guide explains how to configure a custom domain or subdomain such as **`mint.dev.cv`** (or `open-omni.sh`) so running:
```sh
curl -fsSL https://mint.dev.cv | sh
```
downloads and executes the Open Omni installer ([`install.sh`](../install.sh)).

---

## Architecture Overview

When a user runs `curl -fsSL https://mint.dev.cv | sh`:
1. `mint.dev.cv` receives the HTTP `GET` request.
2. The edge network (Cloudflare) returns a `307` or `302` redirect to `https://raw.githubusercontent.com/OpenSelena/openomni/main/install.sh`.
3. `curl` follows the redirect via `-L` and streams `install.sh` directly into `sh`.

---

## Live Production Setup (Cloudflare Redirect Rules)

`mint.dev.cv` is live and active via Cloudflare with full automated SSL:

1. **DNS Record**:
   * Type: `A`
   * Name: `@` (`mint.dev.cv`)
   * Content: `192.0.2.1` (Cloudflare dummy IP for redirect rules)
   * Proxy status: `Proxied` (Orange Cloud ON)

2. **Redirect Rule**:
   * Name: `Open Omni Installer`
   * When: `All incoming requests`
   * URL redirect: `Static`
   * Target URL: `https://raw.githubusercontent.com/OpenSelena/openomni/main/install.sh`
   * Status code: `307 - Temporary Redirect`

---

## Alternative Deployment Options

### Cloudflare Worker (Zero Server, Direct Serving)
If you prefer serving the raw script directly with edge caching rather than redirecting, deploy [`workers/installer.js`](../workers/installer.js) to a Cloudflare Worker route matching `mint.dev.cv/*`.

### Self-Hosted Nginx
```nginx
server {
    server_name mint.dev.cv;
    listen 80;
    listen 443 ssl;

    location = / {
        return 302 https://raw.githubusercontent.com/OpenSelena/openomni/main/install.sh;
    }

    location / {
        return 302 https://github.com/OpenSelena/openomni;
    }
}
```
