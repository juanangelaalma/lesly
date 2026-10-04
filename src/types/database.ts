export type BillingMode = "monthly" | "per_session";

export type Database = {
  public: {
    Tables: {
      teacher_profiles: {
        Row: {
          id: string;
          display_name: string;
          timezone: string;
          created_at: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          id: string;
          display_name?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          id?: string;
          display_name?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [];
      };
      students: {
        Row: {
          id: string;
          owner_id: string;
          name: string;
          grade: string | null;
          guardian_name: string | null;
          guardian_phone_e164: string | null;
          address_hint: string | null;
          starts_on: string;
          ends_on: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
          version: number;
        };
        Insert: {
          id?: string;
          owner_id: string;
          name: string;
          grade?: string | null;
          guardian_name?: string | null;
          guardian_phone_e164?: string | null;
          address_hint?: string | null;
          starts_on: string;
          ends_on?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          version?: number;
        };
        Update: {
          id?: string;
          owner_id?: string;
          name?: string;
          grade?: string | null;
          guardian_name?: string | null;
          guardian_phone_e164?: string | null;
          address_hint?: string | null;
          starts_on?: string;
          ends_on?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
          version?: number;
        };
        Relationships: [];
      };
      billing_plans: {
        Row: {
          id: string;
          owner_id: string;
          student_id: string;
          effective_month: string;
          mode: BillingMode;
          rate_rupiah: number;
          due_day: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          student_id: string;
          effective_month: string;
          mode: BillingMode;
          rate_rupiah: number;
          due_day?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          student_id?: string;
          effective_month?: string;
          mode?: BillingMode;
          rate_rupiah?: number;
          due_day?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      audit_events: {
        Row: {
          id: string;
          owner_id: string;
          entity_type: string;
          entity_id: string;
          action: string;
          actor_id: string;
          occurred_at: string;
          safe_diff: {
            version?: number;
            has_guardian_phone?: boolean;
            reason?: string;
          };
        };
        Insert: {
          id?: string;
          owner_id: string;
          entity_type: string;
          entity_id: string;
          action: string;
          actor_id: string;
          occurred_at?: string;
          safe_diff?: {
            version?: number;
            has_guardian_phone?: boolean;
            reason?: string;
          };
        };
        Update: {
          id?: string;
          owner_id?: string;
          entity_type?: string;
          entity_id?: string;
          action?: string;
          actor_id?: string;
          occurred_at?: string;
          safe_diff?: {
            version?: number;
            has_guardian_phone?: boolean;
            reason?: string;
          };
        };
        Relationships: [];
      };
    };
    Views: {};
    Functions: {
      save_teacher_profile: {
        Args: { p_display_name: string; p_timezone: string };
        Returns: number;
      };
      save_student: {
        Args: {
          p_student_id: string | null;
          p_expected_version: number | null;
          p_request_key: string;
          p_name: string;
          p_grade: string | null;
          p_guardian_name: string | null;
          p_guardian_phone_e164: string | null;
          p_address_hint: string | null;
          p_starts_on: string;
          p_effective_month: string | null;
          p_billing_mode: BillingMode | null;
          p_rate_rupiah: number | null;
          p_due_day: number | null;
        };
        Returns: string;
      };
      archive_student: {
        Args: { p_student_id: string; p_reason: string };
        Returns: boolean;
      };
    };
    Enums: {
      billing_mode: BillingMode;
    };
    CompositeTypes: {};
  };
};
