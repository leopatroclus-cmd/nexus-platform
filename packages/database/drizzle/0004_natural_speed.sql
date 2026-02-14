ALTER TABLE "organizations" ADD COLUMN "company_address" text;--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "company_tax_id" varchar(50);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "company_phone" varchar(50);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "company_email" varchar(255);--> statement-breakpoint
ALTER TABLE "organizations" ADD COLUMN "logo_url" text;