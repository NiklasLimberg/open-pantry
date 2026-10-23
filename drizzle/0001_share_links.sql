CREATE TABLE "share_link" (
	"id" text PRIMARY KEY NOT NULL,
	"pantry_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"label" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"revoked_at" timestamp with time zone,
	CONSTRAINT "share_link_token_hash_unique" UNIQUE("token_hash")
);
--> statement-breakpoint
ALTER TABLE "share_link" ADD CONSTRAINT "share_link_pantry_id_organization_id_fk" FOREIGN KEY ("pantry_id") REFERENCES "public"."organization"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "share_link" ADD CONSTRAINT "share_link_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "share_link_pantry_id_idx" ON "share_link" USING btree ("pantry_id");