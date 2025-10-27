# Marketplace API Setup Guide
**Step-by-Step Instructions for Amazon, eBay & Shopify**

---

## 📌 Introduction

This guide will help you set up API access for your Amazon Seller Central, eBay, and Shopify accounts. This is required to connect these marketplaces to your warehouse management system.

**What is API access?**
API (Application Programming Interface) allows different software systems to communicate with each other. By setting up API access, your warehouse app will be able to automatically:
- Import orders from your marketplaces
- Update inventory quantities on your listings
- Mark orders as shipped
- Sync tracking numbers

**Who should do this?**
- The person who has admin access to your Amazon Seller Central, eBay, and Shopify accounts
- Estimated time: 1-2 hours total (spread across a few days for approvals)

**What you'll need:**
- Access to your marketplace seller accounts
- A notepad or document to save credentials (keep them secure!)
- Your business information (may be needed for verification)

---

## 🟠 Part 1: Amazon Seller Central Setup

**Estimated Time**: 30-45 minutes + 2-3 days approval wait

### Step 1: Access Amazon Developer Central

1. Open your web browser and go to: https://developer.amazonservices.com
2. Click the **"Sign in"** button in the top right corner
3. Sign in using the **same email and password** you use for Amazon Seller Central
4. If prompted, verify your identity (may require 2-step verification)

### Step 2: Register as a Developer

1. After signing in, you'll see a page asking you to register
2. Fill in the following information:
   - **Developer Name**: Your business name or your name
   - **Email Address**: Your business email (this will receive important notifications)
   - **Phone Number**: Your business phone number
   - **Company Name**: Your registered business name
   - **Website**: Your business website (or you can use your Amazon storefront URL)
3. Read and accept the **Amazon Services Terms of Use**
4. Click **"Submit"** or **"Register"**
5. ✅ You're now registered as an Amazon developer!

### Step 3: Create a Developer Application

1. After registration, go to the **"Apps & Services"** menu at the top
2. Click on **"Manage Your Apps"**
3. Click the orange **"Add New App"** button
4. Fill in the application details:

   **Application Name**:
   ```
   Warehouse Management Integration
   ```
   (or any name that helps you remember it's for your warehouse system)

   **Application Description**:
   ```
   Integration for warehouse management system to sync orders and inventory
   ```

   **OAuth Login URI**:
   ```
   https://localhost
   ```
   (This is temporary and can be updated later when your developer provides the actual URL)

   **OAuth Redirect URI**:
   ```
   https://localhost/callback
   ```
   (Same as above - temporary)

5. Click **"Save"** or **"Create App"**

### Step 4: Request API Access Permissions

1. After creating the app, you'll see your app listed
2. Click on **"Edit App"** or your app name
3. Look for the **"LWA Credentials"** section (LWA = Login with Amazon)
4. You'll see:
   - **Client ID**: A long string of letters and numbers
   - **Client Secret**: Click **"View"** to see it (another long string)
   
5. **⚠️ IMPORTANT**: Copy and save these somewhere safe:
   ```
   Amazon Client ID: [paste here]
   Amazon Client Secret: [paste here]
   ```

6. Scroll down to find **"IAM ARN"** section
7. Click **"Add IAM User"** and note down the ARN (Amazon Resource Name)

### Step 5: Enable Required API Scopes

1. Still on the same page, look for **"Roles"** or **"API Permissions"**
2. Make sure these are checked/enabled:
   - ✅ **Orders API** (to fetch orders)
   - ✅ **Feeds API** (to update inventory)
   - ✅ **Notifications API** (for real-time updates)
   - ✅ **Merchant Fulfillment API** (to mark orders as shipped)
3. Click **"Save"** or **"Update"**

### Step 6: Get Your Refresh Token

This is the trickiest part. You have two options:

**Option A: Request from Amazon Support** (Easier)
1. Go to Amazon Seller Central
2. Click **"Help"** at the top
3. Search for "SP-API refresh token"
4. Contact support and say: *"I need a refresh token for my SP-API application to integrate with my warehouse system"*
5. They will guide you through the authorization process
6. Save the refresh token they provide

**Option B: Use OAuth Authorization Flow** (For Developers)
1. Share your Client ID with your developer
2. They will create an authorization URL for you
3. You'll visit that URL, log in to Amazon, and authorize the app
4. You'll receive a refresh token
5. Save it securely

**⚠️ Save This Information:**
```
Amazon Refresh Token: [paste here]
Amazon Seller ID: [paste here - found in Seller Central > Settings > Account Info]
Amazon Marketplace ID: [paste here - usually ATVPDKIKX0DER for US]
```

### Step 7: Enable Notifications (Optional but Recommended)

1. In your Amazon Developer Console, go to **"Notifications"**
2. Click **"Create Destination"**
3. Select **"SQS"** (Simple Queue Service)
4. Name it: `warehouse-notifications`
5. Save the SQS Queue URL provided
6. **Share this URL with your developer** - they'll need it to receive real-time order updates

### Step 8: Test Your Setup

1. In the Developer Console, look for **"Test"** or **"Sandbox"**
2. Try making a test API call (your developer can help with this)
3. If it works, you're all set! ✅

**⏰ Approval Wait Time**: Amazon may take 2-3 business days to fully approve your developer account and enable API access. You'll receive an email when it's ready.

---

## 🔴 Part 2: eBay Developer Program Setup

**Estimated Time**: 30 minutes + 1-2 days approval wait

### Step 1: Access eBay Developer Program

1. Go to: https://developer.ebay.com
2. Click **"Register"** or **"Sign In"** in the top right
3. Use your **regular eBay seller account** credentials to log in
4. If you don't have a developer account yet, you'll be prompted to create one

### Step 2: Register as a Developer

1. Click **"My Account"** after logging in
2. Fill in the registration form:
   - **First Name & Last Name**: Your name
   - **Email**: Your business email
   - **Company Name**: Your business name (can be individual)
   - **Country**: Your country
   - **Phone**: Your phone number
3. Accept the **Developer Terms of Use**
4. Click **"Continue"** or **"Register"**

### Step 3: Create an Application

1. After registration, go to **"My Account"** → **"Application Keysets"**
2. You'll see options for **Sandbox** and **Production**
3. First, let's create a **Production** keyset (this is what you'll use for real orders)

