ALTER TABLE "sites" DROP CONSTRAINT "sites_title_template";--> statement-breakpoint
ALTER TABLE "sites" DROP CONSTRAINT "sites_no_empty_text";--> statement-breakpoint
ALTER TABLE "sites" DROP COLUMN "title_template";--> statement-breakpoint
ALTER TABLE "sites" DROP COLUMN "description";--> statement-breakpoint
ALTER TABLE "sites" DROP COLUMN "favicon_url";--> statement-breakpoint
ALTER TABLE "sites" DROP COLUMN "social_image_url";--> statement-breakpoint
ALTER TABLE "sites" DROP COLUMN "social_image_alt";--> statement-breakpoint
ALTER TABLE "sites" DROP COLUMN "noindex";--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_no_empty_text" CHECK ("sites"."name" <> '' and "sites"."site_url" <> '');