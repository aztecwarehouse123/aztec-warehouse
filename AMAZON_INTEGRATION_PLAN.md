# Amazon Integration — Full Plan & Progress Tracker

This document is the single source of truth for **Selling Partner API (SP-API)** integration with the Aztec WMS. Update checkboxes as work completes so future reviews stay accurate.

**Last reviewed:** _set when you review_

---

## How to use this doc

- `[ ]` = not started or in progress  
- `[x]` = done (update date in **Progress log** at bottom)  
- **Blocked** items: note owner and dependency in Progress log  

---

## 1. Goals & scope

### 1.1 Product goals

- Connect a seller’s **Amazon account** to the WMS (OAuth).
- Surface **orders** and operational states aligned with Amazon (with clear FBA vs FBM behavior).
- **FBM**: support **pick → pack → confirm shipment** (including sending shipment confirmation to Amazon).
- **FBA**: reflect Amazon-handled fulfillment; no shipment confirmation from WMS for Amazon’s leg.
- **Pull-based sync** with sensible intervals (see §6).
- **Notifications** where SP-API supports near–real-time updates (see §7).
- Robust **auth**, **rate-limit** handling, and **ASIN/SKU mapping** between Amazon and WMS inventory.

### 1.2 Out of scope (unless explicitly added later)

- Multi-tenant marketplace aggregator UI polish (phase after first marketplace works).
- Replacing Firestore entirely (optional future; see §3).

---

## 2. Architecture decision

### 2.1 Separate backend (required)

| Approach | Verdict |
|----------|---------|
| SP-API from React only | **Reject** — secrets, signing, token refresh, and restricted data cannot live in the browser. |
| Dedicated integration service | **Adopt** — Node/TS (or Python) API + workers + queue + scheduler. |

**Recommended layout**

- **Frontend (existing):** React + Vite; new pages under `src/pages/AmazonIntegration/` (or similar); routes in `App.tsx`.
- **Backend (new):** REST or tRPC-style internal API consumed only by your WMS (and admin tools).
- **Data:** Start with Firestore collections for normalized Amazon entities **or** introduce PostgreSQL for orders-heavy workloads; document choice in §12.

**Flow:** Amazon ↔ **Backend** ↔ **DB** ↔ **WMS UI** (never UI → Amazon directly).

---

## 3. Amazon-side prerequisites (before any code connects)

Use **Selling Partner API (SP-API)** — not legacy MWS for new work.

- [ ] Professional seller account (or clear client account) for target marketplace(s).
- [ ] Developer profile / SP-API application registered in Seller Central.
- [ ] Application LWA credentials (client id/secret) stored only on backend (secret manager / env).
- [ ] OAuth redirect URIs registered (HTTPS, match backend routes).
- [ ] Request only **minimum roles** (orders, inventory, reports, notifications as needed).
- [ ] If **buyer PII** or shipping labels are required: plan **restricted data** compliance (policies, encryption, access logging).
- [ ] Document **marketplace IDs** and **SP-API regional endpoints** (NA/EU/FE) for phase 1.

---

## 4. Modules & screens (WMS)

### 4.1 Amazon Integration page (hub)

- [ ] **Connection status:** connected / disconnected / token error / permission missing.
- [ ] **Connect / reconnect / disconnect** (OAuth entry points).
- [ ] **Marketplace & seller** summary (seller id, primary marketplace).
- [ ] **Sync status:** last successful orders sync, last inventory sync, next scheduled run (if exposed).
- [ ] **Manual sync triggers** (orders, inventory) with rate-limit awareness (queued jobs, not blind spam).
- [ ] **Link to** Orders, Fulfillment, Mapping, Logs.

### 4.2 Orders module

**Tabs (align with Amazon order lifecycle; exact API field mapping in implementation doc):**

- [ ] **Pending** — orders not yet in a terminal state; definition locked in mapping table (§9).
- [ ] **Unshipped** — requires warehouse action (especially FBM).
- [ ] **Shipped** — confirmed shipped / Amazon-reported shipped per channel.
- [ ] **Cancelled** — cancelled on Amazon.

**Order list columns (suggested):** Amazon Order ID, status, purchase date, fulfillment channel (FBA/MFN), order total, marketplace, last updated from sync.

**Order detail view:**

- [ ] **Order header:** IDs, dates, status, fulfillment type, order-level totals.
- [ ] **Items list:** SKU, ASIN, title, qty, price, item status if available.
- [ ] **Buyer info:** only what SP-API returns and your compliance tier allows; mask where required.
- [ ] **Shipping method / service** (when exposed by API for the order).

**Backend:** normalized `amazonOrders` + `amazonOrderItems`; idempotent upsert by Amazon order id + marketplace.

### 4.3 Fulfillment module (FBM-focused)