### Step 4: Get Production Keys

1. Click **"Create Production Keyset"** or similar button
2. Fill in the application details:

   **Application Title**:
   ```
   Warehouse Management System
   ```

   **Application Description**:
   ```
   Integration for syncing orders and inventory between eBay and warehouse
   ```

   **Application Type**:
   - Select: **"Web Application"**

   **Grant Type**:
   - Select: **"Authorization Code"** (for OAuth)

3. Click **"Create Keyset"**

### Step 5: Copy Your Credentials

After creating the keyset, you'll see three important credentials:

**⚠️ SAVE THESE IMMEDIATELY** (they may not be shown again):

```
eBay App ID (Client ID): [paste here]
eBay Dev ID: [paste here]
eBay Cert ID (Client Secret): [paste here]
```

**How to find them later if you forget:**
1. Go to **"My Account"** → **"Application Keysets"**
2. Click on your application name
3. Your credentials will be displayed (you may need to click "View" on the Cert ID)

### Step 6: Configure Redirect URLs

1. Still in your application settings, find **"OAuth Redirect URIs"**
2. Click **"Add Redirect URI"**
3. For now, enter:
   ```
   https://localhost/auth/ebay/callback
   ```
4. Click **"Save"**
5. Later, your developer will provide you with the actual URL to update this

### Step 7: Enable Required Scopes

1. In your application settings, look for **"OAuth Scopes"** or **"Permissions"**
2. Make sure these are enabled:
   - ✅ `https://api.ebay.com/oauth/api_scope/sell.inventory` (manage inventory)
   - ✅ `https://api.ebay.com/oauth/api_scope/sell.fulfillment` (manage orders)
   - ✅ `https://api.ebay.com/oauth/api_scope/sell.account` (account access)
3. Click **"Save Changes"**

### Step 8: Get Your OAuth User Token

This requires authorization:

1. Your developer will create an authorization URL using your App ID
2. You'll visit that URL in your browser
3. You'll see an eBay login/consent screen
4. Click **"Agree"** or **"Authorize"**
5. You'll be redirected to a page with a code
6. Share that code with your developer, who will exchange it for an access token

**Alternative Method:**
1. In eBay Developer Program, go to **"User Tokens"**
2. Click **"Generate User Token"**
3. Select your application
4. Choose the same scopes as above
5. Click **"Generate Token"**
6. Copy and save the token

**⚠️ Save This:**
```
eBay OAuth User Token: [paste here]
eBay OAuth Refresh Token: [paste here - if provided]
Token Expiration Date: [paste here]
```

### Step 9: Set Up Notifications (Optional)

1. Go to **"Notifications"** in the Developer Program
2. Click **"Create Notification"**
3. Select **"Platform Notifications"**
4. Choose notification types:
   - ✅ Order created
   - ✅ Order updated
   - ✅ Item sold
5. Enter your webhook URL (your developer will provide this)
6. Click **"Subscribe"**

