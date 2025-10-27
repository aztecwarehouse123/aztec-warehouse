# Marketplace Integration Implementation Plan
**Amazon, eBay & Shopify API Integration**

---

## 📋 Project Overview

**Objective**: Integrate Amazon, eBay, and Shopify APIs to enable automatic order import, order management, and real-time inventory synchronization from the warehouse management system.

**Integration Type**: 
- ✅ Import orders from marketplaces (automatic/real-time)
- ✅ Manage orders within warehouse app
- ✅ Sync inventory: One-way (Warehouse → Marketplaces)
- ✅ Real-time updates via webhooks

**Timeline**: 22-28 days (~1 month)

**Status**: 🔴 Not Started - Awaiting client marketplace credentials

---

## 🏗️ Architecture Overview

### System Design

```
┌─────────────────────────────────────────────────────────────┐
│                    MARKETPLACE PLATFORMS                     │
│         Amazon Seller Central | eBay | Shopify Admin        │
└───────────────────┬─────────────────────────┬───────────────┘
                    │ Webhooks (Real-time)    │ API Calls
                    ↓                         ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND API SERVER                        │
│              (Node.js/Express + TypeScript)                  │
│  - Authentication & Security                                 │
│  - Marketplace API Integration                               │
│  - Webhook Handlers                                          │
│  - Business Logic                                            │
└───────────────────┬─────────────────────────────────────────┘
                    │ Firebase Admin SDK
                    ↓
┌─────────────────────────────────────────────────────────────┐
│                   FIREBASE FIRESTORE                         │
│  - orders (with marketplace fields)                          │
│  - inventory (with marketplace listings)                     │
│  - marketplaceSettings (API credentials)                     │
│  - syncLogs (tracking all syncs)                             │
└───────────────────┬─────────────────────────────────────────┘
                    │ Real-time listeners
                    ↓
┌─────────────────────────────────────────────────────────────┐
│                    REACT FRONTEND                            │
│              (Current Warehouse App - No Major Changes)      │
│  + New: MarketplaceOrders page                               │
│  + New: MarketplaceSettings page                             │
│  + Enhanced: Orders page with marketplace badges             │
│  + Enhanced: Stock page with sync buttons                    │
└─────────────────────────────────────────────────────────────┘
```

### Why Backend is Needed

Firebase client SDK cannot directly call marketplace APIs because:
- API secrets must stay server-side (security)
- Marketplace APIs require server-to-server authentication
- Webhook endpoints need public URLs
- Complex OAuth flows need secure token storage

**Solution**: Lightweight Node.js backend (can use free hosting)

---

## 📁 File Structure

### Backend (New - To Be Created)

```
backend/
├── src/
│   ├── config/
│   │   ├── firebase.js              # Firebase Admin SDK initialization
│   │   ├── amazon.js                # Amazon SP-API configuration
│   │   ├── ebay.js                  # eBay API configuration
│   │   └── shopify.js               # Shopify API configuration
│   │
│   ├── services/
│   │   ├── amazonService.js         # Amazon order fetching, inventory updates
│   │   ├── ebayService.js           # eBay order fetching, inventory updates
│   │   ├── shopifyService.js        # Shopify order/inventory via GraphQL
│   │   └── syncService.js           # Unified sync orchestration
│   │
│   ├── controllers/
│   │   ├── orderController.js       # Order sync endpoints
│   │   │   - GET /api/orders/sync/:marketplace
│   │   │   - POST /api/orders/update-status
│   │   ├── inventoryController.js   # Inventory sync endpoints
│   │   │   - POST /api/inventory/sync
│   │   │   - POST /api/inventory/sync-all
│   │   └── settingsController.js    # Credentials management
│   │       - POST /api/settings/marketplace
│   │       - GET /api/settings/marketplace/:platform
│   │
│   ├── webhooks/
│   │   ├── amazonWebhook.js         # Handle Amazon SQS notifications
│   │   ├── ebayWebhook.js           # Handle eBay notifications
│   │   └── shopifyWebhook.js        # Handle Shopify webhooks
│   │
│   ├── middleware/
│   │   ├── auth.js                  # Verify Firebase ID tokens
│   │   ├── errorHandler.js          # Global error handling
│   │   └── rateLimiter.js           # Prevent API abuse
│   │
│   ├── utils/
│   │   ├── logger.js                # Winston logging
│   │   ├── encryption.js            # Encrypt API credentials
│   │   └── validator.js             # Input validation
│   │
│   └── index.js                     # Express app entry point
│
├── tests/
│   ├── amazon.test.js
│   ├── ebay.test.js
│   └── shopify.test.js
│
├── package.json
├── .env.example                     # Template for environment variables
├── .gitignore
├── Dockerfile                       # For containerized deployment
└── README.md                        # Backend setup instructions
```

