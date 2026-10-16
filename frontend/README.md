# RentHub Frontend

Plain HTML / CSS / JS (Tailwind via CDN). No build step.

## Structure

```
frontend/
├── index.html            # redirects to onboarding/index.html
├── onboarding/           # sign-up, login, KYC flow (renter + owner)
│   ├── index.html
│   ├── css/onboarding.css
│   └── js/  onboarding.js, identity-document-checks.js
├── user/                 # renter dashboard
│   ├── pages/            # dashboard, equipment-explorer, my-rentals, checkout, ...
│   ├── css/  js/
├── owner/                # equipment owner dashboard
│   ├── pages/            # dashboard, equipment, add-equipment, booking, finance, payout, profile, ...
│   ├── js/               # one .js per page (same name as the page)
│   └── data/             # mock .json used by each page
├── admin/                # admin panel
│   ├── pages/            # dashboard, users, kyc-review, payments, disputes, ...
│   ├── css/admin.css
│   └── js/  interactions.js, kyc.js
├── assets/
│   ├── icons/            # ONE shared copy of every .svg (was copied 4x)
│   └── images/
├── docs/                 # EQUIPMENT-API-INTEGRATION.md
└── _legacy/              # old duplicates, safe to delete after a check
```

Rule of thumb: every app has `pages/`, `css/`, `js/`. A page's script has the same name as the page
(`owner/pages/booking.html` -> `owner/js/booking.js`). Shared icons live only in `assets/icons/`.

## Run locally

The pages `fetch()` local JSON files, so open them through a server, not by double-click:

```
python -m http.server 5500      # then open http://localhost:5500
```

(or VS Code Live Server on `index.html`)

## Known issues carried over from the old folder

These were already broken before the reorganisation:

- Admin pages link to `index.html` (logout/home) but admin has no index page.
- Owner pages link to pages that don't exist yet: `deposit`, `dispute`, `reviews`/`review`, `bookings`, `support`.
- Missing placeholder images: `camera.png`, `canon-eos-r6.png`, `kehinde-ayo.jpg`, `owner-avatar.jpg`, `equipment-image.jpg`; icons `calendar.svg`, `chevron-left.svg`, `close.svg`.
- `owner/js/add-equipment2.js` tries to load `locations.json`, which doesn't exist.
- `owner/data/_unused/` holds two JSON files nothing loads.
- `user/js/shared-sidebar.js` is not loaded by any page.
