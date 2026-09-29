# Project Plan: Digital Product E-Commerce Platform (Single Vendor)

## Overview

This plan outlines the end-to-end development of a single-vendor digital commerce platform where users can purchase and access digital products (ebooks, journals, articles, digital files). The core architectural concept revolves around **Entitlement/Access Control** rather than direct file downloads.

## Timeline: Development Phases (MVP Focused)

### Phase 1: Foundation & Database Blueprint (Days 1-2)

**Goal:** Establish the architecture and data models.

- **Tasks:**
  - Define the Tech Stack (e.g., Next.js for Frontend, Node.js/Python for Backend, PostgreSQL for DB).
  - Design the Database Schema (ERD):
    - `users`, `roles`
    - `products`, `categories`
    - `orders`, `order_items`, `payments`
    - `entitlements` (User Library Access)
  - Setup repository and base project structure for Backend and Frontend.

### Phase 2: Core Backend & Authentication (Days 3-5)

**Goal:** Build secure APIs for user management and product serving.

- **Tasks:**
  - Implement User Authentication (Register, Login, JWT).
  - Build Admin Auth & Role Validation.
  - Create CRUD APIs for **Categories** and **Products** (Supporting different Product Types: Ebook, Journal, Article, File).
  - Implement secure file upload for digital assets (storing them in protected cloud storage/directories, NOT public folders).

### Phase 3: Admin Dashboard Development (Days 6-8)

**Goal:** Provide the company with tools to manage the catalog.

- **Tasks:**
  - Build the Admin UI layout (Sidebar, Header, Overview).
  - Implement Product Management (Create, Edit, Upload Cover, Upload Digital Asset).
  - Implement Category Management.
  - Order & Customer Management (View transactions and statuses).

### Phase 4: Customer Frontend - Discovery & Cart (Days 9-11)

**Goal:** Allow users to browse and prepare for purchase.

- **Tasks:**
  - Build the Public Website layout (Landing Page, Navbar, Footer).
  - Implement Product Catalog, Search, and Category Filtering.
  - Build Product Detail Page (Displaying price, description, and preview).
  - Implement Shopping Cart (Add, Remove, Subtotal calculation).

### Phase 5: Checkout & Payment Gateway Integration (Days 12-14)

**Goal:** Process transactions securely.

- **Tasks:**
  - Implement the Checkout flow (Order Summary).
  - Integrate a Payment Gateway (e.g., Midtrans, Xendit, or Stripe).
  - Handle **Webhook Integration** to securely verify successful payments.
  - Automate Order Status updates (Pending -> Paid -> Failed).

### Phase 6: User Library & Digital Entitlement (Days 15-17)

**Goal:** Deliver the purchased digital products securely.

- **Tasks:**
  - Logic to generate `entitlements` when an order status becomes PAID.
  - Build the **"My Library"** section on the customer frontend.
  - Implement Secure Access Control: generate temporary signed URLs or stream files based on the user's entitlement and the Product Type.
  - Build basic readers (e.g., PDF Reader or simple Article view) for the web.

### Phase 7: Testing, Security & Deployment (Days 18-20)

**Goal:** Ensure the platform is secure, bug-free, and live.

- **Tasks:**
  - End-to-end flow testing (Registration -> Browse -> Buy -> Pay -> Read).
  - Security audit: prevent direct file access, validate inputs, check JWT scopes.
  - Set up production databases and storage buckets.
  - Deploy Backend and Frontend to cloud platforms (e.g., Vercel, AWS, or DigitalOcean).
  - Configure domain and SSL.

---

> [!IMPORTANT]
> This MVP strictly focuses on establishing a secure purchase-to-read pipeline. Features like Wishlists, Advanced Analytics, Subscriptions, and Promo Codes are deferred to post-MVP iterations to ensure a faster, more stable initial launch.
