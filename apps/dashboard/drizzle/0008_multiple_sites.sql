ALTER TABLE "entries" ALTER COLUMN "site_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "site_members" ALTER COLUMN "site_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sites" ADD COLUMN "is_default" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "sites_one_default" ON "sites" USING btree ("is_default") WHERE "sites"."is_default";