**Principle:** For **FBA**, Amazon handles shipping; WMS shows status and may link to inventory/reconciliation. For **FBM (MFN)**, WMS must drive **confirm shipment** to Amazon when the package ships.

- [ ] **Eligibility:** only FBM orders appear in actionable fulfillment queues (or FBA with exceptions if you add them later).
- [ ] **Pick:** integrate with existing **Jobs** page — create or attach pick jobs from order lines; use **SKU/ASIN mapping** (§9) to resolve WMS stock rows.
- [ ] **Pack:** capture package dimensions/weight if required by carrier workflow (optional phase).
- [ ] **Confirm shipment:** collect carrier code, tracking id, ship date; call SP-API **confirm shipment** (exact operation name per SP-API version); handle partial shipments if supported.
- [ ] **Post-confirm:** update local order state; write **activity/audit** log; refresh order via sync or notification.

**FBA note:** No “confirm shipment” from WMS for Amazon’s fulfillment network; display inbound/outbound status from reports/APIs if you add that phase.

### 4.4 Supporting screens

- [ ] **Sync / job logs:** failures, retries, 429s, last cursor.
- [ ] **Mapping admin:** ASIN ↔ seller SKU ↔ WMS product/stock key.
- [ ] **Settings:** sync intervals (within agreed bands), enabled marketplaces, feature flags.

---

## 5. Pull-based sync strategy

| Resource | Target interval | Notes |
|----------|-----------------|-------|
| **Orders** | Every **5–10 minutes** | Incremental by `LastUpdatedAfter` / reporting cursor; idempotent upserts. |
| **Inventory** | Every **30–60 minutes** | Listings / inventory reports or Inventory API per chosen approach; watch throttles. |

- [ ] Scheduler (cron, Cloud Scheduler, or worker cron) triggers **sync jobs**, not the UI timer alone.
- [ ] **Backfill** job for initial connect (e.g. last 30/90 days) with pagination and rate limits.
- [ ] **Cursor / watermark** stored per seller + marketplace + resource type.
- [ ] On failure: exponential backoff; dead-letter after N tries; alert in UI.

---

## 6. Notifications API (SP-API)

- [ ] Subscribe to relevant **notification types** (e.g. order status, fulfillment) per SP-API docs for your regions.
- [ ] **Inbound webhook** (HTTPS) on backend: verify signature/source per Amazon docs; enqueue event for processing.
- [ ] **Idempotent** processing (notification id / dedupe key).
- [ ] Fallback: polling still runs on schedule if notifications lag or fail.

---

## 7. Auth (Amazon + WMS)

### 7.1 Amazon (SP-API / LWA)

- [ ] OAuth **authorization code** flow; store **refresh token** encrypted at rest.
- [ ] Access token refresh before expiry; single-flight refresh to avoid stampede.
- [ ] **Disconnect** revokes local tokens and stops schedulers for that seller.

### 7.2 WMS integration permissions

- [ ] Role-gated routes: who can connect Amazon, trigger sync, view buyer data, confirm shipment.
- [ ] Audit log for: connect, disconnect, manual sync, shipment confirm, mapping changes.

**Note:** Current WMS `AuthContext` is Firestore username/password — integration admin actions should be restricted to `admin`/`manager` (or stricter) regardless of future auth upgrades.

---

## 8. Rate limits & reliability

- [ ] Central **SP-API client** with: retries, **429** handling, `x-amzn-RateLimit-*` awareness where applicable.
- [ ] **Request budget** per seller; queue bursts instead of parallel fan-out.
- [ ] Structured logging: endpoint, seller id, correlation id, throttle wait time.
- [ ] Metrics: sync lag, error rate, queue depth (optional but recommended).

---

## 9. Mapping logic (ASIN, SKU)

Amazon identifiers:

- **ASIN** — marketplace listing identifier.  
- **Seller SKU** — seller’s SKU on the listing (critical for inventory and fulfillment).

WMS mapping:

- [ ] Table/collection: `amazonListingMap` or equivalent:  
  `sellerId`, `marketplaceId`, `asin`, `sellerSku`, `wmsProductId` (or internal stock key), optional barcode.
- [ ] **Conflict rules:** one seller SKU maps to one WMS product; document merge/split cases.
- [ ] **Jobs / pick:** resolve order line → `sellerSku` / ASIN → WMS location/stock using this map; flag **unmapped** lines in UI.
- [ ] Optional: import mapping CSV or sync from listings report.

---

## 10. FBA vs FBM behavior summary

| Channel | Who ships | WMS shipment confirm to Amazon |
|---------|-----------|--------------------------------|
| **FBA** | Amazon | **No** (Amazon handles) — show status, reconcile inventory separately. |
| **FBM (MFN)** | Seller / warehouse | **Yes** — pick/pack then **confirm shipment** with carrier + tracking. |

