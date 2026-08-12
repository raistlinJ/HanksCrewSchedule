No .env file found, continuing without it
-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "subscription_status" AS ENUM ('incomplete', 'incomplete_expired', 'active', 'paused', 'trialing', 'past_due', 'canceled', 'unpaid');

-- CreateEnum
CREATE TYPE "subscription_interval" AS ENUM ('month', 'year');

-- CreateEnum
CREATE TYPE "scheduled_event_status" AS ENUM ('confirmed', 'canceled', 'unconfirmed');

-- CreateEnum
CREATE TYPE "scheduled_event_invite_status" AS ENUM ('pending', 'accepted', 'declined', 'tentative');

-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('OAUTH');

-- CreateEnum
CREATE TYPE "LicenseType" AS ENUM ('PLUS', 'ORGANIZATION', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "LicenseStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "participant_visibility" AS ENUM ('full', 'scoresOnly', 'limited');

-- CreateEnum
CREATE TYPE "poll_status" AS ENUM ('open', 'closed', 'scheduled', 'canceled');

-- CreateEnum
CREATE TYPE "poll_kind" AS ENUM ('date', 'time');

-- CreateEnum
CREATE TYPE "poll_closed_reason" AS ENUM ('auto', 'manual');

-- CreateEnum
CREATE TYPE "vote_type" AS ENUM ('yes', 'no', 'ifNeedBe');

-- CreateEnum
CREATE TYPE "SpaceMemberRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "space_tiers" AS ENUM ('hobby', 'pro');

-- CreateEnum
CREATE TYPE "time_format" AS ENUM ('hours12', 'hours24');

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('admin', 'user');

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" TEXT NOT NULL,
    "price_id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "subscription_item_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "discount_percent_off" DOUBLE PRECISION,
    "discount_amount_off" INTEGER,
    "status" "subscription_status" NOT NULL,
    "active" BOOLEAN NOT NULL,
    "currency" TEXT NOT NULL,
    "interval" "subscription_interval" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "user_id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_methods" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_types" (
    "id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "host_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "capacity" INTEGER,
    "description" TEXT,
    "location" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "event_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_events" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "event_type_id" TEXT,
    "sheet_slot_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" JSONB,
    "conferencing" JSONB,
    "capacity" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "status" "scheduled_event_status" NOT NULL DEFAULT 'confirmed',
    "time_zone" TEXT,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "sequence" INTEGER NOT NULL DEFAULT 0,
    "uid" TEXT NOT NULL,
    "hide_attendees" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "scheduled_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rescheduled_event_dates" (
    "id" TEXT NOT NULL,
    "scheduled_event_id" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "all_day" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rescheduled_event_dates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_event_invites" (
    "id" TEXT NOT NULL,
    "uid" TEXT NOT NULL,
    "scheduled_event_id" TEXT NOT NULL,
    "invitee_name" TEXT NOT NULL,
    "invitee_email" CITEXT NOT NULL,
    "invitee_id" TEXT,
    "invitee_time_zone" TEXT,
    "invitee_locale" TEXT,
    "status" "scheduled_event_invite_status" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_event_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instance_settings" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "disable_user_registration" BOOLEAN NOT NULL DEFAULT false,
    "instance_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "instance_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credentials" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "type" "CredentialType" NOT NULL,
    "secret" TEXT NOT NULL,
    "scopes" TEXT[],
    "expires_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_connections" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "display_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "credential_id" TEXT NOT NULL,

    CONSTRAINT "calendar_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_calendars" (
    "id" TEXT NOT NULL,
    "calendar_connection_id" TEXT NOT NULL,
    "provider_calendar_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "primary" BOOLEAN NOT NULL DEFAULT false,
    "time_zone" TEXT,
    "selected" BOOLEAN NOT NULL DEFAULT false,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "writable" BOOLEAN NOT NULL DEFAULT false,
    "provider_data" JSONB,
    "last_synced_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_calendars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "licenses" (
    "id" TEXT NOT NULL,
    "license_key" TEXT NOT NULL,
    "idempotency_key" TEXT,
    "version" INTEGER,
    "type" "LicenseType" NOT NULL,
    "seats" INTEGER,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "licensee_email" TEXT,
    "licensee_name" TEXT,
    "white_label_addon" BOOLEAN NOT NULL DEFAULT false,
    "status" "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "license_validations" (
    "id" TEXT NOT NULL,
    "license_id" TEXT NOT NULL,
    "ip_address" TEXT,
    "fingerprint" TEXT,
    "validated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_agent" TEXT,

    CONSTRAINT "license_validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "instance_licenses" (
    "id" TEXT NOT NULL,
    "license_key" TEXT NOT NULL,
    "version" INTEGER,
    "type" "LicenseType" NOT NULL,
    "seats" INTEGER,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "licensee_email" TEXT,
    "licensee_name" TEXT,
    "white_label_addon" BOOLEAN NOT NULL DEFAULT false,
    "status" "LicenseStatus" NOT NULL DEFAULT 'ACTIVE',

    CONSTRAINT "instance_licenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_notification_preferences" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "prefs" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "polls" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deadline" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "user_id" TEXT,
    "time_zone" TEXT,
    "status" "poll_status" NOT NULL DEFAULT 'open',
    "closed_reason" "poll_closed_reason",
    "kind" "poll_kind" NOT NULL DEFAULT 'date',
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),
    "event_id" TEXT,
    "scheduled_event_id" TEXT,
    "hide_participants" BOOLEAN NOT NULL DEFAULT false,
    "hide_scores" BOOLEAN NOT NULL DEFAULT false,
    "disable_comments" BOOLEAN NOT NULL DEFAULT true,
    "require_participant_email" BOOLEAN NOT NULL DEFAULT false,
    "muted" BOOLEAN NOT NULL DEFAULT false,
    "space_id" TEXT,
    "poll_group_id" TEXT,

    CONSTRAINT "polls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "note" TEXT,
    "token" TEXT,
    "user_id" TEXT,
    "poll_id" TEXT NOT NULL,
    "locale" TEXT,
    "time_zone" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_invites" (
    "id" TEXT NOT NULL,
    "poll_id" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "token" TEXT NOT NULL,
    "opened_at" TIMESTAMP(3),
    "reminded_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "participant_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "poll_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_activities" (
    "id" TEXT NOT NULL,
    "poll_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "user_id" TEXT,
    "participant_id" TEXT,
    "invite_id" TEXT,
    "option_id" TEXT,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "poll_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "options" (
    "id" TEXT NOT NULL,
    "start_time" TIMESTAMP(0) NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 0,
    "poll_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" TEXT NOT NULL,
    "participant_id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "poll_id" TEXT NOT NULL,
    "type" "vote_type" NOT NULL DEFAULT 'yes',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "poll_id" TEXT NOT NULL,
    "author_name" TEXT NOT NULL,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "poll_groups" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "space_id" TEXT,
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "poll_order" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "poll_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registered_instances" (
    "id" TEXT NOT NULL,
    "instance_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "first_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registered_instances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sheets" (
    "id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "host_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "url_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted" BOOLEAN NOT NULL DEFAULT false,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "sheets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sheet_slots" (
    "id" TEXT NOT NULL,
    "sheet_id" TEXT NOT NULL,
    "event_type_id" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sheet_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "spaces" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "owner_id" TEXT NOT NULL,
    "tier" "space_tiers" NOT NULL DEFAULT 'hobby',
    "primary_color" TEXT,
    "show_branding" BOOLEAN NOT NULL DEFAULT false,
    "hide_attribution" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "poll_group_order" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "poll_order" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "spaces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_members" (
    "id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "role" "SpaceMemberRole" NOT NULL DEFAULT 'MEMBER',
    "last_selected_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "space_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_member_invites" (
    "id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "role" "SpaceMemberRole" NOT NULL DEFAULT 'MEMBER',
    "inviter_id" TEXT NOT NULL,

    CONSTRAINT "space_member_invites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "space_api_keys" (
    "id" TEXT NOT NULL,
    "space_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "prefix" TEXT NOT NULL,
    "hashed_key" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "space_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "provider_account_id" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "scope" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMP(3),
    "refresh_token_expires_at" TIMESTAMP(3),
    "password" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" CITEXT NOT NULL,
    "email_verified" BOOLEAN,
    "image" TEXT,
    "time_zone" TEXT,
    "week_start" INTEGER,
    "time_format" "time_format",
    "locale" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),
    "customer_id" TEXT,
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "banned_at" TIMESTAMP(3),
    "ban_reason" TEXT,
    "ban_expires" TIMESTAMP(3),
    "role" "user_role" NOT NULL DEFAULT 'user',
    "last_login_method" TEXT,
    "anonymous" BOOLEAN NOT NULL DEFAULT false,
    "last_seen_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),
    "default_destination_calendar_id" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "user_id" TEXT NOT NULL,
    "impersonated_by" TEXT,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "subscriptions_user_id_idx" ON "subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "subscriptions_space_id_idx" ON "subscriptions"("space_id");

-- CreateIndex
CREATE INDEX "event_types_space_id_idx" ON "event_types"("space_id");

-- CreateIndex
CREATE INDEX "event_types_host_id_idx" ON "event_types"("host_id");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_events_sheet_slot_id_key" ON "scheduled_events"("sheet_slot_id");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_events_uid_key" ON "scheduled_events"("uid");

-- CreateIndex
CREATE INDEX "scheduled_events_space_id_idx" ON "scheduled_events"("space_id");

-- CreateIndex
CREATE INDEX "scheduled_events_user_id_idx" ON "scheduled_events"("user_id");

-- CreateIndex
CREATE INDEX "scheduled_events_event_type_id_idx" ON "scheduled_events"("event_type_id");

-- CreateIndex
CREATE INDEX "scheduled_events_space_id_status_start_idx" ON "scheduled_events"("space_id", "status", "start");

-- CreateIndex
CREATE INDEX "rescheduled_event_dates_scheduled_event_id_idx" ON "rescheduled_event_dates"("scheduled_event_id");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_event_invites_uid_key" ON "scheduled_event_invites"("uid");

-- CreateIndex
CREATE INDEX "scheduled_event_invites_invitee_id_idx" ON "scheduled_event_invites"("invitee_id");

-- CreateIndex
CREATE INDEX "scheduled_event_invites_invitee_email_idx" ON "scheduled_event_invites"("invitee_email");

-- CreateIndex
CREATE UNIQUE INDEX "scheduled_event_invites_scheduled_event_id_invitee_email_key" ON "scheduled_event_invites"("scheduled_event_id", "invitee_email");

-- CreateIndex
CREATE UNIQUE INDEX "instance_settings_instance_id_key" ON "instance_settings"("instance_id");

-- CreateIndex
CREATE INDEX "credential_expiry_idx" ON "credentials"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "credentials_user_id_provider_provider_account_id_key" ON "credentials"("user_id", "provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_connections_user_id_provider_provider_account_id_key" ON "calendar_connections"("user_id", "provider", "provider_account_id");

-- CreateIndex
CREATE INDEX "connection_selected_idx" ON "provider_calendars"("calendar_connection_id", "selected");

-- CreateIndex
CREATE INDEX "primary_calendar_idx" ON "provider_calendars"("primary");

-- CreateIndex
CREATE INDEX "sync_time_idx" ON "provider_calendars"("last_synced_at");

-- CreateIndex
CREATE UNIQUE INDEX "provider_calendars_calendar_connection_id_provider_calendar_key" ON "provider_calendars"("calendar_connection_id", "provider_calendar_id");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_license_key_key" ON "licenses"("license_key");

-- CreateIndex
CREATE UNIQUE INDEX "licenses_idempotency_key_key" ON "licenses"("idempotency_key");

-- CreateIndex
CREATE UNIQUE INDEX "instance_licenses_license_key_key" ON "instance_licenses"("license_key");

-- CreateIndex
CREATE UNIQUE INDEX "user_notification_preferences_user_id_key" ON "user_notification_preferences"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "polls_id_key" ON "polls"("id");

-- CreateIndex
CREATE UNIQUE INDEX "polls_event_id_key" ON "polls"("event_id");

-- CreateIndex
CREATE INDEX "polls_space_id_idx" ON "polls"("space_id");

-- CreateIndex
CREATE INDEX "polls_poll_group_id_idx" ON "polls"("poll_group_id");

-- CreateIndex
CREATE INDEX "polls_user_id_idx" ON "polls"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "participants_token_key" ON "participants"("token");

-- CreateIndex
CREATE INDEX "participants_poll_id_idx" ON "participants" USING HASH ("poll_id");

-- CreateIndex
CREATE INDEX "participants_user_id_idx" ON "participants"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "poll_invites_token_key" ON "poll_invites"("token");

-- CreateIndex
CREATE UNIQUE INDEX "poll_invites_participant_id_key" ON "poll_invites"("participant_id");

-- CreateIndex
CREATE UNIQUE INDEX "poll_invites_poll_id_email_key" ON "poll_invites"("poll_id", "email");

-- CreateIndex
CREATE INDEX "poll_activities_poll_id_created_at_idx" ON "poll_activities"("poll_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "poll_activities_poll_id_participant_id_idx" ON "poll_activities"("poll_id", "participant_id");

-- CreateIndex
CREATE INDEX "poll_activities_poll_id_option_id_idx" ON "poll_activities"("poll_id", "option_id");

-- CreateIndex
CREATE INDEX "poll_activities_poll_id_invite_id_idx" ON "poll_activities"("poll_id", "invite_id");

-- CreateIndex
CREATE INDEX "options_poll_id_idx" ON "options" USING HASH ("poll_id");

-- CreateIndex
CREATE INDEX "votes_poll_id_idx" ON "votes" USING HASH ("poll_id");

-- CreateIndex
CREATE INDEX "votes_participant_id_idx" ON "votes" USING HASH ("participant_id");

-- CreateIndex
CREATE INDEX "votes_option_id_idx" ON "votes" USING HASH ("option_id");

-- CreateIndex
CREATE INDEX "comments_poll_id_idx" ON "comments"("poll_id");

-- CreateIndex
CREATE INDEX "comments_user_id_idx" ON "comments"("user_id");

-- CreateIndex
CREATE INDEX "poll_groups_space_id_idx" ON "poll_groups"("space_id");

-- CreateIndex
CREATE INDEX "poll_groups_user_id_idx" ON "poll_groups"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "registered_instances_instance_id_key" ON "registered_instances"("instance_id");

-- CreateIndex
CREATE UNIQUE INDEX "sheets_url_id_key" ON "sheets"("url_id");

-- CreateIndex
CREATE INDEX "sheets_space_id_idx" ON "sheets"("space_id");

-- CreateIndex
CREATE INDEX "sheets_host_id_idx" ON "sheets"("host_id");

-- CreateIndex
CREATE INDEX "sheet_slots_sheet_id_start_time_idx" ON "sheet_slots"("sheet_id", "start_time");

-- CreateIndex
CREATE INDEX "sheet_slots_event_type_id_idx" ON "sheet_slots"("event_type_id");

-- CreateIndex
CREATE INDEX "spaces_owner_id_idx" ON "spaces"("owner_id");

-- CreateIndex
CREATE INDEX "space_members_user_id_idx" ON "space_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "space_members_space_id_user_id_key" ON "space_members"("space_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "space_member_invites_space_id_email_key" ON "space_member_invites"("space_id", "email");

-- CreateIndex
CREATE UNIQUE INDEX "space_api_keys_prefix_key" ON "space_api_keys"("prefix");

-- CreateIndex
CREATE INDEX "space_api_key_space_idx" ON "space_api_keys"("space_id");

-- CreateIndex
CREATE INDEX "space_api_key_expires_idx" ON "space_api_keys"("expires_at");

-- CreateIndex
CREATE INDEX "space_api_key_revoked_idx" ON "space_api_keys"("revoked_at");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_provider_provider_account_id_key" ON "accounts"("provider", "provider_account_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_deleted_at_idx" ON "users"("deleted_at");

-- CreateIndex
CREATE INDEX "users_anonymous_last_seen_at_idx" ON "users"("anonymous", "last_seen_at");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE UNIQUE INDEX "verifications_identifier_key" ON "verifications"("identifier");

-- CreateIndex
CREATE INDEX "verifications_identifier_idx" ON "verifications"("identifier");

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_types" ADD CONSTRAINT "event_types_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_types" ADD CONSTRAINT "event_types_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_events" ADD CONSTRAINT "scheduled_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_events" ADD CONSTRAINT "scheduled_events_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_events" ADD CONSTRAINT "scheduled_events_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "event_types"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_events" ADD CONSTRAINT "scheduled_events_sheet_slot_id_fkey" FOREIGN KEY ("sheet_slot_id") REFERENCES "sheet_slots"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rescheduled_event_dates" ADD CONSTRAINT "rescheduled_event_dates_scheduled_event_id_fkey" FOREIGN KEY ("scheduled_event_id") REFERENCES "scheduled_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_event_invites" ADD CONSTRAINT "scheduled_event_invites_scheduled_event_id_fkey" FOREIGN KEY ("scheduled_event_id") REFERENCES "scheduled_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_event_invites" ADD CONSTRAINT "scheduled_event_invites_invitee_id_fkey" FOREIGN KEY ("invitee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credentials" ADD CONSTRAINT "credentials_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_credential_id_fkey" FOREIGN KEY ("credential_id") REFERENCES "credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_connections" ADD CONSTRAINT "calendar_connections_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_calendars" ADD CONSTRAINT "provider_calendars_calendar_connection_id_fkey" FOREIGN KEY ("calendar_connection_id") REFERENCES "calendar_connections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "license_validations" ADD CONSTRAINT "license_validations_license_id_fkey" FOREIGN KEY ("license_id") REFERENCES "licenses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_notification_preferences" ADD CONSTRAINT "user_notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polls" ADD CONSTRAINT "polls_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polls" ADD CONSTRAINT "polls_scheduled_event_id_fkey" FOREIGN KEY ("scheduled_event_id") REFERENCES "scheduled_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polls" ADD CONSTRAINT "polls_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "polls" ADD CONSTRAINT "polls_poll_group_id_fkey" FOREIGN KEY ("poll_group_id") REFERENCES "poll_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participants" ADD CONSTRAINT "participants_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_invites" ADD CONSTRAINT "poll_invites_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_invites" ADD CONSTRAINT "poll_invites_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_activities" ADD CONSTRAINT "poll_activities_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "options" ADD CONSTRAINT "options_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_participant_id_fkey" FOREIGN KEY ("participant_id") REFERENCES "participants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_poll_id_fkey" FOREIGN KEY ("poll_id") REFERENCES "polls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_groups" ADD CONSTRAINT "poll_groups_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "poll_groups" ADD CONSTRAINT "poll_groups_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sheets" ADD CONSTRAINT "sheets_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sheets" ADD CONSTRAINT "sheets_host_id_fkey" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sheet_slots" ADD CONSTRAINT "sheet_slots_sheet_id_fkey" FOREIGN KEY ("sheet_id") REFERENCES "sheets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sheet_slots" ADD CONSTRAINT "sheet_slots_event_type_id_fkey" FOREIGN KEY ("event_type_id") REFERENCES "event_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "spaces" ADD CONSTRAINT "spaces_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_members" ADD CONSTRAINT "space_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_member_invites" ADD CONSTRAINT "space_member_invites_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_member_invites" ADD CONSTRAINT "space_member_invites_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "space_api_keys" ADD CONSTRAINT "space_api_keys_space_id_fkey" FOREIGN KEY ("space_id") REFERENCES "spaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_default_destination_calendar_id_fkey" FOREIGN KEY ("default_destination_calendar_id") REFERENCES "provider_calendars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_impersonated_by_fkey" FOREIGN KEY ("impersonated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

