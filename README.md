# TexPro Inventory Suite

Build a complete Inventory, Order & Billing application named "TexPro Marketing" with the following explicit functional and nonfunctional requirements. Deliverables: full backend, REST API, database schema, frontend web UI (responsive), PDF invoice generator, dot-matrix/plain-text invoice printer mode, user authentication & roles, data import/export, and deployment instructions. Use modern stack (suggestions at the end). Provide a running demo + seed data and exportable Postman/OpenAPI spec.

IDENTIFIERS:
- Company name printed on all invoices: TEXPRO Marketing
- Billing contact on invoices: Contact 0779484650 Naushad Zakeriya
- Currency: LKR (primary) and optional USD fields for reporting

REQUIREMENTS (functional):
1. Suppliers
  - CRUD for suppliers with fields:
    - supplier_id (UUID)
    - name (string)
    - contact_person (string)
    - phone (string)
    - email (string)
    - address (string)
    - supply_terms (string) e.g., "30 days"
    - default_currency
    - default_payment_method
    - tax_id (optional)
    - notes
    - opening_balance, total_purchases, total_paid, outstanding_balance (computed)
  - Record "Purchase Invoice" entries per supplier:
    - purchase_id, date, invoice_number, items[], subtotal, taxes, freight, total, paid_amount, payment_status (Paid/Partially Paid/Pending), due_date, attachments (PDF/image)
  - Track payments to suppliers:
    - payment_id, date, method (bank/cash/cheque), amount, reference, linked_purchase_ids (support partial payments across multiple invoices)
  - Supplier ledger view: chronological transactions (purchases + payments) and running balance; ability to filter by date.

2. Products & Stock
  - CRUD for products with fields:
    - product_id (SKU code — unique string)
    - product_code (human code)
    - name
    - description
    - supplier_id (primary supplier) — support many-to-many with alternative suppliers
    - category/type
    - size (text)
    - colour
    - cost_price (per purchase)
    - selling_price
    - unit (pcs/meter/box)
    - barcode (optional)
    - attributes (JSON for arbitrary attrs)
    - tax_rate
    - reorder_level (integer)
    - reorder_quantity (integer)
    - current_stock (computed)
    - stock_history (timestamped IN/OUT records)
  - On purchase receipt, system must create stock IN transaction that updates `current_stock`.
  - On sales/order billing, create stock OUT transaction.
  - Allow manual stock adjustments with reason and audit log.
  - Low stock notification when current_stock <= reorder_level (configurable notification channels).

3. Inventory Movements / Stock Ledger
  - Each movement record:
    - movement_id, product_id, type (purchase_in, sale_out, adjustment, transfer), qty, unit_cost, date, reference_id, user_id, notes
  - Provide product-level stock history UI and export.

4. Customers
  - CRUD customers with:
    - customer_id, name, contact_person, phone, email, address, customer_tags, credit_limit, default_discount_rules
  - Maintain customer ledger (sales, payments, returns).

5. Orders (Sales Orders)
  - Create orders where user can select customer and add product lines:
    - each line: product_id (auto-suggest), description, size, colour, unit, qty, unit_price (editable), discount_line (amount or %), tax, line_total.
  - System should validate stock availability at order creation and allow:
    - Reserve stock (optional)
    - Create backorder when not available (track missing quantities per line)
  - Order statuses: Draft → Confirmed → Packed → Shipped/Delivered → Cancelled.
  - Save orders and be able to convert orders to invoice (billing) with one click.

