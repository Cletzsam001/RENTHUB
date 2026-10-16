# RentIt Owner Dashboard — Equipment API integration

## Connected files

- `RentHub/Equipment/Equipment.js`: loads the live equipment list and filters it to the owner ID in the saved JWT; maps backend statuses and fields to the dashboard UI; equipment cards open the details page.
- `RentHub/Equipment/add-equipment.js`: loads categories from the live Category API. The first step and images stay in browser session storage because the current backend has no draft endpoint.
- `RentHub/Equipment/add-equipment2.js`: keeps step-two draft data in browser session storage because the current backend has no draft endpoint or locations endpoint.
- `RentHub/Equipment/listing-preview.js`: creates the final equipment record through the live Equipment API and uploads images through the existing upload route.
- `RentHub/Equipment/equipment-details.js`: fetches one equipment item and updates availability using the existing API routes.
- `renthub-user-equipment-data.js`: loads published, available equipment from `GET /equipment/getall` for renter browse, details, checkout, and dashboard views; it no longer reads `renthub_listings` from localStorage.
- `RentHub/owner-dashboard/owner_dashboard.js`: filters `GET /equipment/getall` by the owner ID in the saved JWT and renders that owner's live listings and status counts.

## Base URL and routes used

Base URL: `https://rentit-5zbv.onrender.com`

- `GET /category/getall`
- `GET /equipment/getall`
- `GET /equipment/getone/:id`
- `POST /equipment/create`
- `POST /equipment/upload/:id` (multipart field name: `images`, maximum 5 files)
- `PATCH /equipment/update/:id`

## Login expectation

The dashboard reads the JWT from `localStorage` under the key `ownerToken`. The token payload must include `id` and `role: "owner"`. The login page in this supplied dashboard archive does not implement the Auth/KYC login flow, so the authentication frontend must save the successful login token under that key.

## Backend limitation — important

The supplied Equipment backend does **not** currently enforce JWT authentication or owner-level authorization on create/update/delete/upload routes, and it has no `GET /equipment/mine` route. The dashboard filters the public `/equipment/getall` result by the owner ID in the token, and sends that owner ID when creating a record, but this is a frontend integration only—not a security boundary. The backend routes/controllers must be protected server-side before treating the owner management operations as secure in production.

The backend also has no draft, location, or logout endpoint. For that reason, the two-step listing draft stays in `sessionStorage`; the actual record is created only when the owner submits the preview. Category and equipment APIs are mounted at `/category` and `/equipment`, not under `/api`.

## Approval workflow dependency

Equipment appears in renter browse only when the Equipment API returns `status: "published"` or `"approved"` and `availability` is not false. Submitted and unavailable listings remain hidden from renters but are visible to their owner.

The RentIt backend now exposes `GET /api/kyc/me` and `POST /api/kyc` for authenticated users, plus `GET /api/admin/kyc` and `PUT /api/admin/verify-user/:id` for admins. The admin routes require an admin JWT, and the KYC status/details are stored on the MongoDB user record. Deploy the backend changes before expecting the hosted frontend to use these routes.
