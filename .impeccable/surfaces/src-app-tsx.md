---
version: 1
slug: "src-app-tsx"
primary_target: "src/App.tsx"
related_targets: ["src/pages/Home.tsx"]
---

# DineChain web (guest site + restaurant app)

Scope: the whole front end. Guest site at the root (home with the menu, table-QR ordering, web takeaway and its tracking): mode Persuade on the home page, Operate on the ordering pages. Restaurant app under /nha-hang (login, POS, kitchen display, manager, chain owner, stock, QR codes): mode Operate, working layouts and flows kept as they are.

Audience and job: guests on their phone at the table or ordering takeaway; staff on tablets at peak hours; managers and the owner on laptops. Vietnamese UI, VND tabular numerals, status never by colour alone, large touch targets on POS and kitchen. Cash for counter orders; transfer only for web takeaway.

Visual reference pinned by the user: pizza4ps.com/vn, borrowed as a style (palette, type, composition, buttons), never its logo, name, photos or copy. Imagery: royalty-free food photos (Unsplash) for the home and login heroes, dish photos from each dish's image link; no photo means a typographic row.

## Direction contract

THESIS: A modern Vietnamese restaurant house, warm cream and deep navy, where large condensed serif type and food photography carry the brand and everything else is quiet grotesk. Refuses the chalkboard skin and the grey SaaS POS.

OWN-WORLD: Cream ground #f4f2ef, sand panels #e8e1d5, deep navy #232c4f for ink, rail and full-colour blocks, royal blue #2347a6 for the one accent (links, selection, counters), hairline rules #cfc8bc. Condensed serif display (Noto Serif Display, narrow width) for headings, prices, table numbers, totals and codes; Be Vietnam Pro for all UI text, uppercase small labels. Controls: oval outline buttons with condensed serif caps for guest calls to action, solid navy pills for the one primary action on staff screens. Flat surfaces, hairline borders, almost no shadow.

STORY: A guest sees the food and the two ways to eat (at the table by scanning, or takeaway), browses the menu, and orders in seconds. Staff see the same house in their tools without losing a tap.

FIRST VIEWPORT: Home: full-bleed food photo, white wordmark and links over it, bottom-left a stacked giant serif list "Ăn tại quán / Mang về / Thực đơn" (each a link, the first lit), bottom-right a royal-blue panel counting the branches open for takeaway in boxed serif digits. Mobile: same stack, fixed bottom bar with three actions. Staff POS: navy rail, cream work area, floor tiles with serif table numbers, cream order column with serif totals.

FORM: user-pinned reference world (pizza4ps.com/vn), no seed roll. Signature move: the serif counter, boxed condensed digits used for live numbers (branches open, totals, order codes, kitchen counts); and the clean navy strike across sold-out or cancelled dishes.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