### Step 10: Get Your Seller Account Information

You'll also need these details:

1. Go to your regular eBay Seller Account
2. Click **"Account"** → **"Personal Information"**
3. Find and save:
   ```
   eBay User ID: [your seller username]
   eBay Site ID: [e.g., 0 for US, 3 for UK, 77 for Germany]
   ```

**⏰ Approval Wait Time**: eBay typically approves developer accounts within 1-2 business days. You'll receive an email confirmation.

---

## 🟢 Part 3: Shopify Setup

**Estimated Time**: 20-30 minutes (Immediate access, no approval wait!)

### Step 1: Access Your Shopify Admin

1. Log in to your Shopify store at: https://[your-store-name].myshopify.com/admin
2. Replace `[your-store-name]` with your actual store name
3. Enter your Shopify admin credentials

### Step 2: Go to Settings

1. In the left sidebar, click **"Settings"** at the bottom
2. Click on **"Apps and sales channels"**

### Step 3: Create a Custom App

1. Click **"Develop apps"** at the top
2. If you see a message saying "App development is disabled", click **"Allow custom app development"**
3. Confirm by clicking **"Allow custom app development"** again
4. Click **"Create an app"** button

### Step 4: Configure Your App

1. Enter the app name:
   ```
   Warehouse Management Integration
   ```

2. In the **"App developer"** field, select yourself or your primary admin email

3. Click **"Create app"**

### Step 5: Configure API Scopes (Permissions)

1. After creating the app, you'll see tabs. Click **"Configuration"**
2. Under **"Admin API integration"**, click **"Configure"**
3. You'll see a long list of permissions. Enable these:

   **Orders Permissions:**
   - ✅ `read_orders` (to fetch orders)
   - ✅ `write_orders` (to update order status)

   **Inventory Permissions:**
   - ✅ `read_inventory` (to check inventory levels)
   - ✅ `write_inventory` (to update inventory quantities)

   **Products Permissions:**
   - ✅ `read_products` (to read product information)
   - ✅ `write_products` (to update product details - optional)

   **Fulfillment Permissions:**
   - ✅ `read_fulfillments` (to track fulfillments)
   - ✅ `write_fulfillments` (to create fulfillments)

4. Click **"Save"** at the bottom

### Step 6: Install the App

1. Click on the **"API credentials"** tab
2. Click **"Install app"** button
3. You'll see a confirmation popup
4. Click **"Install"** to confirm

### Step 7: Get Your API Credentials

After installing, you'll see your credentials:

**⚠️ COPY THESE IMMEDIATELY** (the Admin API access token is only shown once):

```
Shopify API Key: [paste here]
Shopify API Secret Key: [paste here - click "Reveal" to see it]
Admin API Access Token: [paste here - THIS IS VERY IMPORTANT!]
```

**If you miss copying the access token:**
1. You'll need to uninstall and reinstall the app
2. Or generate a new token from the same page

**Also save:**
```
Shopify Store URL: [your-store-name].myshopify.com
API Version: 2024-01 (or latest version shown)
```

### Step 8: Enable Webhooks

1. In your app, go to **"Configuration"** tab
2. Scroll to **"Webhooks"** section
3. Click **"Create webhook"**
4. Create webhooks for these events:

   **Order Webhooks:**
   - Event: `orders/create`
   - URL: `[Your developer will provide this]`
   - Click **"Save"**

   - Event: `orders/updated`
   - URL: `[Same as above]`
   - Click **"Save"**

   **Inventory Webhooks:**
   - Event: `inventory_levels/update`
   - URL: `[Same as above]`
   - Click **"Save"**

5. For now, you can use a temporary URL like `https://example.com/webhook`
6. Your developer will give you the real webhook URL to update later

### Step 9: Test Your Setup

1. Go to your Shopify Admin → **"Orders"**
2. Create a test order (you can mark it as test order)
3. Your developer can verify if the order data can be accessed via the API
4. ✅ If successful, you're all set!

### Step 10: Note Your Shop Information

You'll also need:

```
Shop ID: [found in Settings → General → bottom of page]
Shop Domain: [your-store-name].myshopify.com
Primary Location ID: [Settings → Locations → click your location → ID in URL]
```

**⏰ Approval Wait Time**: None! Shopify custom apps work immediately. ✅

---

## 📋 Final Checklist

Before sending credentials to your developer, make sure you have all of these:

### Amazon Credentials ✅
- [ ] Amazon Client ID
- [ ] Amazon Client Secret
- [ ] Amazon Refresh Token
- [ ] Amazon Seller ID
- [ ] Amazon Marketplace ID (e.g., ATVPDKIKX0DER)
- [ ] SQS Queue URL (optional)