### Frontend (Enhancements to Existing)

```
src/
├── config/
│   └── api.ts                       # NEW: Backend API endpoints
│       - export const API_BASE_URL
│       - export const ENDPOINTS = { orders: {...}, inventory: {...} }
│
├── services/
│   └── marketplace/                 # NEW: Marketplace services
│       ├── amazonService.ts         # Frontend Amazon API wrapper
│       ├── ebayService.ts           # Frontend eBay API wrapper
│       ├── shopifyService.ts        # Frontend Shopify API wrapper
│       └── syncService.ts           # Unified sync service
│           - syncInventoryToMarketplaces()
│           - fetchMarketplaceOrders()
│           - updateOrderStatus()
│
├── types/
│   └── marketplace.ts               # NEW: Marketplace type definitions
│       - MarketplaceOrder
│       - MarketplaceListing
│       - SyncStatus
│       - MarketplaceCredentials
│
├── pages/
│   ├── MarketplaceOrders/          # NEW: Dedicated marketplace orders page
│   │   └── index.tsx
│   │       - Display orders from all platforms
│   │       - Filter by marketplace
│   │       - Bulk actions (mark as shipped)
│   │
│   └── MarketplaceSettings/        # NEW: API credentials configuration
│       └── index.tsx
│           - Secure input for API keys
│           - Test connection buttons
│           - Save credentials to Firestore
│
├── components/
│   └── marketplace/                # NEW: Marketplace components
│       ├── OrderSyncCard.tsx       # Display marketplace order
│       ├── SyncStatusBadge.tsx     # Show sync status (synced/pending/error)
│       ├── MarketplaceSelector.tsx # Dropdown to select platform
│       └── InventorySyncButton.tsx # Manual sync trigger
│
└── pages/ (Enhanced Existing)
    ├── Orders/index.tsx            # MODIFY: Add marketplace badge, filters
    └── Stock/index.tsx             # MODIFY: Add sync buttons, last synced time
```

---

## 🔌 Marketplace API Details

### Amazon Seller Partner API (SP-API)

**API Documentation**: https://developer-docs.amazon.com/sp-api/

**Authentication**: OAuth 2.0 with refresh tokens (LWA - Login with Amazon)

**Key Endpoints**:
- Orders API: `/orders/v0/orders` - Fetch orders
- Fulfillment Outbound API: `/fba/outbound/2020-07-01/fulfillment/orders` - Create fulfillment orders
- Feeds API: `/feeds/2021-06-30/feeds` - Bulk inventory updates
- Notifications API: SQS/EventBridge for real-time webhooks

**Rate Limits**: Dynamic based on account performance (typically 1-10 requests/second)

**Required Credentials**:
- Client ID
- Client Secret
- Refresh Token
- AWS Access Key (for SQS notifications)
- AWS Secret Key

**SDKs**: `@sp-api-sdk/orders-api-v0`, `@sp-api-sdk/feeds-api-model`

---

### eBay Trading/Fulfillment API

**API Documentation**: https://developer.ebay.com/docs

**Authentication**: OAuth 2.0 with user tokens

**Key Endpoints**:
- Trading API: `GetOrders` - Fetch orders
- Fulfillment API: `/sell/fulfillment/v1/order/{orderId}` - Update order
- Inventory API: `/sell/inventory/v1/inventory_item/{sku}` - Update inventory

**Rate Limits**: 5,000 calls/day (free), can request increase

**Required Credentials**:
- App ID (Client ID)
- Dev ID
- Cert ID (Client Secret)
- OAuth User Token

**SDKs**: `ebay-api` (npm package)

---

### Shopify Admin API

**API Documentation**: https://shopify.dev/docs/api/admin-rest

