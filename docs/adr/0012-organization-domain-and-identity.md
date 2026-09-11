# ADR 0012: Organization Domain Strategy & Web Identity

| Metadata | Specification |
| :--- | :--- |
| **Status** | Approved |
| **Date** | 2026-09-10 |
| **Domain** | Organization Infrastructure |

---

## Context & Decision

OpenSelena is the parent open-source GitHub organization (`https://github.com/OpenSelena`) hosting Open Omni and related tooling. To establish a permanent web presence, safeguard the project's identity against cybersquatting, and enable verified badges across GitHub and package registries, an authoritative domain structure is required.

Following primary registry verification across ICANN and Verisign RDAP services, the organization adopts a dual-domain structure:
1. **Canonical Domain (`openselena.org`)**: The primary open-source identity and root address for project documentation, community hubs, and web assets.
2. **Defensive Domain (`openselena.com`)**: The protective brand alias registered to prevent typosquatting, phishing, or commercial confusion, configured to permanently redirect (HTTP 301) to the canonical domain.

## Registrar & Infrastructure Architecture

To ensure operational security and minimize recurring overhead, the domain infrastructure is standardized as follows:

1. **Registrar**: **Cloudflare Registrar** is selected as the primary registrar due to its wholesale at-cost pricing model (zero markup over Verisign/PIR wholesale + ICANN fee), free WHOIS privacy redaction, and automated DNSSEC key management. **Porkbun** serves as the authorized secondary alternative should external nameserver delegation be required.
2. **DNS & Edge Routing**:
   * Authoritative DNS is managed on Cloudflare with DNSSEC enabled.
   * `openselena.com` uses Cloudflare Redirect Rules to issue an immediate HTTP 301 redirect to `https://openselena.org$uri`.
3. **Hosting Integration (GitHub Pages)**:
   * Apex domain (`openselena.org`) routes to GitHub Pages IP ranges (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`).
   * Subdomain `www.openselena.org` points via `CNAME` to `openselena.github.io`.
   * Enforce HTTPS is enabled in repository settings.

## GitHub Organization Verification

To establish provenance and protect the organization from spoofing:
1. A DNS `TXT` record (`_github-challenge-OpenSelena`) is provisioned on `openselena.org` matching GitHub's challenge token.
2. The domain is verified under GitHub Organization Settings (`Settings -> Verified and approved domains`).
3. The resulting "Verified" badge validates that commits, releases, and documentation officially originate from OpenSelena.
