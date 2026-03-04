# SKU Cost Intelligence Tool

Material-driven costing engine for wardrobes, TV units, and furniture SKUs.
React + Vite, styled to match the Pulse v7 design system.

## Features

- **SKU Catalog** — Browse, search, filter, sort. CSV import/export.
- **Quick Calculator** — Live cost estimation with per-panel material assignment.
- **Cost Analytics** — Portfolio margin analysis, category performance.
- **Price Configuration** — Edit materials, accessories, commercial terms.

## Calculation Engine

Implements the spec with full traceability:
- Per-panel material assignment (body, back, door)
- Area grouping by material_id, sheet count always rounded UP
- Edge banding per exposed front edge
- Accessories conditional on door type / sliding / mirror
- Independent commercial engine (commission + VAT + margin)

## Quick Start

```bash
npm install
npm run dev
```

Works in demo mode without Supabase (in-memory with sample data).

## Deploy to Vercel

1. Push to GitHub
2. Connect in vercel.com
3. Optionally set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
4. Deploy

## Supabase Setup (for persistence)

1. Create a Supabase project
2. Run `supabase/schema.sql` in the SQL Editor
3. Copy URL and anon key to `.env`
