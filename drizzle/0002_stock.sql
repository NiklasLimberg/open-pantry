CREATE TABLE "batch" (
	"id" text PRIMARY KEY NOT NULL,
	"pantry_id" text NOT NULL,
	"product_id" text NOT NULL,
	"location_id" text NOT NULL,
	"quarters" smallint DEFAULT 4 NOT NULL,
	"opened" boolean DEFAULT false NOT NULL,
	"date_kind" text DEFAULT 'unknown' NOT NULL,
	"date" date,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"discarded_at" timestamp with time zone,
	CONSTRAINT "batch_quarters_check" CHECK ("batch"."quarters" between 0 and 4),
	CONSTRAINT "batch_date_check" CHECK (("batch"."date_kind" in ('mhd', 'use_by', 'estimate')) = ("batch"."date" is not null))
);
--> statement-breakpoint
CREATE TABLE "location" (
	"id" text PRIMARY KEY NOT NULL,
	"pantry_id" text NOT NULL,
	"name" text NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "off_product" (
	"barcode" text PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"name" text,
	"brand" text,
	"quantity" text,
	"categories" text[] DEFAULT '{}'::text[] NOT NULL,
	"image_url" text,
	"storage_instructions" text,
	"fetched_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product" (
	"id" text PRIMARY KEY NOT NULL,
	"pantry_id" text NOT NULL,
	"barcode" text,
	"name" text,
	"brand" text,
	"package_amount" integer,
	"package_unit" text,
	"track_unit" text DEFAULT 'pack' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "product_package_check" CHECK (("product"."package_amount" is null) = ("product"."package_unit" is null))
);
--> statement-breakpoint
ALTER TABLE "batch" ADD CONSTRAINT "batch_pantry_id_organization_id_fk" FOREIGN KEY ("pantry_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch" ADD CONSTRAINT "batch_product_id_product_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."product"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "batch" ADD CONSTRAINT "batch_location_id_location_id_fk" FOREIGN KEY ("location_id") REFERENCES "public"."location"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "location" ADD CONSTRAINT "location_pantry_id_organization_id_fk" FOREIGN KEY ("pantry_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "product" ADD CONSTRAINT "product_pantry_id_organization_id_fk" FOREIGN KEY ("pantry_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "batch_pantry_id_idx" ON "batch" USING btree ("pantry_id");--> statement-breakpoint
CREATE INDEX "batch_product_id_idx" ON "batch" USING btree ("product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "location_pantry_name_idx" ON "location" USING btree ("pantry_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "product_pantry_barcode_idx" ON "product" USING btree ("pantry_id","barcode") WHERE "product"."barcode" is not null;--> statement-breakpoint
CREATE INDEX "product_barcode_idx" ON "product" USING btree ("barcode");