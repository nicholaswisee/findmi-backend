CREATE TYPE "public"."rank_enum" AS ENUM('none');--> statement-breakpoint
ALTER TYPE "public"."department_enum" ADD VALUE 'Ketua AMI' BEFORE 'none';--> statement-breakpoint
ALTER TYPE "public"."department_enum" ADD VALUE 'Kesekjenan' BEFORE 'none';--> statement-breakpoint
ALTER TYPE "public"."department_enum" ADD VALUE 'Manajemen Personalia' BEFORE 'none';--> statement-breakpoint
ALTER TYPE "public"."department_enum" ADD VALUE 'Materi dan Metode' BEFORE 'none';--> statement-breakpoint
ALTER TYPE "public"."department_enum" ADD VALUE 'Relasi' BEFORE 'none';--> statement-breakpoint
ALTER TYPE "public"."department_enum" ADD VALUE 'ITB Day' BEFORE 'none';--> statement-breakpoint
ALTER TYPE "public"."department_enum" ADD VALUE 'Paguyuban Membangun' BEFORE 'none';--> statement-breakpoint
ALTER TYPE "public"."department_enum" ADD VALUE 'Diseminasi' BEFORE 'none';--> statement-breakpoint
ALTER TYPE "public"."department_enum" ADD VALUE 'Kreatif' BEFORE 'none';--> statement-breakpoint
ALTER TYPE "public"."department_enum" ADD VALUE 'Fundraising' BEFORE 'none';--> statement-breakpoint
ALTER TYPE "public"."department_enum" ADD VALUE 'Operasional' BEFORE 'none';--> statement-breakpoint
ALTER TYPE "public"."department_enum" ADD VALUE 'Perangkat Lapangan Utama' BEFORE 'none';--> statement-breakpoint
ALTER TYPE "public"."department_enum" ADD VALUE 'IT' BEFORE 'none';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "rank" "rank_enum" DEFAULT 'none' NOT NULL;