### eBay Credentials ✅
- [ ] eBay App ID (Client ID)
- [ ] eBay Dev ID
- [ ] eBay Cert ID (Client Secret)
- [ ] eBay OAuth User Token
- [ ] eBay Refresh Token
- [ ] eBay User ID (your seller username)
- [ ] eBay Site ID (e.g., 0 for US)

### Shopify Credentials ✅
- [ ] Shopify Store URL
- [ ] Shopify API Key
- [ ] Shopify API Secret Key
- [ ] Shopify Admin API Access Token
- [ ] API Version (e.g., 2024-01)
- [ ] Shop ID
- [ ] Primary Location ID

---

## 🔐 Security Best Practices

**DO:**
- ✅ Store credentials in a password manager (LastPass, 1Password, etc.)
- ✅ Only share credentials with trusted developers via secure channels (encrypted email, password-protected documents)
- ✅ Regularly review authorized apps in each marketplace
- ✅ Enable two-factor authentication on all marketplace accounts

**DON'T:**
- ❌ Share credentials via plain email or text message
- ❌ Save credentials in unsecured documents
- ❌ Share your master login passwords (API tokens are separate)
- ❌ Authorize apps you don't recognize

---

## 🆘 Common Issues & Solutions

### Issue: "I can't find the Developer section on Amazon"
**Solution**: Make sure you're on https://developer.amazonservices.com (NOT regular Amazon.com or Seller Central). It's a separate portal.

### Issue: "My eBay application was rejected"
**Solution**: This is rare, but if it happens:
1. Make sure your eBay seller account is in good standing
2. Ensure you've completed all required business information
3. Contact eBay Developer Support for clarification

### Issue: "I accidentally closed the Shopify token page"
**Solution**: 
1. Go back to Apps → Your app → API credentials
2. Click "Uninstall app"
3. Click "Install app" again
4. You'll see the token again (copy it this time!)

### Issue: "My tokens keep expiring"
**Solution**: 
- Amazon refresh tokens don't expire (if you have the right type)
- eBay tokens expire every 18 months - you'll need to regenerate
- Shopify tokens don't expire unless you uninstall the app
- Your developer can implement auto-refresh for tokens that expire

### Issue: "I'm not technical enough to do this"
**Solution**: 
- You can do it! Just follow the steps slowly
- Take screenshots as you go
- If stuck, most marketplaces have phone support
- Amazon: 1-866-216-1072 (US)
- eBay: Check your seller hub for your region's number
- Shopify: Help center in your admin panel

---

## 📞 Getting Help

### Amazon Support
- **URL**: https://sellercentral.amazon.com/gp/contact-us
- **Phone** (US): 1-866-216-1072
- **Search for**: "SP-API" or "Developer support"

### eBay Developer Support
- **URL**: https://developer.ebay.com/support
- **Forum**: https://community.ebay.com/t5/Developer/ct-p/developer-apis
- **Email**: Through developer portal contact form

### Shopify Support
- **Help Center**: https://help.shopify.com
- **Phone**: Available in your admin under "Support"
- **Live Chat**: Available 24/7 in your admin

---

## ✅ Next Steps

Once you've gathered all the credentials:

1. **Securely share them with your developer**
   - Use a password-protected document
   - Or a secure sharing service like 1Password shared vaults
   - Never send via plain email or chat

2. **Your developer will:**
   - Test the credentials
   - Set up the integration
   - Update the webhook URLs
   - Test the complete flow

3. **You'll be able to:**
   - See all your orders in one place
   - Update inventory once, sync everywhere
   - Ship orders faster
   - Reduce manual data entry

---

## 📅 Timeline Summary

| Marketplace | Setup Time | Approval Wait | Total Time |
|------------|------------|---------------|------------|
| Amazon | 30-45 min | 2-3 days | ~3 days |
| eBay | 30 min | 1-2 days | ~2 days |
| Shopify | 20-30 min | Immediate | ~30 min |
| **TOTAL** | **~1.5 hours** | **2-3 days** | **~3 days** |

**Pro Tip**: Start with Amazon first (longest approval), then eBay, then Shopify. By the time you finish Shopify, Amazon should be approved!

---

## 📝 Document Version

**Version**: 1.0  
**Last Updated**: October 17, 2024  
**Created for**: Warehouse Management System Marketplace Integration  
**Questions?**: Contact your developer or refer to this guide

---

**🎉 Congratulations!** Once you complete these steps, your warehouse system will be connected to all your marketplaces, making your life much easier!

