export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      calendar_events: {
        Row: {
          created_at: string
          description: string | null
          end_time: string
          event_type: string
          id: string
          lead_id: string | null
          meeting_completed: boolean | null
          meeting_not_completed_reason: string | null
          start_time: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_time: string
          event_type?: string
          id?: string
          lead_id?: string | null
          meeting_completed?: boolean | null
          meeting_not_completed_reason?: string | null
          start_time: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_time?: string
          event_type?: string
          id?: string
          lead_id?: string | null
          meeting_completed?: boolean | null
          meeting_not_completed_reason?: string | null
          start_time?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calendar_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      distribution_config: {
        Row: {
          config_key: string
          config_value: number
          id: string
          updated_at: string
        }
        Insert: {
          config_key: string
          config_value?: number
          id?: string
          updated_at?: string
        }
        Update: {
          config_key?: string
          config_value?: number
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      financial_cash_entries: {
        Row: {
          amount: number
          check_id: string | null
          company: Database["public"]["Enums"]["company"]
          created_at: string
          created_by: string | null
          description: string | null
          entry_date: string
          id: string
          installment_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          sale_id: string | null
        }
        Insert: {
          amount: number
          check_id?: string | null
          company?: Database["public"]["Enums"]["company"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          id?: string
          installment_id?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          sale_id?: string | null
        }
        Update: {
          amount?: number
          check_id?: string | null
          company?: Database["public"]["Enums"]["company"]
          created_at?: string
          created_by?: string | null
          description?: string | null
          entry_date?: string
          id?: string
          installment_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          sale_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_cash_entries_check_id_fkey"
            columns: ["check_id"]
            isOneToOne: false
            referencedRelation: "financial_checks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_cash_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_cash_entries_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_cash_entries_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "financial_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_cash_entries_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "financial_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_checks: {
        Row: {
          actual_clear_date: string | null
          amount: number
          bank: string
          check_number: string
          company: Database["public"]["Enums"]["company"]
          created_at: string
          expected_clear_date: string
          id: string
          installment_id: string | null
          issuer: string
          notes: string | null
          sale_id: string | null
          status: Database["public"]["Enums"]["check_status"]
          updated_at: string
        }
        Insert: {
          actual_clear_date?: string | null
          amount: number
          bank: string
          check_number: string
          company?: Database["public"]["Enums"]["company"]
          created_at?: string
          expected_clear_date: string
          id?: string
          installment_id?: string | null
          issuer: string
          notes?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["check_status"]
          updated_at?: string
        }
        Update: {
          actual_clear_date?: string | null
          amount?: number
          bank?: string
          check_number?: string
          company?: Database["public"]["Enums"]["company"]
          created_at?: string
          expected_clear_date?: string
          id?: string
          installment_id?: string | null
          issuer?: string
          notes?: string | null
          sale_id?: string | null
          status?: Database["public"]["Enums"]["check_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_checks_installment_id_fkey"
            columns: ["installment_id"]
            isOneToOne: false
            referencedRelation: "financial_installments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_checks_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "financial_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_installments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          installment_number: number
          notes: string | null
          received_date: string | null
          sale_id: string
          status: Database["public"]["Enums"]["installment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          notes?: string | null
          received_date?: string | null
          sale_id: string
          status?: Database["public"]["Enums"]["installment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          notes?: string | null
          received_date?: string | null
          sale_id?: string
          status?: Database["public"]["Enums"]["installment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_installments_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "financial_sales"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_sales: {
        Row: {
          company: Database["public"]["Enums"]["company"]
          created_at: string
          created_by: string | null
          description: string
          id: string
          installments_count: number
          lead_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          received_amount: number | null
          total_amount: number
          updated_at: string
        }
        Insert: {
          company?: Database["public"]["Enums"]["company"]
          created_at?: string
          created_by?: string | null
          description: string
          id?: string
          installments_count?: number
          lead_id?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          received_amount?: number | null
          total_amount: number
          updated_at?: string
        }
        Update: {
          company?: Database["public"]["Enums"]["company"]
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          installments_count?: number
          lead_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          received_amount?: number | null
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_sales_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_sales_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_activities: {
        Row: {
          action: string
          created_at: string
          id: string
          lead_id: string
          new_status: Database["public"]["Enums"]["lead_status"] | null
          notes: string | null
          old_status: Database["public"]["Enums"]["lead_status"] | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          lead_id: string
          new_status?: Database["public"]["Enums"]["lead_status"] | null
          notes?: string | null
          old_status?: Database["public"]["Enums"]["lead_status"] | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          lead_id?: string
          new_status?: Database["public"]["Enums"]["lead_status"] | null
          notes?: string | null
          old_status?: Database["public"]["Enums"]["lead_status"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_activities_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          assigned_closer_id: string | null
          assigned_sdr_id: string | null
          city_state: string | null
          company: Database["public"]["Enums"]["company"]
          company_name: string
          created_at: string
          email: string | null
          full_name: string
          funnel_type: Database["public"]["Enums"]["funnel_type"]
          id: string
          last_contact_at: string | null
          loss_reason: string | null
          lost_at: string | null
          monthly_revenue: number | null
          needs_scheduling: boolean | null
          notes: string | null
          phone: string
          proposal_follow_up_at: string | null
          proposal_payment_method: string | null
          proposal_product: string | null
          proposal_value: number | null
          sale_admin_email: string | null
          sale_company_cnpj: string | null
          sale_confirmed_at: string | null
          sale_contract_sent: boolean | null
          sale_entry_value: number | null
          sale_first_check_date: string | null
          sale_installments: number | null
          sale_observations: string | null
          sale_payment_method: string | null
          sale_payment_received: boolean | null
          sale_remaining_value: number | null
          scheduling_pending_reason: string | null
          specialty: string | null
          status: Database["public"]["Enums"]["lead_status"]
          updated_at: string
          utm_campaign: string | null
          utm_content: string | null
          utm_medium: string | null
          utm_source: string | null
          utm_term: string | null
        }
        Insert: {
          assigned_closer_id?: string | null
          assigned_sdr_id?: string | null
          city_state?: string | null
          company?: Database["public"]["Enums"]["company"]
          company_name: string
          created_at?: string
          email?: string | null
          full_name: string
          funnel_type?: Database["public"]["Enums"]["funnel_type"]
          id?: string
          last_contact_at?: string | null
          loss_reason?: string | null
          lost_at?: string | null
          monthly_revenue?: number | null
          needs_scheduling?: boolean | null
          notes?: string | null
          phone: string
          proposal_follow_up_at?: string | null
          proposal_payment_method?: string | null
          proposal_product?: string | null
          proposal_value?: number | null
          sale_admin_email?: string | null
          sale_company_cnpj?: string | null
          sale_confirmed_at?: string | null
          sale_contract_sent?: boolean | null
          sale_entry_value?: number | null
          sale_first_check_date?: string | null
          sale_installments?: number | null
          sale_observations?: string | null
          sale_payment_method?: string | null
          sale_payment_received?: boolean | null
          sale_remaining_value?: number | null
          scheduling_pending_reason?: string | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Update: {
          assigned_closer_id?: string | null
          assigned_sdr_id?: string | null
          city_state?: string | null
          company?: Database["public"]["Enums"]["company"]
          company_name?: string
          created_at?: string
          email?: string | null
          full_name?: string
          funnel_type?: Database["public"]["Enums"]["funnel_type"]
          id?: string
          last_contact_at?: string | null
          loss_reason?: string | null
          lost_at?: string | null
          monthly_revenue?: number | null
          needs_scheduling?: boolean | null
          notes?: string | null
          phone?: string
          proposal_follow_up_at?: string | null
          proposal_payment_method?: string | null
          proposal_product?: string | null
          proposal_value?: number | null
          sale_admin_email?: string | null
          sale_company_cnpj?: string | null
          sale_confirmed_at?: string | null
          sale_contract_sent?: boolean | null
          sale_entry_value?: number | null
          sale_first_check_date?: string | null
          sale_installments?: number | null
          sale_observations?: string | null
          sale_payment_method?: string | null
          sale_payment_received?: boolean | null
          sale_remaining_value?: number | null
          scheduling_pending_reason?: string | null
          specialty?: string | null
          status?: Database["public"]["Enums"]["lead_status"]
          updated_at?: string
          utm_campaign?: string | null
          utm_content?: string | null
          utm_medium?: string | null
          utm_source?: string | null
          utm_term?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_assigned_closer_id_fkey"
            columns: ["assigned_closer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_assigned_closer_id_fkey"
            columns: ["assigned_closer_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_assigned_sdr_id_fkey"
            columns: ["assigned_sdr_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_assigned_sdr_id_fkey"
            columns: ["assigned_sdr_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string
          event_id: string | null
          id: string
          message: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          event_id?: string | null
          id?: string
          message: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          event_id?: string | null
          id?: string
          message?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "calendar_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_dashboard_goals: {
        Row: {
          goal_key: string
          goal_value: number
          id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          goal_key: string
          goal_value?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          goal_key?: string
          goal_value?: number
          id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tv_dashboard_goals_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tv_dashboard_goals_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by?: string | null
          role: Database["public"]["Enums"]["app_role"]
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string | null
          role?: Database["public"]["Enums"]["app_role"]
        }
        Relationships: [
          {
            foreignKeyName: "user_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invites_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          full_name: string | null
          id: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          full_name?: string | null
          id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_current_profile_id: { Args: never; Returns: string }
      get_next_closer: { Args: never; Returns: string }
      get_team_sales_totals: {
        Args: never
        Returns: {
          daily_sales: number
          money_on_table: number
          sales_total: number
          weekly_sales: number
        }[]
      }
      get_team_sales_totals_by_company: {
        Args: { target_company?: string }
        Returns: {
          daily_sales: number
          money_on_table: number
          sales_total: number
          weekly_sales: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_viewer_only: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "sdr" | "closer" | "admin" | "viewer"
      check_status: "pending" | "cleared" | "bounced"
      company: "escola_franchising" | "evidia"
      funnel_type: "padrao" | "franquia" | "formatacao"
      installment_status: "pending" | "received" | "overdue"
      lead_status:
        | "sem_atendimento"
        | "nao_atendeu"
        | "em_contato"
        | "qualificado"
        | "reuniao_marcada"
        | "envio_proposta"
        | "vendido"
        | "recuperacao_sdr"
        | "perdido"
      payment_method:
        | "pix"
        | "credit_card"
        | "debit_card"
        | "check"
        | "cash"
        | "other"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["sdr", "closer", "admin", "viewer"],
      check_status: ["pending", "cleared", "bounced"],
      company: ["escola_franchising", "evidia"],
      funnel_type: ["padrao", "franquia", "formatacao"],
      installment_status: ["pending", "received", "overdue"],
      lead_status: [
        "sem_atendimento",
        "nao_atendeu",
        "em_contato",
        "qualificado",
        "reuniao_marcada",
        "envio_proposta",
        "vendido",
        "recuperacao_sdr",
        "perdido",
      ],
      payment_method: [
        "pix",
        "credit_card",
        "debit_card",
        "check",
        "cash",
        "other",
      ],
    },
  },
} as const