Document any hybrid cases (e.g. Multi-Channel Fulfillment) if you add them later.

---

## 11. Data model (backend / Firestore or SQL)

Suggested entities (names indicative):

- [ ] `amazonAccounts` — seller connection, marketplace defaults.  
- [ ] `amazonCredentials` — encrypted refresh token, metadata.  
- [ ] `amazonOrders`, `amazonOrderItems` — normalized orders.  
- [ ] `amazonSyncState` — cursors, last success time per resource.  
- [ ] `amazonSyncJobs`, `amazonSyncJobLogs` — job runs and errors.  
- [ ] `amazonNotifications` — raw + processed notification audit.  
- [ ] `amazonListingMap` — ASIN/SKU ↔ WMS (§9).  
- [ ] `fulfillmentTasks` — link orders to Jobs/pick workflow (FBM).

---

## 12. Implementation phases & checklists

### Phase 0 — Discovery & sign-off

- [ ] Confirm first marketplace (e.g. US) and FBA vs FBM mix.
- [ ] Confirm read-only vs shipment-confirm scope for v1.
- [ ] Choose DB strategy (Firestore-only vs add PostgreSQL).
- [ ] Security review note for PII/restricted data.

### Phase 1 — Backend foundation

- [ ] New service repo or `backend/` in monorepo; CI, env, secrets.
- [ ] OAuth callback + token storage (encrypted).
- [ ] Health: `GET /integrations/amazon/health`.
- [ ] Internal auth between WMS UI and backend (session/JWT/API key — decide and document).

### Phase 2 — Orders pull + UI

- [ ] Orders sync job (5–10 min) + manual trigger.
- [ ] API: list orders by tab filters (pending / unshipped / shipped / cancelled).
- [ ] UI: Orders module with tabs + order detail (items, buyer, shipping method per API).
- [ ] Status mapping table implemented and tested.

### Phase 3 — Fulfillment (FBM) + Jobs

- [ ] Create/link **Jobs** from order lines (mapping §9).
- [ ] Pack step (minimal v1: confirm qty packed).
- [ ] **Confirm shipment** to Amazon; handle errors and retries.
- [ ] Audit log entries for each confirm.

### Phase 4 — Inventory pull

- [ ] Inventory sync job (30–60 min) + manual trigger.
- [ ] Reconciliation view (optional v1: read-only deltas).

### Phase 5 — Notifications

- [ ] Register subscriptions; webhook endpoint; dedupe + process.
- [ ] Reduce effective lag vs polling where possible.

### Phase 6 — Hardening

- [ ] Monitoring, alerts, runbooks.
- [ ] Load test sync with large order volume.
- [ ] Documentation for operators (reconnect, common errors).

---

## 13. Frontend file / route sketch (for implementers)

- [ ] `src/pages/AmazonIntegration/index.tsx` — hub.  
- [ ] `src/pages/AmazonOrders/index.tsx` — tabs + list + detail.  
- [ ] `src/pages/AmazonFulfillment/index.tsx` — FBM queue + pick/pack/confirm.  
- [ ] `src/pages/AmazonMapping/index.tsx` — ASIN/SKU map admin.  
- [ ] Routes + `ProtectedRoute` in `src/App.tsx` (roles: admin/manager at minimum for integration).

---

## 14. Risks & open decisions

- [ ] **Restricted data** — may block buyer address until approved; plan UI placeholders.  
- [ ] **Throttle storms** — must use queue + backoff (§8).  
- [ ] **Status parity** — Amazon statuses ≠ your tabs; maintain explicit mapping (§9 + order module).  
- [ ] **Current WMS auth** — not production-grade; integration secrets must not depend on frontend trust alone.

---

## 15. Progress log (completed / pending snapshot)

_Update this section when phases complete._

| Date | Item | Status |
|------|------|--------|
| _yyyy-mm-dd_ | Plan doc created | Done |
| | Backend service scaffold | Pending |
| | SP-API OAuth + token store | Pending |
| | Orders sync (5–10 min) | Pending |
| | Orders UI (4 tabs + detail) | Pending |
| | FBM fulfillment + Jobs link | Pending |
| | Confirm shipment to Amazon | Pending |
| | Inventory sync (30–60 min) | Pending |
| | Notifications webhook | Pending |
| | Mapping UI + data (ASIN/SKU) | Pending |
| | Rate limit + monitoring hardening | Pending |

---

## 16. References (for implementers)

- Amazon SP-API documentation (Orders API, Feeds/Notifications, Fulfillment Outbound as applicable).  
- LWA (Login with Amazon) OAuth for SP-API authorization.  
- Internal: `src/types/index.ts` for WMS `StockItem` (ASIN, barcode, location fields) — align mapping (§9) with existing inventory model.

---

_End of document._