**Authentication**: Access tokens from custom apps

**Key Endpoints**:
- REST: `/admin/api/2024-01/orders.json` - Fetch orders
- REST: `/admin/api/2024-01/inventory_levels/set.json` - Update inventory
- GraphQL: More efficient for complex queries

**Webhooks**:
- `orders/create`
- `orders/updated`
- `products/update`

**Rate Limits**: 2 requests/second (REST), cost-based (GraphQL)

**Required Credentials**:
- Shop URL (e.g., yourstore.myshopify.com)
- Admin API Access Token
- API Key & Secret (for app)

**SDKs**: `@shopify/shopify-api` (official Node.js library)

---

## 💾 Database Schema Changes

### 1. Update `orders` Collection

Add these optional fields to existing orders:

```typescript
interface Order {
  // ... existing fields ...
  
  // NEW MARKETPLACE FIELDS
  marketplace?: 'amazon' | 'ebay' | 'shopify' | 'manual';
  marketplaceOrderId?: string;        // External order ID
  marketplaceStatus?: string;         // Platform-specific status
  marketplaceOrderNumber?: string;    // Human-readable order number
  trackingNumber?: string;            // Shipping tracking
  shippingCarrier?: string;           // e.g., "UPS", "FedEx"
  lastSyncedAt?: Date;                // Last sync timestamp
  syncErrors?: string[];              // Any sync error messages
  marketplaceData?: {                 // Platform-specific extra data
    buyerEmail?: string;
    buyerUsername?: string;
    fulfillmentChannel?: 'FBA' | 'MF' | 'SFP';
    shippingAddress?: Address;
  };
}
```

### 2. Update `inventory` Collection

Add marketplace listing mappings:

```typescript
interface StockItem {
  // ... existing fields ...
  
  // NEW MARKETPLACE FIELDS
  marketplaceListings?: {
    amazon?: {
      sku: string;
      asin: string;
      fnsku?: string;              // FBA specific
      quantity: number;
      lastSynced: Date;
    };
    ebay?: {
      itemId: string;
      sku: string;
      quantity: number;
      lastSynced: Date;
    };
    shopify?: {
      productId: string;
      variantId: string;
      sku: string;
      quantity: number;
      lastSynced: Date;
    };
  };
  autoSync?: boolean;                // Enable/disable auto-sync per item
  syncPriority?: 'high' | 'normal' | 'low'; // Sync order priority
}
```

### 3. New `marketplaceSettings` Collection

Securely store API credentials (encrypted at rest):

```typescript
interface MarketplaceSettings {
  id: string;                        // Document ID = userId
  userId: string;
  
  amazon?: {
    clientId: string;
    clientSecret: string;            // Encrypted
    refreshToken: string;            // Encrypted
    sellerId: string;
    marketplaceId: string;           // e.g., "ATVPDKIKX0DER" (US)
    region: 'na' | 'eu' | 'fe';     // North America, Europe, Far East
    awsAccessKey?: string;           // For SQS notifications
    awsSecretKey?: string;           // Encrypted
  };
  
  ebay?: {
    appId: string;
    devId: string;
    certId: string;                  // Encrypted
    oauthToken: string;              // Encrypted
    oauthTokenExpiry: Date;
    refreshToken: string;            // Encrypted
    environment: 'production' | 'sandbox';
  };
  
  shopify?: {
    shopUrl: string;                 // e.g., "yourstore.myshopify.com"
    apiKey: string;
    apiSecret: string;               // Encrypted
    accessToken: string;             // Encrypted
    apiVersion: string;              // e.g., "2024-01"
  };
  
  webhookSecret?: string;            // For verifying webhook authenticity
  createdAt: Date;
  updatedAt: Date;
  lastTestedAt?: {                   // Track when credentials were tested
    amazon?: Date;
    ebay?: Date;
    shopify?: Date;
  };
}
```

### 4. New `syncLogs` Collection

Track all synchronization activities:

