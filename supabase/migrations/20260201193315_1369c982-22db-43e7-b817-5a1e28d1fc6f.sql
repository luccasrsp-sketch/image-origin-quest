-- SECURITY FIX: Explicitly require authentication on all sensitive tables
-- This prevents any anonymous access even if other policies exist

-- 1. LEADS - Require auth for SELECT (block anonymous scraping)
CREATE POLICY "leads_require_auth_for_select"
ON public.leads
FOR SELECT
TO anon
USING (false);

-- 2. PROFILES - Require auth for SELECT
CREATE POLICY "profiles_require_auth_for_select"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- 3. LEAD_ACTIVITIES - Require auth for SELECT
CREATE POLICY "lead_activities_require_auth_for_select"
ON public.lead_activities
FOR SELECT
TO anon
USING (false);

-- 4. FINANCIAL_SALES - Require auth for SELECT
CREATE POLICY "financial_sales_require_auth_for_select"
ON public.financial_sales
FOR SELECT
TO anon
USING (false);

-- 5. FINANCIAL_INSTALLMENTS - Require auth for SELECT
CREATE POLICY "financial_installments_require_auth_for_select"
ON public.financial_installments
FOR SELECT
TO anon
USING (false);

-- 6. FINANCIAL_CHECKS - Require auth for SELECT
CREATE POLICY "financial_checks_require_auth_for_select"
ON public.financial_checks
FOR SELECT
TO anon
USING (false);

-- 7. FINANCIAL_CASH_ENTRIES - Require auth for SELECT
CREATE POLICY "financial_cash_entries_require_auth_for_select"
ON public.financial_cash_entries
FOR SELECT
TO anon
USING (false);

-- 8. PUSH_SUBSCRIPTIONS - Require auth for SELECT
CREATE POLICY "push_subscriptions_require_auth_for_select"
ON public.push_subscriptions
FOR SELECT
TO anon
USING (false);

-- 9. NOTIFICATIONS - Require auth for SELECT
CREATE POLICY "notifications_require_auth_for_select"
ON public.notifications
FOR SELECT
TO anon
USING (false);

-- 10. CALENDAR_EVENTS - Require auth for SELECT
CREATE POLICY "calendar_events_require_auth_for_select"
ON public.calendar_events
FOR SELECT
TO anon
USING (false);

-- 11. USER_ROLES - Already has proper policies but add explicit block
CREATE POLICY "user_roles_require_auth_for_select"
ON public.user_roles
FOR SELECT
TO anon
USING (false);

-- 12. USER_INVITES - Require auth for SELECT
CREATE POLICY "user_invites_require_auth_for_select"
ON public.user_invites
FOR SELECT
TO anon
USING (false);

-- 13. DISTRIBUTION_CONFIG - Require auth for SELECT
CREATE POLICY "distribution_config_require_auth_for_select"
ON public.distribution_config
FOR SELECT
TO anon
USING (false);