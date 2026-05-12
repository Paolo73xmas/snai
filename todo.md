# Cash Management Web App - Agenzia di Gioco

## Design
- **Theme**: Material You - hyper-rounded geometry, tonal palettes (DONE)
- **Color Palette**: Primary hue 212 (light) / hue 212 (dark), neutral hue 240, rounded corners 1.75rem (DONE)
- **Typography**: Inter font, -0.01em letter spacing (DONE)
- **Layout**: Sidebar navigation, role-based sections, card-based dashboard (DONE)
- **Style**: Material 3 with tonal surfaces, 56px buttons with 28px radius (DONE)

## Roles
- **admin**: Full access to all pages
- **operator**: Turno, Operazioni, Movimenti
- **operator_plus**: Same as operator + VLT, BetSmart, Cassa Centrale

## Development Tasks
- [x] Apply Material You theme to globals.css and tailwind.config.ts
- [x] Fix CSS variables: hue 240 for neutrals, hue 212 for primary/accent
- [x] Create backend custom API router for cash operations (cash_ops.py)
- [x] Create backend service for cash operations logic (cash_ops_service.py)
- [x] Insert initial data (Cassa Centrale, Banca, sample operator cashes)
- [x] Create frontend auth context and role management (lib/auth.ts)
- [x] Create main layout with sidebar navigation (components/AppLayout.tsx)
- [x] Create Admin Dashboard page (pages/AdminDashboard.tsx)
- [x] Create Operator page with shift management (pages/OperatorPage.tsx)
- [x] Create Operations page with transfers (pages/OperationsPage.tsx)
- [x] Create Movements log page with filters (pages/MovementsPage.tsx)
- [x] Create Login page (pages/LoginPage.tsx)
- [x] Create dedicated Discrepancies page for Admin (pages/DiscrepanciesPage.tsx)
- [x] Create dedicated Cashes management page for Admin (pages/CashesPage.tsx)
- [x] Create dedicated Users/Account management page for Admin (pages/UsersPage.tsx)
- [x] Create VLT page for Admin + Operator+ (pages/VltPage.tsx)
- [x] Create BetSmart page for Admin + Operator+ (pages/BetSmartPage.tsx)
- [x] Create Bank page for Admin only (pages/BankPage.tsx)
- [x] Create Shifts monitoring page for Admin (pages/ShiftsPage.tsx)
- [x] Create Reports page for Admin (pages/ReportsPage.tsx)
- [x] Create Central Cash page for Admin + Operator+ (pages/CentralCashPage.tsx)
- [x] Update AppLayout sidebar with all nav items and 3-role support
- [x] Update App.tsx routes for all pages with proper role-based access
- [x] Run lint + build checks - PASSED
- [x] Auto-assign admin role for admin@trezzanosnai.it on first login (cash_ops_service.py)
- [x] Implement username/password login (public endpoint + JWT token)
- [x] Fix password verification and ensure admin password_hash is set on startup
- [x] Configure Vite proxy to point to correct backend port (8000)
- [x] Update CORS to allow localhost:3002 (actual dev server port)
- [x] Verify end-to-end login flow (frontend → proxy → backend → JWT response)
- [x] Add receipt photo capture/upload to shift closure (camera + gallery, thumbnail preview, required before closing)
- [x] Implement "Turni Chiusi" section with closed shifts list, photo thumbnails, lightbox, and discrepancy badges
- [x] Backend endpoint for closed shifts with photo download URLs (/closed-shifts)
- [x] User suspension/reactivation feature (backend + frontend)
- [x] Add "Salva Tutto" button to OperatorPage (batch save all incomes/payments in one operation)
- [x] Backend /record-batch endpoint for batch operations