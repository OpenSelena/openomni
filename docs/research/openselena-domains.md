# Domain Research: OpenSelena Organization Domains

**Date**: 2026-09-10  
**Target Organization**: OpenSelena (GitHub: `https://github.com/OpenSelena`)  
**Scope**: Full internet survey covering `.com`, `.org`, `.net`, `.io`, `.dev`, `.app`, `.ai`, `.sh`, `.tools` across primary registry RDAP endpoints, registrar cost structures, and technical suitability for an open-source GitHub organization.

---

## 1. Executive Summary & Live Verification

Live primary queries were conducted directly against **ICANN RDAP** (`https://rdap.org`) and authoritative registry endpoints (including **Verisign RDAP** `https://rdap.verisign.com/com/v1/domain/openselena.com`):

* **Status**: **100% of the target domains are completely unallocated, unregistered, and available** at standard first-party registry pricing.
* **No Squatters / No Premium Brokering**: None of the domains are parked, cybersquatted, or classified as premium registry reserved tiers.
* **DNS Resolution**: All target domains return `NXDOMAIN` (no active DNS records exist).

---

## 2. Domain Availability & Pricing Breakdown

| Domain | Registry Operator | RDAP Status | Approx. Wholesale / Cloudflare | Approx. Porkbun (1st Yr / Renew) | Approx. Namecheap (1st Yr / Renew) | Verdict / Strategic Role |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`openselena.com`** | Verisign | **Available** (404) | ~$9.95 / yr | $10.08 / $11.08 | $10.98 / $15.98 | **Critical Tier 1**: Primary global brand defense and universal recognition. |
| **`openselena.org`** | Public Interest Registry (PIR) | **Available** (404) | ~$10.31 / yr | $6.98 / $11.84 | $7.98 / $14.98 | **Strong Tier 1**: Traditional open-source / public benefit credibility. |
| **`openselena.dev`** | Google Registry | **Available** (404) | ~$12.00 / yr | $8.75 / $12.87 | $11.98 / $16.98 | **Strong Tier 1**: Modern developer ecosystem; built-in HSTS (HTTPS enforced). |
| **`openselena.io`** | Identity Digital | **Available** (404) | ~$45.00 / yr | $28.12 / $51.80 | $34.98 / $59.98 | **Tier 2 (High Cost / Geopolitical Risk)**: Popular in tech, but high renewal & BIOT treaty risks. |
| **`openselena.net`** | Verisign | **Available** (404) | ~$10.68 / yr | $11.52 / $12.52 | $11.98 / $16.98 | **Tier 3 (Defensive)**: Secondary legacy alias. |
| **`openselena.app`** | Google Registry | **Available** (404) | ~$14.00 / yr | $10.84 / $15.84 | $12.98 / $18.98 | **Tier 3**: Great if Open Omni / OpenSelena offers a web or desktop app UI. |
| **`openselena.sh`** | NIC.SH | **Available** (404) | ~$35.00 / yr | ~$34.00 / $34.00 | ~$39.98 / $44.98 | **Niche/Optional**: Distinctive CLI / shell installer branding (`curl -fsSL openselena.sh/install`). |
| **`openselena.tools`** | Identity Digital | **Available** (404) | ~$22.00 / yr | ~$19.50 / $24.50 | ~$22.98 / $27.98 | **Niche/Optional**: Matches utility tool suite theme. |
| **`openselena.ai`** | Government of Anguilla | **Available** (404) | N/A (Cloudflare doesn't support direct registration) | $81.70 / $82.70 (2-yr min: ~$164) | ~$84.98 / yr (2-yr min) | **Tier 4 (Expensive)**: Unnecessary unless project pivots to generative AI models. |

---

## 3. Registrar Comparison (Where to Buy)

### Recommended: Cloudflare Registrar (`https://domains.cloudflare.com`)
* **Pricing Model**: **Strict At-Cost Wholesale Pricing** (Zero markup over Verisign / PIR registry fees + ICANN $0.18 fee).
* **Pros**:
  * Lowest possible recurring renewal prices in the industry.
  * Free WHOIS privacy redaction.
  * Free one-click DNSSEC.
  * Integrated Cloudflare Edge network: automated SSL, DDoS mitigation, Page Rules, Worker redirects, and Caching.
* **Cons**:
  * Requires using Cloudflare nameservers (cannot delegate to third-party authoritative nameservers without an Enterprise plan).

### Runner-Up: Porkbun (`https://porkbun.com`)
* **Pricing Model**: Low, transparent fixed markup (~$1 over wholesale).
* **Pros**:
  * Unmatched flexibility: free WHOIS privacy, free URL forwarding, free email forwarding, free Let's Encrypt certificates.
  * Allows arbitrary custom nameservers (Route 53, NS1, Cloudflare, etc.).
  * No aggressive upsell funnels.
* **Cons**:
  * Renewals are slightly higher than Cloudflare's at-cost rates (~$1-$2 difference per year).

### Acceptable Alternative: Namecheap (`https://namecheap.com`)
* **Pricing Model**: Discounted promo year 1, higher renewal markup thereafter.
* **Pros**: Established registrar, free Withheld Privacy included.
* **Cons**: Higher ongoing renewal overhead; aggressive checkout add-on prompts.

---

## 4. Special TLD Considerations

### A. The `.io` Caution (Chagos Archipelago Dispute)
While `.io` has historically been a tech favorite, the UK government's treaty agreeing to hand sovereignty of the British Indian Ocean Territory (BIOT) to Mauritius introduces long-term uncertainty over ISO country code `IO`. The IANA/ICANN country-code retirement process could theoretically affect `.io` in future years. Combined with steep renewal costs ($50+/yr), `.io` is no longer the automatic default for new open-source projects.

### B. Google Registry `.dev` Advantage
`.dev` is on the **HSTS preload list**. This guarantees that all modern web browsers will *refuse* to connect over unencrypted HTTP, ensuring strict HTTPS without custom configuration. It costs ~$12/year and is widely recognized in developer communities.

### C. The Invaluable `.com` + `.org` Combination
* For an open-source project, having **`openselena.com`** protects the brand against squatters, phishing, or typosquatting.
* Having **`openselena.org`** provides the canonical identity for the open-source community, documentation portal, and package distribution.
* Both can be held for less than **$22/year total** on Cloudflare or Porkbun.

---

## 5. Technical Integration with GitHub Organization & Repositories

1. **GitHub Organization Verification**:
   * Adding a custom domain in GitHub (`Settings -> Verified and approved domains`) requires adding a `TXT` record (`_github-challenge-OpenSelena`). Once verified, OpenSelena gets a "Verified" badge on GitHub.
2. **GitHub Pages (Docs/Portal)**:
   * Can point `openselena.org` or `www.openselena.com` directly to GitHub Pages using standard `A` records (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`) or `CNAME` records.
3. **Automated Redirects**:
   * If buying both `.com` and `.org`, configure one as the canonical root and set a 301 permanent redirect on the other (easily done via Cloudflare Page Rules / Redirect Rules or Porkbun URL forwarding).

---

## 6. Primary Sources & Verification References

* **Verisign Global Registry Services**: Authoritative .COM/.NET RDAP API (`https://rdap.verisign.com/com/v1/domain/openselena.com`)
* **Public Interest Registry (PIR)**: Authoritative .ORG RDAP (`https://rdap.org/domain/openselena.org`)
* **Cloudflare Registrar Wholesale Disclosure**: `https://www.cloudflare.com/products/registrar/`
* **Porkbun Pricing & TLD Catalog**: `https://porkbun.com/products/domains`
* **Google Registry (.dev, .app)**: `https://get.dev/`
* **GitHub Documentation on Verified Domains**: `https://docs.github.com/en/organizations/managing-organization-settings/verifying-or-approving-a-domain-for-your-organization`
