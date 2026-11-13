CREATE TYPE "public"."area_status" AS ENUM('calm', 'tense', 'closed');--> statement-breakpoint
CREATE TYPE "public"."card_status" AS ENUM('Pending', 'Active', 'Frozen', 'Retired');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('sender', 'admin');--> statement-breakpoint
CREATE TYPE "public"."transfer_kind" AS ENUM('deposit', 'redeem', 'stake', 'unstake', 'freeze', 'unfreeze', 'activate', 'issue');--> statement-breakpoint
CREATE TABLE "cards" (
	"id" text PRIMARY KEY NOT NULL,
	"sender_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"status" "card_status" DEFAULT 'Pending' NOT NULL,
	"pin_hash" text,
	"pin_salt" text,
	"wrong_pins" integer DEFAULT 0 NOT NULL,
	"activation_shop_id" text,
	"activation_requested_at" timestamp with time zone,
	"pdf_issued_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "communes" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"department" text NOT NULL,
	"status" "area_status" DEFAULT 'calm' NOT NULL,
	"lat" double precision,
	"lng" double precision,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forecasts" (
	"id" serial PRIMARY KEY NOT NULL,
	"shop_id" text NOT NULL,
	"day" date NOT NULL,
	"p10" double precision NOT NULL,
	"p50" double precision NOT NULL,
	"p90" double precision NOT NULL,
	"ceiling_cad" integer NOT NULL,
	"model_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"sender_id" uuid NOT NULL,
	"card_id" text,
	"kind" text NOT NULL,
	"from_label" text NOT NULL,
	"text" text NOT NULL,
	"tx_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" uuid NOT NULL,
	"card_id" text NOT NULL,
	"amount_cad" double precision NOT NULL,
	"fee_cad" double precision NOT NULL,
	"rate" double precision NOT NULL,
	"usd_out" double precision NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recipients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sender_id" uuid NOT NULL,
	"name" text NOT NULL,
	"relationship" text NOT NULL,
	"commune" text NOT NULL,
	"department" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sample_payouts" (
	"shop_id" text NOT NULL,
	"day" date NOT NULL,
	"paid_usd" double precision NOT NULL,
	"area_status" "area_status" DEFAULT 'calm' NOT NULL,
	CONSTRAINT "sample_payouts_shop_id_day_pk" PRIMARY KEY("shop_id","day")
);
--> statement-breakpoint
CREATE TABLE "shops" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"commune_id" text NOT NULL,
	"password_hash" text NOT NULL,
	"ceiling_cad" integer DEFAULT 500 NOT NULL,
	"hard_cap_cad" integer DEFAULT 1000 NOT NULL,
	"stellar_public" text,
	"stellar_secret_enc" text,
	"lat" double precision,
	"lng" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfers" (
	"id" serial PRIMARY KEY NOT NULL,
	"kind" "transfer_kind" NOT NULL,
	"card_id" text NOT NULL,
	"sender_id" uuid,
	"shop_id" text,
	"amount_usd" double precision,
	"amount_cad" double precision,
	"line" integer,
	"tx_hash" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "role" DEFAULT 'sender' NOT NULL,
	"name" text,
	"kyc_verified" boolean DEFAULT false NOT NULL,
	"stellar_public" text,
	"stellar_secret_enc" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_recipient_id_recipients_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."recipients"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cards" ADD CONSTRAINT "cards_activation_shop_id_shops_id_fk" FOREIGN KEY ("activation_shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forecasts" ADD CONSTRAINT "forecasts_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipients" ADD CONSTRAINT "recipients_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sample_payouts" ADD CONSTRAINT "sample_payouts_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shops" ADD CONSTRAINT "shops_commune_id_communes_id_fk" FOREIGN KEY ("commune_id") REFERENCES "public"."communes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_card_id_cards_id_fk" FOREIGN KEY ("card_id") REFERENCES "public"."cards"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfers" ADD CONSTRAINT "transfers_shop_id_shops_id_fk" FOREIGN KEY ("shop_id") REFERENCES "public"."shops"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cards_sender_idx" ON "cards" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "forecasts_shop_idx" ON "forecasts" USING btree ("shop_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_sender_idx" ON "messages" USING btree ("sender_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "rate_limits_key_window" ON "rate_limits" USING btree ("key","window_start");--> statement-breakpoint
CREATE INDEX "recipients_sender_idx" ON "recipients" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "transfers_sender_idx" ON "transfers" USING btree ("sender_id","created_at");--> statement-breakpoint
CREATE INDEX "transfers_shop_idx" ON "transfers" USING btree ("shop_id","created_at");--> statement-breakpoint
CREATE INDEX "transfers_card_idx" ON "transfers" USING btree ("card_id");