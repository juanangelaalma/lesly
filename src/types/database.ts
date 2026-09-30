export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
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
      audit_events: {
        Row: {
          action: string
          after_data: Json | null
          before_data: Json | null
          created_at: string
          entity_id: string
          entity_type: string
          id: number
          owner_id: string
          reason: string | null
        }
        Insert: {
          action: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id: string
          entity_type: string
          id?: never
          owner_id: string
          reason?: string | null
        }
        Update: {
          action?: string
          after_data?: Json | null
          before_data?: Json | null
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: never
          owner_id?: string
          reason?: string | null
        }
        Relationships: []
      }
      billing_plans: {
        Row: {
          amount: number
          created_at: string
          effective_from: string
          id: string
          mode: Database["public"]["Enums"]["billing_mode"]
          owner_id: string
          student_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          effective_from: string
          id?: string
          mode: Database["public"]["Enums"]["billing_mode"]
          owner_id: string
          student_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          effective_from?: string
          id?: string
          mode?: Database["public"]["Enums"]["billing_mode"]
          owner_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "billing_plans_student_id_owner_id_fkey"
            columns: ["student_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          invoice_id: string
          kind: Database["public"]["Enums"]["invoice_item_kind"]
          owner_id: string
          session_id: string | null
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          invoice_id: string
          kind: Database["public"]["Enums"]["invoice_item_kind"]
          owner_id: string
          session_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          invoice_id?: string
          kind?: Database["public"]["Enums"]["invoice_item_kind"]
          owner_id?: string
          session_id?: string | null
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_owner_id_fkey"
            columns: ["invoice_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "invoice_balances"
            referencedColumns: ["id", "owner_id"]
          },
          {
            foreignKeyName: "invoice_items_invoice_id_owner_id_fkey"
            columns: ["invoice_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id", "owner_id"]
          },
          {
            foreignKeyName: "invoice_items_session_id_owner_id_fkey"
            columns: ["session_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          id: string
          owner_id: string
          period: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_id: string
          period: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_id?: string
          period?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_student_id_owner_id_fkey"
            columns: ["student_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      learning_topics: {
        Row: {
          created_at: string
          id: string
          name: string
          normalized_name: string
          owner_id: string
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          normalized_name: string
          owner_id: string
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          normalized_name?: string
          owner_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_topics_student_id_owner_id_fkey"
            columns: ["student_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      mutation_requests: {
        Row: {
          created_at: string
          operation: string
          owner_id: string
          request_key: string
          result: Json
        }
        Insert: {
          created_at?: string
          operation: string
          owner_id: string
          request_key: string
          result: Json
        }
        Update: {
          created_at?: string
          operation?: string
          owner_id?: string
          request_key?: string
          result?: Json
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          id: string
          invoice_id: string
          method: Database["public"]["Enums"]["payment_method"]
          note: string | null
          owner_id: string
          paid_on: string
          status: Database["public"]["Enums"]["payment_status"]
          void_reason: string | null
          voided_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          invoice_id: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          owner_id: string
          paid_on: string
          status?: Database["public"]["Enums"]["payment_status"]
          void_reason?: string | null
          voided_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          invoice_id?: string
          method?: Database["public"]["Enums"]["payment_method"]
          note?: string | null
          owner_id?: string
          paid_on?: string
          status?: Database["public"]["Enums"]["payment_status"]
          void_reason?: string | null
          voided_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_owner_id_fkey"
            columns: ["invoice_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "invoice_balances"
            referencedColumns: ["id", "owner_id"]
          },
          {
            foreignKeyName: "payments_invoice_id_owner_id_fkey"
            columns: ["invoice_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      product_events: {
        Row: {
          created_at: string
          entity_id: string | null
          id: number
          name: string
          owner_id: string
        }
        Insert: {
          created_at?: string
          entity_id?: string | null
          id?: never
          name: string
          owner_id: string
        }
        Update: {
          created_at?: string
          entity_id?: string | null
          id?: never
          name?: string
          owner_id?: string
        }
        Relationships: []
      }
      schedule_rules: {
        Row: {
          active_from: string
          active_until: string | null
          created_at: string
          duration_minutes: number
          id: string
          owner_id: string
          start_time: string
          student_id: string
          weekday: number
        }
        Insert: {
          active_from: string
          active_until?: string | null
          created_at?: string
          duration_minutes: number
          id?: string
          owner_id: string
          start_time: string
          student_id: string
          weekday: number
        }
        Update: {
          active_from?: string
          active_until?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          owner_id?: string
          start_time?: string
          student_id?: string
          weekday?: number
        }
        Relationships: [
          {
            foreignKeyName: "schedule_rules_student_id_owner_id_fkey"
            columns: ["student_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      session_notes: {
        Row: {
          created_at: string
          note: string | null
          owner_id: string
          session_id: string
          topic_id: string
          understanding: Database["public"]["Enums"]["understanding_level"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          note?: string | null
          owner_id: string
          session_id: string
          topic_id: string
          understanding: Database["public"]["Enums"]["understanding_level"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          note?: string | null
          owner_id?: string
          session_id?: string
          topic_id?: string
          understanding?: Database["public"]["Enums"]["understanding_level"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_notes_session_id_owner_id_fkey"
            columns: ["session_id", "owner_id"]
            isOneToOne: true
            referencedRelation: "sessions"
            referencedColumns: ["id", "owner_id"]
          },
          {
            foreignKeyName: "session_notes_topic_id_owner_id_fkey"
            columns: ["topic_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "learning_topics"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      sessions: {
        Row: {
          completed_at: string | null
          created_at: string
          duration_minutes: number
          id: string
          occurrence_date: string | null
          owner_id: string
          rescheduled: boolean
          rule_id: string | null
          starts_at: string
          status: Database["public"]["Enums"]["session_status"]
          status_reason: string | null
          student_id: string
          updated_at: string
          version: number
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          duration_minutes: number
          id?: string
          occurrence_date?: string | null
          owner_id: string
          rescheduled?: boolean
          rule_id?: string | null
          starts_at: string
          status?: Database["public"]["Enums"]["session_status"]
          status_reason?: string | null
          student_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          id?: string
          occurrence_date?: string | null
          owner_id?: string
          rescheduled?: boolean
          rule_id?: string | null
          starts_at?: string
          status?: Database["public"]["Enums"]["session_status"]
          status_reason?: string | null
          student_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "sessions_rule_id_owner_id_fkey"
            columns: ["rule_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "schedule_rules"
            referencedColumns: ["id", "owner_id"]
          },
          {
            foreignKeyName: "sessions_student_id_owner_id_fkey"
            columns: ["student_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
      students: {
        Row: {
          address: string | null
          archived_at: string | null
          created_at: string
          grade: string | null
          guardian_name: string | null
          guardian_phone: string | null
          id: string
          name: string
          notes: string | null
          owner_id: string
          status: Database["public"]["Enums"]["student_status"]
          subject: string | null
          updated_at: string
          version: number
        }
        Insert: {
          address?: string | null
          archived_at?: string | null
          created_at?: string
          grade?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          name: string
          notes?: string | null
          owner_id: string
          status?: Database["public"]["Enums"]["student_status"]
          subject?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          address?: string | null
          archived_at?: string | null
          created_at?: string
          grade?: string | null
          guardian_name?: string | null
          guardian_phone?: string | null
          id?: string
          name?: string
          notes?: string | null
          owner_id?: string
          status?: Database["public"]["Enums"]["student_status"]
          subject?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      teacher_profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          onboarded_at: string | null
          phone: string | null
          report_signature: string | null
          timezone: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          onboarded_at?: string | null
          phone?: string | null
          report_signature?: string | null
          timezone?: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          onboarded_at?: string | null
          phone?: string | null
          report_signature?: string | null
          timezone?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
    }
    Views: {
      invoice_balances: {
        Row: {
          balance: number | null
          id: string | null
          owner_id: string | null
          paid: number | null
          period: string | null
          status: string | null
          student_id: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "invoices_student_id_owner_id_fkey"
            columns: ["student_id", "owner_id"]
            isOneToOne: false
            referencedRelation: "students"
            referencedColumns: ["id", "owner_id"]
          },
        ]
      }
    }
    Functions: {
      add_invoice_item: {
        Args: {
          p_amount: number
          p_description: string
          p_invoice_id: string
          p_kind: Database["public"]["Enums"]["invoice_item_kind"]
          p_request_key: string
        }
        Returns: Json
      }
      add_schedule_rule: {
        Args: {
          p_active_from: string
          p_duration_minutes: number
          p_start_time: string
          p_student_id: string
          p_weekday: number
        }
        Returns: Json
      }
      complete_session: {
        Args: {
          p_actual_starts_at?: string
          p_expected_version: number
          p_note: string
          p_request_key: string
          p_session_id: string
          p_topic_name: string
          p_understanding: Database["public"]["Enums"]["understanding_level"]
        }
        Returns: Json
      }
      create_session: {
        Args: {
          p_duration_minutes: number
          p_request_key: string
          p_starts_at: string
          p_student_id: string
        }
        Returns: Json
      }
      create_student: {
        Args: {
          p_address: string
          p_amount: number
          p_billing_mode: Database["public"]["Enums"]["billing_mode"]
          p_effective_from: string
          p_grade: string
          p_guardian_name: string
          p_guardian_phone: string
          p_name: string
          p_notes: string
          p_request_key: string
          p_subject: string
        }
        Returns: Json
      }
      end_schedule_rule: {
        Args: { p_rule_id: string; p_until: string }
        Returns: Json
      }
      ensure_invoices: { Args: { p_period: string }; Returns: Json }
      ensure_schedule_window: {
        Args: { p_from: string; p_to: string }
        Returns: Json
      }
      log_product_event: {
        Args: { p_entity_id: string; p_name: string }
        Returns: undefined
      }
      record_payment: {
        Args: {
          p_amount: number
          p_invoice_id: string
          p_method: Database["public"]["Enums"]["payment_method"]
          p_note: string
          p_paid_on: string
          p_request_key: string
        }
        Returns: Json
      }
      reopen_session: {
        Args: {
          p_expected_version: number
          p_reason: string
          p_session_id: string
        }
        Returns: Json
      }
      reschedule_session: {
        Args: {
          p_duration_minutes: number
          p_expected_version: number
          p_session_id: string
          p_starts_at: string
        }
        Returns: Json
      }
      set_billing_plan: {
        Args: {
          p_amount: number
          p_effective_from: string
          p_mode: Database["public"]["Enums"]["billing_mode"]
          p_student_id: string
        }
        Returns: Json
      }
      set_session_status: {
        Args: {
          p_expected_version: number
          p_reason: string
          p_session_id: string
          p_status: Database["public"]["Enums"]["session_status"]
        }
        Returns: Json
      }
      set_student_status: {
        Args: {
          p_expected_version: number
          p_status: Database["public"]["Enums"]["student_status"]
          p_student_id: string
        }
        Returns: Json
      }
      update_session_note: {
        Args: {
          p_expected_version: number
          p_note: string
          p_session_id: string
          p_topic_name: string
          p_understanding: Database["public"]["Enums"]["understanding_level"]
        }
        Returns: Json
      }
      update_student: {
        Args: {
          p_address: string
          p_expected_version: number
          p_grade: string
          p_guardian_name: string
          p_guardian_phone: string
          p_name: string
          p_notes: string
          p_student_id: string
          p_subject: string
        }
        Returns: Json
      }
      update_teacher_profile: {
        Args: {
          p_display_name: string
          p_phone: string
          p_report_signature: string
          p_timezone: string
        }
        Returns: Json
      }
      void_invoice_item: {
        Args: { p_item_id: string; p_reason: string }
        Returns: Json
      }
      void_payment: {
        Args: { p_payment_id: string; p_reason: string }
        Returns: Json
      }
    }
    Enums: {
      billing_mode: "monthly" | "per_session"
      invoice_item_kind:
        | "monthly"
        | "session"
        | "opening_balance"
        | "adjustment"
      payment_method: "cash" | "transfer" | "other"
      payment_status: "posted" | "void"
      session_status:
        | "scheduled"
        | "completed"
        | "student_absent"
        | "teacher_cancelled"
      student_status: "active" | "archived"
      understanding_level: "independent" | "assisted" | "repeat"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
    Enums: {
      billing_mode: ["monthly", "per_session"],
      invoice_item_kind: [
        "monthly",
        "session",
        "opening_balance",
        "adjustment",
      ],
      payment_method: ["cash", "transfer", "other"],
      payment_status: ["posted", "void"],
      session_status: [
        "scheduled",
        "completed",
        "student_absent",
        "teacher_cancelled",
      ],
      student_status: ["active", "archived"],
      understanding_level: ["independent", "assisted", "repeat"],
    },
  },
} as const

