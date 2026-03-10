-- ============================================================
-- CAN Simulator SaaS — Supabase Schema Migration
-- Apply in: Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. PROFILES (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username        TEXT UNIQUE,
    display_name    TEXT,
    avatar_url      TEXT,
    role            TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('guest','user','premium','admin')),

    -- Subscription
    current_plan        TEXT NOT NULL DEFAULT 'free' CHECK (current_plan IN ('free','pro','team','enterprise')),
    subscription_tier   TEXT NOT NULL DEFAULT 'free',
    subscription_id     TEXT,
    tier_updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Usage Quotas
    commands_used_this_month    INT NOT NULL DEFAULT 0,
    monthly_command_limit       INT NOT NULL DEFAULT 399,
    last_quota_reset            TIMESTAMPTZ NOT NULL DEFAULT DATE_TRUNC('month', NOW()),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. SUBSCRIPTIONS (Razorpay webhook ledger)
CREATE TABLE IF NOT EXISTS public.subscriptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    razorpay_sub_id     TEXT UNIQUE NOT NULL,
    razorpay_plan_id    TEXT NOT NULL,
    plan_name           TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','authenticated','active','pending','halted','cancelled','completed','expired')),
    current_start       TIMESTAMPTZ,
    current_end         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. USAGE LOGS (per-event command tracking)
CREATE TABLE IF NOT EXISTS public.usage_logs (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_type  TEXT NOT NULL,  -- 'frame_sent', 'arbitration_run', 'export_pdf', etc.
    metadata    JSONB,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. COOKIE CONSENT LOGS (GDPR)
CREATE TABLE IF NOT EXISTS public.cookie_consent_logs (
    id                  BIGSERIAL PRIMARY KEY,
    user_id             TEXT NOT NULL,
    decision            TEXT NOT NULL CHECK (decision IN ('accept_all','reject_all','custom')),
    consent_essential   BOOLEAN NOT NULL DEFAULT true,
    consent_functional  BOOLEAN NOT NULL DEFAULT false,
    consent_analytics   BOOLEAN NOT NULL DEFAULT false,
    banner_version      TEXT,
    user_agent          TEXT,
    url                 TEXT,
    timestamp           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. CONTACT FORM SUBMISSIONS
CREATE TABLE IF NOT EXISTS public.contact_submissions (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT NOT NULL,
    subject     TEXT,
    message     TEXT NOT NULL,
    user_id     UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cookie_consent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_submissions ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read/update only their own row; admins see all
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Subscriptions: users see only their own
CREATE POLICY "subscriptions_select_own" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id);

-- Usage logs: users see only their own
CREATE POLICY "usage_logs_select_own" ON public.usage_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "usage_logs_insert_own" ON public.usage_logs FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Cookie logs: open insert (no auth needed), service role owns reads
CREATE POLICY "cookie_consent_insert" ON public.cookie_consent_logs FOR INSERT WITH CHECK (true);

-- Contact: open insert, service role reads
CREATE POLICY "contact_insert" ON public.contact_submissions FOR INSERT WITH CHECK (true);

-- ============================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.raw_user_meta_data->>'username',
        NEW.raw_user_meta_data->>'avatar_url'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Auto-reset monthly quota
CREATE OR REPLACE FUNCTION public.reset_monthly_quotas()
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET
        commands_used_this_month = 0,
        last_quota_reset = DATE_TRUNC('month', NOW())
    WHERE
        DATE_TRUNC('month', last_quota_reset) < DATE_TRUNC('month', NOW());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Updated_at helper
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();
