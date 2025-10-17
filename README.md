```
findmi-backend/
│
├── src/
│ ├── index.ts # Entry point utama (serve app)
│ ├── app.ts # Inisialisasi Hono, middleware global, routing utama
│ │
│ ├── routes/ # Lapisan "View" (mendefinisikan endpoint)
│ │ ├── index.route.ts # Health check & root API info
│ │ ├── products.route.ts # /products endpoints
│ │ ├── orders.route.ts # /orders endpoints
│ │ ├── users.route.ts # /users endpoints
│ │ └── auth.route.ts # /auth (login, register, refresh)
│ │
│ ├── controllers/ # Lapisan "Controller" (handle request/response)
│ │ ├── products.controller.ts
│ │ ├── orders.controller.ts
│ │ ├── users.controller.ts
│ │ └── auth.controller.ts
│ │
│ ├── services/ # Lapisan "Service" (logika bisnis)
│ │ ├── product.service.ts
│ │ ├── order.service.ts
│ │ ├── user.service.ts
│ │ └── payment.service.ts
│ │
│ ├── db/ # Lapisan "Model" (Drizzle ORM + koneksi database)
│ │ ├── schema.ts # Definisi tabel PostgreSQL (dengan pgTable)
│ │ ├── index.ts # Inisialisasi Drizzle (drizzle(pool))
│ │ ├── relations.ts # Definisi relasi antar tabel (optional)
│ │ └── migrations/ # File hasil migrasi Drizzle
│ │
│ ├── schemas/ # Validasi input & output API (Zod schemas)
│ │ ├── product.schema.ts
│ │ ├── order.schema.ts
│ │ ├── user.schema.ts
│ │ ├── auth.schema.ts
│ │ └── index.ts # Export schema aggregator (optional)
│ │
│ ├── middlewares/ # Middleware Hono (Auth, Error handler, Logging)
│ │ ├── auth.middleware.ts
│ │ ├── role.middleware.ts
│ │ └── error.middleware.ts
│ │
│ ├── utils/ # Helper functions dan abstraksi kecil
│ │ ├── response.ts # Standarisasi struktur response API
│ │ ├── env.ts # Load & validasi env (Zod)
│ │ ├── logger.ts # Custom logger untuk server
│ │ └── jwt.ts # Utility JWT encode/decode (optional)
│ │
│ ├── config/ # Konfigurasi environment & third-party
│ │ ├── db.config.ts # Konfigurasi database PostgreSQL
│ │ ├── payment.config.ts # API key Midtrans / Stripe (opsional)
│ │ └── security.config.ts # Konfigurasi CORS, rate limit, dll.
│ │
│ ├── docs/ # Dokumentasi API otomatis (OpenAPI)
│ │ ├── openapi.ts # Generator OpenAPI dari Zod schemas
│ │ └── swagger.json # Output spec (opsional)
│ │
│ └── tests/ # Unit & integration test (optional)
│ ├── product.test.ts
│ └── order.test.ts
│
├── drizzle.config.ts # Konfigurasi Drizzle CLI (generate/push migrations)
├── drizzle/ # Output folder migrasi (dibuat otomatis)
│ └── migrations/
│
├── .env # Variabel environment (DATABASE_URL, JWT_SECRET, dsb)
├── tsconfig.json # Konfigurasi TypeScript
├── bun.lockb # Lockfile Bun
├── package.json # Dependencies
└── README.md
```