```typescript
interface SyncLog {
  id: string;
  userId: string;
  marketplace: 'amazon' | 'ebay' | 'shopify';
  syncType: 'order_import' | 'inventory_update' | 'order_status_update';
  status: 'success' | 'error' | 'partial';
  itemsProcessed: number;
  itemsFailed: number;
  errorMessage?: string;
  startTime: Date;
  endTime: Date;
  duration: number;                   // milliseconds
  triggeredBy: 'webhook' | 'manual' | 'scheduled';
  details?: {
    orderIds?: string[];
    skus?: string[];
    errorDetails?: Array<{
      item: string;
      error: string;
    }>;
  };
}
```

---

## 🔐 Security Considerations

### 1. Credential Storage
- **Never store in frontend**: All API secrets in backend only
- **Encrypt at rest**: Use Firebase's field-level encryption or AES-256
- **Rotate regularly**: Implement credential rotation schedule

### 2. Authentication
- **Backend endpoints**: Require Firebase ID token verification
- **Rate limiting**: Prevent abuse (express-rate-limit)
- **CORS**: Restrict to your frontend domain only

### 3. Webhook Security
- **Verify signatures**: Each platform provides signature verification
- **HTTPS only**: No plain HTTP webhooks
- **Validate payload**: Check for expected structure

---

## 📦 Implementation Phases

### Phase 1: Backend Foundation (3-4 days)

**Tasks**:
1. Initialize Node.js/Express project with TypeScript
2. Set up Firebase Admin SDK
3. Create authentication middleware (verify Firebase tokens)
4. Implement credential encryption utilities
5. Set up logging (Winston) and error handling
6. Deploy to Railway/Render (get backend URL)
7. Test basic connectivity

**Deliverables**:
- Running backend server
- Health check endpoint: `GET /health`
- Auth endpoint: `POST /api/auth/verify`

---

### Phase 2: Amazon SP-API Integration (4-5 days)

**Tasks**:
1. Implement OAuth 2.0 flow (LWA)
2. Create service methods:
   - `fetchOrders(startDate, endDate)`
   - `getOrderDetails(orderId)`
   - `updateInventory(sku, quantity)`
   - `createFulfillment(order)`
3. Set up SQS notification listener
4. Handle webhook for order updates
5. Implement rate limiting and retries
6. Test with Amazon sandbox account

**API Endpoints**:
- `POST /api/amazon/auth` - Get refresh token
- `GET /api/amazon/orders` - Fetch orders
- `POST /api/amazon/inventory/sync` - Update inventory
- `POST /webhooks/amazon` - Receive notifications

**Deliverables**:
- Amazon orders appear in Firestore
- Inventory updates reflect on Amazon
- Real-time order notifications working

---

### Phase 3: eBay API Integration (4-5 days)

**Tasks**:
1. Implement OAuth 2.0 flow
2. Create service methods:
   - `fetchOrders(filter)`
   - `getOrderDetails(orderId)`
   - `updateInventory(sku, quantity)`
   - `updateFulfillment(orderId, tracking)`
3. Set up notification webhooks
4. Handle async responses
5. Test with eBay sandbox

**API Endpoints**:
- `POST /api/ebay/auth` - OAuth flow
- `GET /api/ebay/orders` - Fetch orders
- `POST /api/ebay/inventory/sync` - Update inventory
- `POST /webhooks/ebay` - Receive notifications

**Deliverables**:
- eBay orders in Firestore
- Inventory syncs to eBay
- Order fulfillment updates working

---

### Phase 4: Shopify Integration (3-4 days)

**Tasks**:
1. Set up Shopify Admin API client
2. Create service methods (GraphQL):
   - `fetchOrders(query)`
   - `updateInventoryLevel(variantId, quantity)`
   - `fulfillOrder(orderId, tracking)`
3. Register webhooks
4. Handle webhook verification
5. Test with development store

**API Endpoints**:
- `POST /api/shopify/auth` - Get access token
- `GET /api/shopify/orders` - Fetch orders
- `POST /api/shopify/inventory/sync` - Update inventory
- `POST /webhooks/shopify` - Receive webhooks

**Deliverables**:
- Shopify orders in Firestore
- Real-time webhook processing
- Inventory syncs to Shopify

---

### Phase 5: Frontend Integration (5-6 days)

**Tasks**:
1. Create `api.ts` config with backend URL
2. Build marketplace service wrappers
3. Create MarketplaceSettings page:
   - Forms for API credentials
   - Test connection buttons
   - Save encrypted credentials
