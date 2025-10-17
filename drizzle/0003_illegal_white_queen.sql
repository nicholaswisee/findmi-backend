ALTER TYPE "public"."department_enum" ADD VALUE 'Panitia' BEFORE 'none';--> statement-breakpoint
ALTER TYPE "public"."division_enum" ADD VALUE 'Panitia' BEFORE 'none';--> statement-breakpoint
ALTER TYPE "public"."rank_enum" ADD VALUE 'Staff' BEFORE 'none';--> statement-breakpoint
CREATE TABLE "bundles" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "bundles_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"bundle_items" jsonb NOT NULL,
	"image_url" varchar(512) DEFAULT '' NOT NULL,
	"price" numeric DEFAULT '0.00' NOT NULL,
	"category" "department_enum" DEFAULT 'none' NOT NULL,
	"is_hidden" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_items" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "cart_items_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"cart_id" integer NOT NULL,
	"product_id" integer,
	"bundle_id" integer,
	"quantity" integer DEFAULT 1 NOT NULL,
	CONSTRAINT "product_or_bundle_xor" CHECK ((
        (product_id IS NOT NULL AND bundle_id IS NULL)
        OR
        (product_id IS NULL AND bundle_id IS NOT NULL)
      ))
);
--> statement-breakpoint
CREATE TABLE "carts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "carts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "products_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(255) DEFAULT '' NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"price" numeric DEFAULT '0.00' NOT NULL,
	"category" "department_enum" DEFAULT 'none' NOT NULL,
	"image_url" varchar(512) DEFAULT '' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_cart_id_carts_id_fk" FOREIGN KEY ("cart_id") REFERENCES "public"."carts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_bundle_id_bundles_id_fk" FOREIGN KEY ("bundle_id") REFERENCES "public"."bundles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "carts" ADD CONSTRAINT "carts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;