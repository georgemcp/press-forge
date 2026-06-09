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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_management: {
        Row: {
          created_at: string
          email: string
          last_contact_at: string | null
          notes: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          last_contact_at?: string | null
          notes?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          last_contact_at?: string | null
          notes?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      admin_audit_events: {
        Row: {
          action: string
          actor: string
          created_at: string
          id: string
          metadata: Json
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          actor?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          actor?: string
          created_at?: string
          id?: string
          metadata?: Json
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      assets: {
        Row: {
          created_at: string
          dpi: number
          id: string
          is_vector: boolean
          kind: string
          layout_spec_id: string | null
          mime_type: string
          project_id: string
          provider: string
          updated_at: string
          uri: string
        }
        Insert: {
          created_at?: string
          dpi: number
          id?: string
          is_vector?: boolean
          kind: string
          layout_spec_id?: string | null
          mime_type: string
          project_id: string
          provider: string
          updated_at?: string
          uri: string
        }
        Update: {
          created_at?: string
          dpi?: number
          id?: string
          is_vector?: boolean
          kind?: string
          layout_spec_id?: string | null
          mime_type?: string
          project_id?: string
          provider?: string
          updated_at?: string
          uri?: string
        }
        Relationships: [
          {
            foreignKeyName: "assets_layout_spec_id_fkey"
            columns: ["layout_spec_id"]
            isOneToOne: false
            referencedRelation: "layout_specs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      credits_usage: {
        Row: {
          created_at: string
          delta: number
          export_id: string | null
          id: string
          reason: string
          stripe_session_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          export_id?: string | null
          id?: string
          reason: string
          stripe_session_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          export_id?: string | null
          id?: string
          reason?: string
          stripe_session_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credits_usage_export_id_fkey"
            columns: ["export_id"]
            isOneToOne: false
            referencedRelation: "exports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "credits_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      email_signups: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string
          updated_at?: string
        }
        Relationships: []
      }
      export_orders: {
        Row: {
          amount_total_cents: number | null
          checkout_mode: string
          consumed_at: string | null
          created_at: string
          currency: string | null
          customer_email: string | null
          entitlement: string
          id: string
          proof_job_id: string | null
          status: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_session_id: string
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          amount_total_cents?: number | null
          checkout_mode: string
          consumed_at?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          entitlement: string
          id?: string
          proof_job_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id: string
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_total_cents?: number | null
          checkout_mode?: string
          consumed_at?: string | null
          created_at?: string
          currency?: string | null
          customer_email?: string | null
          entitlement?: string
          id?: string
          proof_job_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_session_id?: string
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      exports: {
        Row: {
          created_at: string
          delivered_at: string | null
          icc_profile: string
          id: string
          layout_spec_id: string | null
          pdfx_level: string
          preflight_report: Json
          preview_uri: string | null
          project_id: string
          status: string
          updated_at: string
          uri: string | null
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          icc_profile: string
          id?: string
          layout_spec_id?: string | null
          pdfx_level: string
          preflight_report?: Json
          preview_uri?: string | null
          project_id: string
          status?: string
          updated_at?: string
          uri?: string | null
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          icc_profile?: string
          id?: string
          layout_spec_id?: string | null
          pdfx_level?: string
          preflight_report?: Json
          preview_uri?: string | null
          project_id?: string
          status?: string
          updated_at?: string
          uri?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exports_layout_spec_id_fkey"
            columns: ["layout_spec_id"]
            isOneToOne: false
            referencedRelation: "layout_specs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      layout_specs: {
        Row: {
          created_at: string
          id: string
          project_id: string
          schema_version: string
          spec: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          project_id: string
          schema_version?: string
          spec: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          project_id?: string
          schema_version?: string
          spec?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "layout_specs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      print_profiles: {
        Row: {
          code: string
          created_at: string
          icc_profile: string
          id: string
          label: string
          market: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          icc_profile: string
          id?: string
          label: string
          market: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          icc_profile?: string
          id?: string
          label?: string
          market?: string
          updated_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          id: string
          name: string
          product_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          product_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          product_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_export_usage: {
        Row: {
          created_at: string
          id: string
          period_end: string
          period_start: string
          proof_job_id: string
          status: string
          stripe_session_id: string
          stripe_subscription_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          proof_job_id: string
          status?: string
          stripe_session_id: string
          stripe_subscription_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          proof_job_id?: string
          status?: string
          stripe_session_id?: string
          stripe_subscription_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscription_export_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_designs: {
        Row: {
          id: string
          user_id: string
          name: string
          brief: string
          enhanced_brief: Json | null
          layout_spec: Json
          design_rationale: string | null
          product_type: string
          reference_image_urls: string[] | null
          iteration_count: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name?: string
          brief?: string
          enhanced_brief?: Json | null
          layout_spec: Json
          design_rationale?: string | null
          product_type?: string
          reference_image_urls?: string[] | null
          iteration_count?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          brief?: string
          enhanced_brief?: Json | null
          layout_spec?: Json
          design_rationale?: string | null
          product_type?: string
          reference_image_urls?: string[] | null
          iteration_count?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_designs_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      users: {
        Row: {
          company_name: string | null
          company_website: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          marketing_consent: boolean
          monthly_print_jobs: string | null
          onboarding_completed_at: string | null
          phone: string | null
          plan_interest: string | null
          primary_use_case: string | null
          role: string | null
          stripe_customer_id: string | null
          subscription_status: string
          updated_at: string
        }
        Insert: {
          company_name?: string | null
          company_website?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          marketing_consent?: boolean
          monthly_print_jobs?: string | null
          onboarding_completed_at?: string | null
          phone?: string | null
          plan_interest?: string | null
          primary_use_case?: string | null
          role?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string
          updated_at?: string
        }
        Update: {
          company_name?: string | null
          company_website?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          marketing_consent?: boolean
          monthly_print_jobs?: string | null
          onboarding_completed_at?: string | null
          phone?: string | null
          plan_interest?: string | null
          primary_use_case?: string | null
          role?: string | null
          stripe_customer_id?: string | null
          subscription_status?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const