6. Billing / Invoicing
  - Create invoice from confirmed orders or directly from items.
  - Invoice features:
    - invoice_id, invoice_number (configurable pattern), date, due_date, customer, billing_address, shipping_address, payment_terms.
    - line items with size/colour/type details shown.
    - automatic discount application: per-customer & per-product discount rules (see Discount Rules).
    - allow manual invoice-level Add-ons or Deductions (shipping, rounding, adjustments) with description — these must be shown on invoice.
    - Tax calculation per line and invoice summary: subtotal, discounts, taxes, additions, grand total.
    - **Important:** Discounts should NOT be printed on the invoice unless the user explicitly adds a discount on the invoice or the customer has a discount rule that MUST be shown. Default behavior: hide automatic discounts from printed output; show only net prices unless user chooses "Show discounts".
    - Payment receipt recording (partial and full).
    - Mark invoice status: Unpaid / Partially Paid / Paid / Overdue / Credited.
    - Generate professional PDF invoice with the following mandatory header:
      - TEXPRO Marketing
      - Contact 0779484650 Naushad Zakeriya
      - Company address (optional editable by admin)
    - PDF must be A4 style, clean table of items, clear totals, invoice number & dates, payment instructions, bank details (editable).
  - Provide plain-text/dot-matrix invoice format for dot-matrix printers (see printing section).

7. Discounts rules (complex)
  - Support these discount rule types:
    - Per-customer fixed percentage off entire invoice.
    - Per-customer per-product discount (percentage or fixed amount).
    - Per-product volume discounts (e.g., buy ≥ 50 => 5% off).
    - Manual invoice-level adjustments (visible if user chooses).
  - System applies rules automatically when creating invoice, but **does not show** applied discount on printed invoice unless the invoice has an explicit manual discount or admin toggles `print_discounts = true` for this invoice.
  - Each discount application must be recorded in the audit trail (what rule applied and why).

8. Payments & Receipts
  - Record customer payments:
    - payment_id, date, amount, method, reference, linked_invoice_ids (supports overpayment/advance), note.
  - Auto-allocate payment to oldest outstanding invoices unless user chooses allocation.
  - Manage refunds/credit notes.

9. Search, Filters, Bulk Actions
  - Fast search for suppliers, products (by SKU/name/barcode), customers, invoices, orders.
  - Bulk import via CSV/Excel for suppliers, products, customers, opening balances.
  - Bulk export (PDF, CSV, Excel) for invoices, ledgers, stock.

10. Notifications & Alerts
  - Email and in-app notifications for:
    - Low stock per product (configurable threshold).
    - Supplier payment due reminders.
    - Customer invoice overdue alerts.
    - Purchase invoice marked delivered.
  - Option to integrate with WhatsApp/Telegram/email for alerts — provide hooks.

11. Reporting & Dashboards
  - Dashboard widgets:
    - Current cash balances, outstanding payables (by supplier), outstanding receivables (by customer), low stock items, top-selling products, stock value.
  - Reports & exports:
    - Supplier ledger, customer ledger, sales by product, purchases by supplier, stock movement report, profit per invoice, aging reports (receivables & payables).
  - Date-filterable, downloadable CSV/PDF.

12. Printing & PDF
  - PDF generator for invoices/order confirmations/delivery notes; A4 layout with your company info.
  - Dot-matrix / plain text mode:
    - Provide a compact plain-text invoice template (ASCII) with fixed-width columns suitable for 80-column dot matrix printers.
    - Provide ESC/POS snippets for thermal printers.
    - Provide an option to print via browser print dialog or send to a local print server.
    - Allow toggling text-only output for dot matrix and line-feed options.

13. Audit, Security & Multi-User
  - Users & roles with permissions:
    - Admin (full)
    - Manager (suppliers/products/orders/reports)
    - Sales (create orders/invoices, customers)
    - Warehouse (stock in/out, adjustments)
    - Accountant (payments, ledgers, reports)
  - Audit log: all create/update/delete actions recorded with user, timestamp, old_value, new_value, IP.
  - Password policy, optional 2FA.
  - Data backup & restore (export DB dump + scheduled backups).

14. Integration & API
  - Provide RESTful API endpoints (OpenAPI spec) to manage products, suppliers, customers, orders, invoices, payments, and stock movements.
  - Webhooks for events: invoice_created, payment_received, stock_low, supplier_payment_due.
  - CSV import endpoints.

