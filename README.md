# BAGDigital Website

Public website source for `bagdigital.tech`.

## Repository status

This repository currently contains the deployed public BAGDigital website and its GitHub Pages custom-domain configuration.

BAGDigital company strategy, product availability, roadmap, and portfolio truth live in:

- `BAG-Digital/bagdigital-company`
- `BAG-Digital/bagdigital-core`

Repository ownership/classification is being reconciled separately. Do not treat website copy as the authoritative product roadmap.

## Website claims

Public copy should distinguish:

- **Available** — actually delivered/usable capability;
- **Development** — active implementation with evidence;
- **Roadmap** — planned capability.

Do not market roadmap features as available.

## Domain

The GitHub Pages `CNAME` should contain only the canonical custom domain:

```text
bagdigital.tech
```

DNS aliases such as `www` should be managed in DNS/provider configuration rather than by adding extra lines to the CNAME file.

## Development

The site is a static HTML/CSS/JavaScript site.

Before merging changes:

- verify navigation and contact flow;
- verify mobile layout;
- avoid committing secrets or private customer data;
- keep public claims aligned with current company evidence.
