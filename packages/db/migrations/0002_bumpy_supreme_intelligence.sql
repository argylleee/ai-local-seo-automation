CREATE TABLE "business_visibility_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"business_id" uuid NOT NULL,
	"metric_type" text NOT NULL,
	"value" numeric(12, 4) NOT NULL,
	"unit" text,
	"keyword" text,
	"notes" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "business_visibility_snapshots" ADD CONSTRAINT "business_visibility_snapshots_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "business_visibility_snapshots" ADD CONSTRAINT "business_visibility_snapshots_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "business_visibility_snapshots_organization_id_idx" ON "business_visibility_snapshots" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "business_visibility_snapshots_business_id_idx" ON "business_visibility_snapshots" USING btree ("business_id");