15. UX / UI Requirements
  - Clean, minimal, responsive web app. Desktop-first for billing counters but mobile friendly.
  - Key pages: Dashboard, Suppliers, Products, Customers, Purchases (create/receive), Orders, Invoices, Payments, Stock Ledger, Reports, Settings (company details, invoice template, taxes), Users/Roles.
  - Product add/edit modal: must allow entering size/colour/type attributes and multiple supplier cost variants.
  - Order creation flow:
    - Type or scan SKU → auto-fill size/colour options for that SKU (if multiple variants).
    - Show real-time stock availability next to each line.
    - Allow saving as Draft and converting to Invoice.
  - Invoice printing modal: choose PDF or dot-matrix, choose whether to show discounts.

16. Data Model (basic tables)
  - suppliers, supplier_purchases, supplier_payments
  - products, product_variants (for size/colour), product_suppliers (cost history)
  - stock_movements
  - customers, customer_discounts
  - orders, order_lines
  - invoices, invoice_lines
  - payments (customers & suppliers)
  - users, roles, permissions
  - audit_logs

17. Validation & Acceptance Criteria (tests)
  - When creating a purchase with 10 units of SKU ABC, product current_stock increases by 10.
  - When creating an invoice for 3 units of SKU ABC (stock >=3), current_stock decreases by 3.
  - Low stock alert triggers when current_stock <= reorder_level.
  - Supplier ledger sums purchases and payments correctly and outstanding balance equals purchases - payments.
  - Customer discount rule applied automatically during invoice creation; discount not printed unless explicitly allowed.
  - Dot-matrix invoice produces correct fixed-width layout tested with sample printers (attach test output).
  - Exported PDF invoice contains TEXPRO Marketing and Contact 0779484650 Naushad Zakeriya in header.
  - API endpoints respond with correct CRUD operations and proper authentication.

18. Sample Invoice Layout (A4 PDF)
  - Header:
    TEXPRO Marketing
    Contact 0779484650 Naushad Zakeriya
    [Company address] | [GST/TAX no] | Invoice #: INV-2025-0001 | Date: YYYY-MM-DD
  - Customer name & address block on left; supplier/order/delivery block on right (if needed)
  - Table columns (wide):
    S/N | Product Code | Product Name | Size | Colour | Type | Qty | Unit Price | Discount(if explicit) | Tax | Line Total
  - Footer:
    Subtotal:
    Discounts: (only if shown)
    Tax:
    Additions: (shipping)
    GRAND TOTAL:
    Payment terms / Bank details / Notes
  - Small signature area: Prepared by / Approved by / Received by.

19. Dot-matrix plain text invoice example (80-column)
  - Provide a monospace ASCII example with columns truncated to fit and LF at end of lines. (Deliver in code file.)
  - Include line feeds and cut commands as comments for printer.

20. Deployment & Tech suggestions (choose one)
  - Option A: MERN fullstack (MongoDB, Express, React, Node), generate REST API, JWT auth, Docker compose, PostgreSQL if relational preferred.
  - Option B: Django + React (Postgres) with Django REST Framework (preferred for strong relational integrity).
  - PDF: use a reliable generator (wkhtmltopdf or Puppeteer HTML→PDF).
  - Dot matrix: provide plain-text templates and option to send to a local print service (tiny Node microservice).
  - Use Nginx + gunicorn / pm2, include environment variable configs.

21. Deliverables from the AI (explicit)
  - Database schema with SQL or migrations.
  - Backend code (controllers, models, services).
  - Frontend UI source (React preferred), with Figma-style design tokens and a single-page app.
  - Invoice PDF template (HTML+CSS) and dot-matrix text template.
  - OpenAPI/Swagger documentation.
  - Postman collection for all APIs.
  - Seed data for suppliers, products, customers and demo invoices.
  - README with deployment steps and printer setup instructions.
  - Acceptance test scripts (unit tests & integration tests) for listed criteria.