4. Create MarketplaceOrders page:
   - Display orders from all platforms
   - Filter/search by marketplace
   - Bulk actions (mark as shipped)
5. Enhance Orders page:
   - Add marketplace badge
   - Filter by marketplace
   - Show sync status
6. Enhance Stock page:
   - Add "Sync to Marketplaces" button
   - Show last synced timestamp
   - Display sync errors
7. Create reusable components:
   - SyncStatusBadge
   - MarketplaceSelector
   - InventorySyncButton

**Deliverables**:
- Users can enter API credentials
- View all marketplace orders
- Manually trigger inventory sync
- See sync status in UI

---

### Phase 6: Testing & Refinement (3-4 days)

**Tasks**:
1. End-to-end testing:
   - Place test order on each platform
   - Verify order appears in app
   - Update inventory, check marketplaces
   - Test webhook delivery
2. Error handling:
   - Network failures
   - Invalid credentials
   - Rate limit exceeded
   - Webhook verification failures
3. Performance optimization:
   - Batch API calls
   - Cache frequently accessed data
   - Optimize Firestore queries
4. User acceptance testing
5. Write documentation

**Deliverables**:
- All features working end-to-end
- Comprehensive error handling
- User documentation
- API documentation

---

## 🚀 Deployment

### Backend Hosting Options

#### Option 1: Railway.app (Recommended)
- **Pros**: Free tier, persistent storage, auto-deploy from Git
- **Setup**: Connect GitHub repo, Railway auto-detects Node.js
- **Cost**: Free tier includes 500 hours/month + $5 credit

#### Option 2: Render.com
- **Pros**: Free tier, easy setup, auto-deploy
- **Cons**: Free tier sleeps after inactivity (30s wake time)
- **Cost**: Free tier available, paid starts at $7/month

#### Option 3: Vercel (Serverless Functions)
- **Pros**: Excellent for serverless, integrates with frontend
- **Cons**: Cold starts, function timeout limits (10s free, 60s paid)
- **Cost**: Free tier, paid Pro $20/month

#### Option 4: Firebase Cloud Functions
- **Pros**: Same ecosystem, seamless integration
- **Cons**: Pay-as-you-go, can get expensive with high traffic
- **Cost**: Blaze plan, ~$25-50/month estimated

### Frontend (No Changes)
- Continues deploying to GitHub Pages
- Update `.env` with backend URL: `VITE_BACKEND_API_URL=https://your-backend.railway.app`

---

## 💰 Cost Breakdown

### Development Costs
- **Developer Time**: 22-28 days (~1 month)
- **Testing Accounts**: Free (all platforms offer sandbox/development accounts)

### Ongoing Monthly Costs
| Service | Cost | Notes |
|---------|------|-------|
| Backend Hosting | $0-7/month | Railway/Render free tier or paid |
| Firebase | ~$5-10/month | Slight increase in Firestore operations |
| Amazon SP-API | Free | No API fees, just seller fees on sales |
| eBay API | Free | 5,000 calls/day free tier |
| Shopify API | Free | Unlimited for your own store |
| **Total** | **$5-17/month** | Lower with free tiers |

### No Hidden Fees
- No API gateway costs
- No additional marketplace fees (you already pay seller fees)
- No per-request charges

---

## ⚠️ Risk Assessment & Mitigation

### Risk 1: API Rate Limits
**Probability**: Medium
**Impact**: Medium
**Mitigation**:
- Implement exponential backoff
- Queue requests during high traffic
- Cache API responses
- Monitor rate limit headers
- Use batch endpoints when available

### Risk 2: Authentication Token Expiry
**Probability**: High (tokens expire regularly)
**Impact**: High (breaks integration)
**Mitigation**:
- Auto-refresh tokens before expiry
- Set up alerts for refresh failures
- Store token expiry dates
- Implement graceful fallback

### Risk 3: Webhook Delivery Failures
**Probability**: Medium
**Impact**: Medium (delayed data)
**Mitigation**:
- Implement retry logic
- Set up dead-letter queue
- Manual sync button as fallback
- Monitor webhook logs

### Risk 4: Data Sync Conflicts
**Probability**: Low (one-way sync)
**Impact**: Medium
**Mitigation**:
- Log all sync operations
- Implement conflict detection
- Provide admin override
- Display sync errors to user

