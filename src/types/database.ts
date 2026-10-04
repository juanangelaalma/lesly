export type BillingMode = "monthly" | "per_session";

export type SessionState =
  "scheduled" | "completed" | "student_absent" | "teacher_cancelled";

export type LearningUnderstanding = "independent" | "assisted" | "repeat";

export type InvoiceLifecycle = "active" | "void";

export type InvoiceItemKind =
  "monthly" | "session" | "opening_balance" | "adjustment";

export type InvoiceItemState = "active" | "void";

export type PaymentMethod = "cash" | "bank_transfer";

export type PaymentState = "posted" | "void";

type ReadTable<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

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
      schedule_rules: ReadTable<{
        id: string;
        owner_id: string;
        student_id: string;
        weekday: number;
        local_start: string;
        duration_minutes: number;
        effective_from: string;
        effective_until: string | null;
        timezone: string;
        active: boolean;
        created_at: string;
      }>;
      sessions: ReadTable<{
        id: string;
        owner_id: string;
        student_id: string;
        schedule_rule_id: string | null;
        occurrence_date: string | null;
        starts_at: string;
        ends_at: string;
        state: SessionState;
        manually_rescheduled: boolean;
        replacement_for: string | null;
        completed_at: string | null;
        created_at: string;
        updated_at: string;
        version: number;
      }>;
      learning_topics: ReadTable<{
        id: string;
        owner_id: string;
        student_id: string;
        name: string;
        normalized_name: string;
        archived_at: string | null;
        created_at: string;
      }>;
      session_notes: ReadTable<{
        id: string;
        owner_id: string;
        student_id: string;
        session_id: string;
        topic_id: string;
        understanding: LearningUnderstanding;
        note: string | null;
        version: number;
        created_at: string;
        updated_at: string;
      }>;
      session_note_revisions: ReadTable<{
        id: string;
        owner_id: string;
        note_id: string;
        topic_name: string;
        understanding: LearningUnderstanding;
        note: string | null;
        reason: string | null;
        changed_by: string;
        changed_at: string;
      }>;
      invoices: ReadTable<{
        id: string;
        owner_id: string;
        student_id: string;
        period_start: string;
        mode_snapshot: BillingMode;
        due_date: string;
        invoice_number: string;
        lifecycle: InvoiceLifecycle;
        created_at: string;
        updated_at: string;
        version: number;
      }>;
      invoice_items: ReadTable<{
        id: string;
        owner_id: string;
        invoice_id: string;
        student_id: string;
        session_id: string | null;
        plan_id: string | null;
        kind: InvoiceItemKind;
        amount_rupiah: number;
        description: string;
        reason: string | null;
        state: InvoiceItemState;
        created_at: string;
        voided_at: string | null;
      }>;
      payments: ReadTable<{
        id: string;
        owner_id: string;
        invoice_id: string;
        amount_rupiah: number;
        received_on: string;
        method: PaymentMethod;
        state: PaymentState;
        void_reason: string | null;
        voided_at: string | null;
        created_at: string;
      }>;
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
      ensure_schedule_window: {
        Args: { p_from: string; p_to: string };
        Returns: number;
      };
      create_schedule_rule: {
        Args: {
          p_student_id: string;
          p_weekday: number;
          p_local_start: string;
          p_duration_minutes: number;
          p_effective_from: string;
          p_effective_until: string | null;
        };
        Returns: string;
      };
      end_schedule_rule: {
        Args: { p_rule_id: string; p_effective_until: string };
        Returns: boolean;
      };
      create_adhoc_session: {
        Args: {
          p_student_id: string;
          p_starts_at: string;
          p_ends_at: string;
        };
        Returns: string;
      };
      reschedule_session: {
        Args: {
          p_session_id: string;
          p_expected_version: number;
          p_starts_at: string;
          p_ends_at: string;
        };
        Returns: number;
      };
      set_session_nonbillable: {
        Args: {
          p_session_id: string;
          p_expected_version: number;
          p_state: SessionState;
          p_reason: string;
        };
        Returns: number;
      };
      ensure_invoices: {
        Args: { p_period_from: string; p_period_to: string };
        Returns: number;
      };
      complete_session: {
        Args: {
          p_session_id: string;
          p_expected_version: number;
          p_request_key: string;
          p_topic_name: string;
          p_understanding: LearningUnderstanding;
          p_note: string | null;
        };
        Returns: string;
      };
      update_session_note: {
        Args: {
          p_note_id: string;
          p_expected_version: number;
          p_topic_name: string;
          p_understanding: LearningUnderstanding;
          p_note: string | null;
          p_reason: string;
        };
        Returns: number;
      };
      reopen_session: {
        Args: {
          p_session_id: string;
          p_expected_version: number;
          p_reason: string;
        };
        Returns: number;
      };
      record_payment: {
        Args: {
          p_invoice_id: string;
          p_amount_rupiah: number;
          p_received_on: string;
          p_method: PaymentMethod;
          p_request_key: string;
        };
        Returns: string;
      };
      void_payment: {
        Args: {
          p_payment_id: string;
          p_reason: string;
          p_request_key: string;
        };
        Returns: boolean;
      };
      add_invoice_adjustment: {
        Args: {
          p_invoice_id: string;
          p_kind: InvoiceItemKind;
          p_amount_signed: number;
          p_description: string;
          p_reason: string;
          p_request_key: string;
        };
        Returns: string;
      };
    };
    Enums: {
      billing_mode: BillingMode;
      session_state: SessionState;
      learning_understanding: LearningUnderstanding;
      invoice_lifecycle: InvoiceLifecycle;
      invoice_item_kind: InvoiceItemKind;
      invoice_item_state: InvoiceItemState;
      payment_method: PaymentMethod;
      payment_state: PaymentState;
    };
    CompositeTypes: {};
  };
};
