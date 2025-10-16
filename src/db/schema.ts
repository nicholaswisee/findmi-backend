import {
  integer,
  pgTable,
  varchar,
  timestamp,
  pgEnum,
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
  'none',
]);
// TODO: Fill Division Enum
export const userDivisionEnum = pgEnum('division_enum', ['none']);

export const userRankEnum = pgEnum('rank_enum', [
  'Ketua',
  'Kepala Bidang',
  'Wakil Kepala Bidang',
  'Kepala Divisi',
  'Wakil Kepala Divisi',
  'Kepala Subdivisi',
  'Wakil Kepala Subdivisi',
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
