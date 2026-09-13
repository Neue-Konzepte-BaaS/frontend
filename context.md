# context.md

What we're building and why. Read this before writing features. (Product docs
live in `../Portfolio/` and are in German; the app itself is in **English**.)

## Product

**Bauer as a Service (BaaS)** — a B2B SaaS, *"Shopify for pick-your-own farms."*

Small and mid-size farms rent out self-harvest plots ("Parzellen") but manage
them with Excel, paper, and WhatsApp. BaaS is the software behind the farm: it
manages the full lifecycle of a rented plot — who rents which plot, for how long,
what's planted, when it's ripe, and how the farm talks to its renters. The farm
keeps its own brand and customer relationship; we only provide the tooling.

## Roles

- **System admin** (us) — full system oversight.
- **Admin / Farmer** — full management of their farm's plots, tenants, and messages.
- **Tenant / Renter** — limited view: their own plot, rental data, notifications.

## MVP (must-have)

- **Plot planner** — overview of all plots with status: free / rented / to whom / period.
- **Tenants** — create tenants and assign them to a plot (or a request → approve flow).
- **Ripeness push** — farmer marks "Plot X: crop Y is ripe" → notify assigned tenants.
- **Bulletin board** — one announcement reaches all tenants of a farm (replaces group chats).
- **Tenant view** — own plot, rental dates, status, received notifications.
- **Care guide** — automated seasonal tips per plot ("weed this week").

## Later (not MVP)

Watering/care plans per plot · digital handover docs (season start/end) ·
payments & reminders · native app.

## Who we design for

- **Farmers** are often non-technical → the UI must be simple and obvious.
- **Tenants** are mobile-first and span a wide range:
  - IT-savvy, wants everything digital and fast, no phone calls.
  - Accessibility-first elderly: **large type, high contrast, few steps**, email as an option.

## Non-functional

Simple UI · mobile usable · accessible. These are requirements, not nice-to-haves.
