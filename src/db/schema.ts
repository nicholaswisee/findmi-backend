import { sql } from 'drizzle-orm';
import {
  integer,
  pgTable,
  varchar,
  timestamp,
  pgEnum,
  numeric,
  boolean,
  text,
  jsonb,
  check,
} from 'drizzle-orm/pg-core';

export const userRoleEnum = pgEnum('role_enum', ['user', 'admin', 'subadmin']);

export const userDepartmentEnum = pgEnum('department_enum', [
  'Ketua AMI',
  'Kesekjenan',
  'Manajemen Personalia',
  'Materi dan Metode',
  'Relasi',
  'ITB Day',
  'Paguyuban Membangun',
  'Diseminasi',
  'Kreatif',
  'Fundraising',
  'Operasional',
  'Perangkat Lapangan Utama',
  'IT',
  'Panitia',
  'none',
]);

export const userDivisionEnum = pgEnum('division_enum', [
  'Sekretaris',
  'Bendahara',
  'Sekretaris & Bendahara',
  'Perizinan',
  'MSDM',
  'PSDM',
  'Pengawasan',
  'Eksekusi',
  'Lapangan',
  'Tour',
  'Event Organizer',
  'Exhibition',
  'Pre-Event',
  'Intrakampus',
  'Ekstrakampus',
  'Grafis',
  'Dokumentasi',
  'Publikasi',
  'Musik',
  'Properti',
  'Diseminasi Umum',
  'Diseminasi Khusus',
  'Roadshow Paguyuban',
  'Forum Paguyuban',
  'Sponsorship',
  'Entrepreneurship',
  'Logistik',
  'Produksi',
  'Akomodasi dan Transportasi',
  'IT',
  'Panitia',
  'none',
]);

export const userRankEnum = pgEnum('rank_enum', [
  'Ketua',
  'Kepala Bidang',
  'Wakil Kepala Bidang',
  'Kepala Divisi',
  'Wakil Kepala Divisi',
  'Kepala Subdivisi',
  'Wakil Kepala Subdivisi',
  'Staff',
  'none',
]);

export const orderPaymentStatusEnum = pgEnum('payment_status_enum', [
  'Pending',
  'Paid',
  'Failed',
  'Refunded',
]);

export const orderPaymentMethodEnum = pgEnum('payment_method_enum', [
  'Manual',
  'Xendit',
  'Midtrans',
  'GoPay',
]);

export const usersTable = pgTable('users', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 255 }).notNull(),
  department: userDepartmentEnum('department').notNull().default('none'),
  division: userDivisionEnum('division').notNull().default('none'),
  rank: userRankEnum('rank').notNull().default('none'),
  nim: varchar('nim', { length: 255 }).notNull().default(''),
  no_wa: varchar('no_wa', { length: 255 }).notNull().default(''),
  line_id: varchar('line_id', { length: 255 }).notNull().default(''),
  role: userRoleEnum('role').notNull().default('user'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  deleted_at: timestamp('deleted_at'),
});

export const accountsTable = pgTable('accounts', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  provider: varchar('provider', { length: 255 }).notNull(),
  provider_id: varchar('provider_id', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  user_id: integer('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  password: varchar('password', { length: 255 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  deleted_at: timestamp('deleted_at'),
});

export const productsTable = pgTable('products', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 255 }).notNull().default(''),
  description: text('description').notNull().default(''),
  price: numeric('price', { mode: 'number' }).notNull().default(0.0),
  category: userDepartmentEnum('category').notNull().default('none'),
  image_url: varchar('image_url', { length: 512 }).notNull().default(''),
  remaining_stock: numeric('remaining_stock', { mode: 'number' })
    .notNull()
    .default(0),
});

export type BundleItem = {
  product_id: number;
  amount: number;
};
export type BundleItemsJSON = BundleItem[];

export const bundlesTable = pgTable('bundles', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull().default(''),
  bundle_items: jsonb('bundle_items').notNull(),
  image_url: varchar('image_url', { length: 512 }).notNull().default(''),
  price: numeric('price', { mode: 'number' }).notNull().default(0.0),
  category: userDepartmentEnum('category').notNull().default('none'),
  is_hidden: boolean('is_hidden').notNull().default(false),
});

export const cartsTable = pgTable('carts', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  deleted_at: timestamp('deleted_at'),
});

export const cartItemsTable = pgTable(
  'cart_items',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    cart_id: integer('cart_id')
      .notNull()
      .references(() => cartsTable.id, { onDelete: 'cascade' }),
    product_id: integer('product_id').references(() => productsTable.id, {
      onDelete: 'cascade',
    }),
    bundle_id: integer('bundle_id').references(() => bundlesTable.id, {
      onDelete: 'cascade',
    }),
    quantity: integer('quantity').notNull().default(1),
  },
  (table) => [
    check(
      'product_or_bundle_xor',
      sql`(
        (product_id IS NOT NULL AND bundle_id IS NULL)
        OR
        (product_id IS NULL AND bundle_id IS NOT NULL)
      )`,
    ),
  ],
);

export const ordersTable = pgTable('orders', {
  id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  total_amount: numeric('total_amount', { mode: 'number' })
    .notNull()
    .default(0.0),
  payment_status: orderPaymentStatusEnum('payment_status')
    .notNull()
    .default('Pending'),
  payment_method: orderPaymentMethodEnum('payment_method')
    .notNull()
    .default('Manual'),
  transaction_id: varchar('transaction_id', { length: 255 }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

export const orderItemsTable = pgTable(
  'order_items',
  {
    id: integer('id').primaryKey().generatedAlwaysAsIdentity(),
    order_id: integer('order_id')
      .notNull()
      .references(() => ordersTable.id, { onDelete: 'cascade' }),
    product_id: integer('product_id').references(() => productsTable.id, {
      onDelete: 'cascade',
    }),
    bundle_id: integer('bundle_id').references(() => bundlesTable.id, {
      onDelete: 'cascade',
    }),
    quantity: integer('quantity').notNull().default(1),
    unit_price: numeric('unit_price', { mode: 'number' })
      .notNull()
      .default(0.0),
  },
  (table) => [
    check(
      'product_or_bundle_xor_order',
      sql`(
        (product_id IS NOT NULL AND bundle_id IS NULL)
        OR
        (product_id IS NULL AND bundle_id IS NOT NULL)
      )`,
    ),
  ],
);
