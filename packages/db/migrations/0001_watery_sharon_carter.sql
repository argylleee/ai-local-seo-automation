CREATE TABLE "automation_run_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"automation_run_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"event_type" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "automation_run_events_run_id_key_unique" UNIQUE("automation_run_id","idempotency_key")
);
--> statement-breakpoint
ALTER TABLE "automation_run_events" ADD CONSTRAINT "automation_run_events_automation_run_id_automation_runs_id_fk" FOREIGN KEY ("automation_run_id") REFERENCES "public"."automation_runs"("id") ON DELETE cascade ON UPDATE no action;