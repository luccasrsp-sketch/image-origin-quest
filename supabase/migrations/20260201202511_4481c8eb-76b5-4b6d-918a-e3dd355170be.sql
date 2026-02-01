-- Create table to store TV dashboard goals
CREATE TABLE public.tv_dashboard_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  goal_key text UNIQUE NOT NULL,
  goal_value numeric NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.tv_dashboard_goals ENABLE ROW LEVEL SECURITY;

-- Policies: everyone authenticated can read, only admins can update
CREATE POLICY "Authenticated users can view goals"
ON public.tv_dashboard_goals FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage goals"
ON public.tv_dashboard_goals FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Block anonymous access
CREATE POLICY "tv_dashboard_goals_require_auth_for_select"
ON public.tv_dashboard_goals AS RESTRICTIVE FOR SELECT
TO anon
USING (false);

-- Insert default goals
INSERT INTO public.tv_dashboard_goals (goal_key, goal_value) VALUES
  ('daily_sales_goal_value', 156250),
  ('weekly_sales_goal_value', 625000),
  ('monthly_sales_goal_value', 2500000),
  ('daily_goal_leads_received', 30),
  ('daily_goal_leads_attended', 25),
  ('daily_goal_meetings_marked', 10),
  ('daily_goal_meetings_done', 8),
  ('daily_goal_negotiations', 5),
  ('daily_goal_sales', 2);

-- Create trigger for updated_at
CREATE TRIGGER update_tv_dashboard_goals_updated_at
BEFORE UPDATE ON public.tv_dashboard_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();