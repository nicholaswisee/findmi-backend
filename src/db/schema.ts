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
// TODO: Fill Division Enum: MSDM, PSDM, ...
export const userDivisionEnum = pgEnum('division_enum', [
  // Sekbenbid
  'Sekretaris',
  'Bendahara',
  'Sekretaris & Bendahara',

  // From Sekretariat Jendral
  'Perizinan',

  // From Manajemen Personalia
  'MSDM',
  'PSDM',

  // From Perangkat Lapangan Utama (under Komandan Lapangan)
  'Pengawasan',
  'Eksekusi',

  // From ITB Day
  'Lapangan',
  'Tour',
  'Event Organizer',
  'Exhibition',
  'Pre-Event',

  // From Relasi
  'Intrakampus',
  'Ekstrakampus',

  // From Kreatif
  'Grafis',
  'Dokumentasi',
  'Publikasi',
  'Musik',
  'Properti',

  // From Diseminasi
  'Diseminasi Umum',
  'Diseminasi Khusus',

  // From Paguyuban Membangun
  'Roadshow Paguyuban',
  'Forum Paguyuban',

  // From Fundraising
  'Sponsorship',
  'Entrepreneurship',

  // From Operasional
  'Logistik',
  'Produksi',
  'Akomodasi dan Transportasi',

  // From IT
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

export const usersTable = pgTable('users', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  department: userDepartmentEnum('department').notNull().default('none'), // Bidang
  division: userDivisionEnum('division').notNull().default('none'), // Divisi
  rank: userRankEnum('rank').notNull().default('none'), // Ring 1, 2, atau staff
  nim: varchar({ length: 255 }).notNull().default(''),
  no_wa: varchar({ length: 255 }).notNull().default(''),
  line_id: varchar({ length: 255 }).notNull().default(''),
  role: userRoleEnum('role').notNull().default('user'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  deleted_at: timestamp('deleted_at'),
});

export type BundleItem = {
  product_id: number;
  amount: number;
};

export type BundleItemsJSON = BundleItem[];

export const accountsTable = pgTable('accounts', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  provider: varchar({ length: 255 }).notNull(),
  provider_id: varchar({ length: 255 }).notNull().unique(),
  email: varchar({ length: 255 }).notNull().unique(),
  user_id: integer()
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  deleted_at: timestamp('deleted_at'),
});

export const productsTable = pgTable('products', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull().default(''),
  description: text().notNull().default(''),
  price: numeric().notNull().default('0.00'),
  category: userDepartmentEnum('category').notNull().default('none'), // None = publik, Panitia / Specified Department = Panitia
  image_url: varchar({ length: 512 }).notNull().default(''),
});

export const bundlesTable = pgTable('bundles', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  name: varchar({ length: 255 }).notNull(),
  description: text().notNull().default(''),
  bundle_items: jsonb('bundle_items').notNull(), // JSONB for BundleItems, [{}, ...]
  image_url: varchar({ length: 512 }).notNull().default(''),
  price: numeric().notNull().default('0.00'),
  category: userDepartmentEnum('category').notNull().default('none'),
  is_hidden: boolean('is_hidden').notNull().default(false),
});

export const cartsTable = pgTable('carts', {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),
  user_id: integer()
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  deleted_at: timestamp('deleted_at'),
});

export const cartItemsTable = pgTable(
  'cart_items',
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),
    cart_id: integer()
      .notNull()
      .references(() => cartsTable.id, { onDelete: 'cascade' }),
    product_id: integer().references(() => productsTable.id, {
      onDelete: 'cascade',
    }),
    bundle_id: integer().references(() => bundlesTable.id, {
      onDelete: 'cascade',
    }),
    quantity: integer().notNull().default(1),
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
