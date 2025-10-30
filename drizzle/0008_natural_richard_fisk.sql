ALTER TABLE "bundles" ALTER COLUMN "price" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "order_items" ALTER COLUMN "unit_price" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "total_amount" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DEFAULT 'Pending'::"public"."payment_status_enum";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "payment_status" SET DATA TYPE "public"."payment_status_enum" USING "payment_status"::"public"."payment_status_enum";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "payment_method" SET DEFAULT 'Manual'::"public"."payment_method_enum";--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "payment_method" SET DATA TYPE "public"."payment_method_enum" USING "payment_method"::"public"."payment_method_enum";--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "price" SET DEFAULT 0;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "remaining_stock" SET DEFAULT 0;