### Risk 5: API Changes/Deprecation
**Probability**: Low-Medium
**Impact**: High
**Mitigation**:
- Subscribe to developer newsletters
- Version API endpoints
- Monitor deprecation notices
- Plan quarterly API reviews

---

## 📊 Success Metrics

### Quantitative KPIs
- **Order Import Speed**: <5 minutes from marketplace to app
- **Inventory Sync Time**: <30 seconds from app to marketplaces
- **Sync Success Rate**: >99%
- **API Error Rate**: <1%
- **Webhook Delivery Success**: >98%
- **Manual Data Entry Reduction**: 80%+

### Qualitative Benefits
- ✅ Single dashboard for all marketplace orders
- ✅ Automatic inventory updates across platforms
- ✅ Reduced risk of overselling
- ✅ Faster order fulfillment
- ✅ Better inventory visibility
- ✅ Streamlined workflow

---

## 🔄 Future Enhancements (Post-MVP)

### Phase 7: Advanced Features (Optional)
1. **Two-way inventory sync**: Sync inventory from marketplaces to app
2. **Product listing sync**: Create/update listings from app
3. **Automated repricing**: Dynamic pricing based on competition
4. **Return/refund handling**: Manage returns through app
5. **Multi-warehouse support**: Route orders to nearest warehouse
6. **Analytics dashboard**: Revenue by marketplace, top products
7. **Automated fulfillment**: Auto-create shipping labels
8. **Low stock alerts**: Notify before running out on marketplaces

---

## 📝 Pre-Development Checklist

Before starting implementation, ensure:

- [ ] Client has active seller accounts on Amazon, eBay, Shopify
- [ ] Client has completed marketplace API setup (see CLIENT_MARKETPLACE_SETUP_GUIDE.md)
- [ ] Client has provided all API credentials securely
- [ ] Backend hosting platform selected and account created
- [ ] Firebase project has Blaze plan enabled (for Cloud Functions if needed)
- [ ] Development environment set up (Node.js 18+, npm/yarn)
- [ ] Git repository created for backend code
- [ ] Domain/subdomain for backend API (optional but recommended)

---

## 🆘 Support & Troubleshooting

### Common Issues

**Issue: "Invalid credentials" errors**
- Verify all API keys are correct
- Check token expiry dates
- Ensure correct environment (production vs sandbox)

**Issue: Webhooks not receiving data**
- Verify webhook URL is publicly accessible (not localhost)
- Check webhook signature verification
- Review marketplace developer dashboard for delivery logs

**Issue: Rate limit exceeded**
- Reduce sync frequency
- Implement request queuing
- Use batch endpoints

**Issue: Orders not importing**
- Check date range filters
- Verify order status filters (unshipped, pending, etc.)
- Review error logs in syncLogs collection

---

## 📚 Resources & Documentation

### Official Documentation
- [Amazon SP-API Docs](https://developer-docs.amazon.com/sp-api/)
- [eBay Developer Program](https://developer.ebay.com/docs)
- [Shopify Admin API](https://shopify.dev/docs/api/admin)
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)

### Recommended Libraries
- `@sp-api-sdk/auth` - Amazon authentication
- `ebay-api` - eBay API wrapper
- `@shopify/shopify-api` - Shopify official SDK
- `firebase-admin` - Firebase Admin SDK
- `express` - Web framework
- `axios` - HTTP client
- `winston` - Logging
- `joi` - Validation

### Community Support
- Stack Overflow tags: `amazon-sp-api`, `ebay-api`, `shopify-app-development`
- GitHub Issues for SDKs
- Marketplace developer forums

---

## 📞 Next Steps

1. **Client Action Required**: Complete marketplace API setup using `CLIENT_MARKETPLACE_SETUP_GUIDE.md`
2. **Developer**: Review this plan and prepare development environment
3. **Stakeholders**: Approve plan and timeline
4. **Begin Development**: Start with Phase 1 (Backend Foundation)

---

**Document Version**: 1.0  
**Last Updated**: October 17, 2024  
**Status**: 🔴 Awaiting Client Credentials  
**Estimated Start Date**: TBD  
**Estimated Completion**: TBD + 1 month

