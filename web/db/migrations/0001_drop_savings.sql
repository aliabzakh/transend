ALTER TABLE "transfers" ALTER COLUMN "kind" SET DATA TYPE text;--> statement-breakpoint
DELETE FROM "transfers" WHERE "kind" IN ('stake', 'unstake');--> statement-breakpoint
DROP TYPE "public"."transfer_kind";--> statement-breakpoint
CREATE TYPE "public"."transfer_kind" AS ENUM('deposit', 'redeem', 'freeze', 'unfreeze', 'activate', 'issue');--> statement-breakpoint
ALTER TABLE "transfers" ALTER COLUMN "kind" SET DATA TYPE "public"."transfer_kind" USING "kind"::"public"."transfer_kind";