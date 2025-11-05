import { z } from '@hono/zod-openapi';

export const userRoleEnum = z.enum(['user', 'admin', 'subadmin']).openapi({
  description: 'User role within the system',
  example: 'user',
});

export const userDepartmentEnum = z
  .enum([
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
  ])
  .openapi({
    description: `User's department (Bidang) within AMI organization`,
    example: 'IT',
  });

export type UserDepartmentEnum = z.infer<typeof userDepartmentEnum>;

export const userDivisionEnum = z
  .enum([
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
  ])
  .openapi({
    description: 'Division (Divisi) within AMI department',
    example: 'Grafis',
  });

export const userRankEnum = z
  .enum([
    'Ketua',
    'Kepala Bidang',
    'Wakil Kepala Bidang',
    'Kepala Divisi',
    'Wakil Kepala Divisi',
    'Kepala Subdivisi',
    'Wakil Kepala Subdivisi',
    'Staff',
    'none',
  ])
  .openapi({
    description: 'Rank or position of user',
    example: 'Staff',
  });

export const userSchema = z.object({
  id: z.number().int().openapi({ example: 1 }),
  name: z.string().max(255).openapi({ example: 'Jason H.' }),
  department: userDepartmentEnum,
  division: userDivisionEnum,
  rank: userRankEnum,
  nim: z.string().max(255).openapi({ example: '13524000' }),
  no_wa: z.string().max(255).openapi({ example: '081234567890' }),
  line_id: z.string().max(255).openapi({ example: 'jasonlineid' }),
  role: userRoleEnum,
  created_at: z.iso.datetime().openapi({ example: '2025-10-28T12:00:00Z' }),
  updated_at: z.iso.datetime().openapi({ example: '2025-10-28T12:00:00Z' }),
  deleted_at: z.iso.datetime().nullable().optional(),
});

export type User = z.infer<typeof userSchema>;