22. UX design notes for Figma/devs
  - Provide exact wording for UI labels and help text.
  - Provide sample microcopy for confirmations, toasts, and alert messages.
  - Include a high-contrast invoice print style and a compact dot-matrix print style.

23. Extras (helpful)
  - CSV templates for product import and supplier import.
  - Sample discount rules JSON examples.
  - Example of supplier purchase + payment flow.
  - Provide localization hooks for Sinhala/Tamil/English UI.

24. Product Quantity Units & Pack Sizes (New Requirement)

Implement a complete quantity/measurement system so that all products can be purchased, stocked, and sold in different unit formats:

Supported Quantity Formats

Units (pcs) — base stock unit

Dozen (12 pcs)

Half-dozen (6 pcs)

Custom pack sizes (e.g., 24-pack, 50-pack, 100-pack) — admin definable per product

Product Fields to Add

For each product or variant:

base_unit = "pcs"

allowed_units[] = ["pcs", "dozen", "half-dozen", "pack-24", ...]

conversion_rates (JSON):

{
  "pcs": 1,
  "dozen": 12,
  "half_dozen": 6,
  "pack_24": 24
}

How Stock Should Work

System always stores and calculates current_stock in base units (pcs).

When user enters qty in another unit (e.g., 3 dozens), system automatically converts:

3 dozens × 12 = 36 pcs added to or subtracted from stock.

When generating reports/ledgers, show both:

Actual unit entered (e.g., 5 dozens)

Converted pcs (e.g., 60 pcs)

Purchases & Supplier Invoices

When entering purchases, user can select quantity unit:

qty = 2, unit = "dozen" → system stores +24 pcs.

Cost price must support unit-based entry:

cost per dozen OR cost per pcs

System must auto-calculate cost per pcs for valuation.

Sales Orders & Billing

During order entry or invoicing:

User may select unit = pcs / dozen / pack

On invoice print:

Show the unit name exactly as entered:
Example:
“2 dozens (24 pcs)”

Pricing rules must work per chosen unit.

Stock Alerts

Low-stock alerts must always use pcs internally.

Dot-Matrix & PDF

Invoice/product line format must display:

Qty (as entered)

Unit (dozens/pcs/pack)

Converted pcs (optional small text)

Line total calculated properly

Example PDF:

Qty: 2 dozen   (24 pcs)
Unit Price: LKR 1,200/dozen
Line Total: LKR 2,400


Example Dot-Matrix:

2 doz (24 pcs)   Cotton Shirt L   1,200/doz   2,400

Backend Logic

Add a universal conversion function:

convertToBaseUnits(qty, unit, conversion_rates)


All stock movements must use base pcs.

Reports

Sales report should show:

“5 dozens (60 pcs)” for clarity

Stock report should show:

Base units and optional unit breakdown.

END.

## Backend — Supabase

This app talks directly to a Supabase project. All configuration lives in `.env`:

```sh
VITE_SUPABASE_PROJECT_ID="lfxjrzsmhtgmhgjbhpxo"
VITE_SUPABASE_URL="https://lfxjrzsmhtgmhgjbhpxo.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."
```

Copy `.env.example` to `.env` and fill in the values from
**Supabase Dashboard → Project Settings → API** if you ever point the app at a
different project. Nothing else in the codebase hardcodes a database endpoint —
`src/integrations/supabase/client.ts` is the single place the client is created.

The schema lives in `supabase/migrations/`. To apply it to a fresh project:

```sh
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

…or paste the migration files, in filename order, into the Supabase SQL Editor.

Notes:

- The app uses its **own** login table (`public.system_users`), not Supabase Auth.
  See `src/lib/auth.tsx`. The default admin seeded by the migrations is
  `Nabeel`.
- No Edge Functions, Storage buckets or Realtime channels are used.
- See `SUPABASE_MIGRATION_NOTES.md` for the security caveats around the current
  row-level-security policies.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
