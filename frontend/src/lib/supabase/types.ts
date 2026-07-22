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
      appointments: {
        Row: {
          ai_raw_input: string | null
          appointment_date: string
          clinic_id: string
          created_at: string | null
          id: string
          notes: string | null
          patient_id: string
          professional_id: string
          reason: string | null
          status: Database["public"]["Enums"]["appointment_status"] | null
          treatment_id: string | null
        }
        Insert: {
          ai_raw_input?: string | null
          appointment_date: string
          clinic_id: string
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id: string
          professional_id: string
          reason?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
          treatment_id?: string | null
        }
        Update: {
          ai_raw_input?: string | null
          appointment_date?: string
          clinic_id?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          patient_id?: string
          professional_id?: string
          reason?: string | null
          status?: Database["public"]["Enums"]["appointment_status"] | null
          treatment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_professional_id_fkey"
            columns: ["professional_id"]
            isOneToOne: false
            referencedRelation: "professionals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_records: {
        Row: {
          applied_commission_rate: number | null
          applied_lab_discount_rate: number | null
          appointment_id: string
          billing_month: string
          calculated_total: number | null
          created_at: string | null
          custom_price: number | null
          id: string
          notes: string | null
          odoo_invoice_id: number | null
          odoo_invoice_number: string | null
          odoo_invoice_state: string | null
          odoo_synced_at: string | null
          payment_method: string | null
          status: Database["public"]["Enums"]["billing_status"] | null
        }
        Insert: {
          applied_commission_rate?: number | null
          applied_lab_discount_rate?: number | null
          appointment_id: string
          billing_month: string
          calculated_total?: number | null
          created_at?: string | null
          custom_price?: number | null
          id?: string
          notes?: string | null
          odoo_invoice_id?: number | null
          odoo_invoice_number?: string | null
          odoo_invoice_state?: string | null
          odoo_synced_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["billing_status"] | null
        }
        Update: {
          applied_commission_rate?: number | null
          applied_lab_discount_rate?: number | null
          appointment_id?: string
          billing_month?: string
          calculated_total?: number | null
          created_at?: string | null
          custom_price?: number | null
          id?: string
          notes?: string | null
          odoo_invoice_id?: number | null
          odoo_invoice_number?: string | null
          odoo_invoice_state?: string | null
          odoo_synced_at?: string | null
          payment_method?: string | null
          status?: Database["public"]["Enums"]["billing_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_records_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: true
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_treatments: {
        Row: {
          clinic_id: string
          created_at: string | null
          id: string
          is_active: boolean | null
          odoo_last_sync_at: string | null
          odoo_product_id: number | null
          odoo_product_tmpl_id: number | null
          price: number
          treatment_id: string
          updated_at: string | null
        }
        Insert: {
          clinic_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          odoo_last_sync_at?: string | null
          odoo_product_id?: number | null
          odoo_product_tmpl_id?: number | null
          price?: number
          treatment_id: string
          updated_at?: string | null
        }
        Update: {
          clinic_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          odoo_last_sync_at?: string | null
          odoo_product_id?: number | null
          odoo_product_tmpl_id?: number | null
          price?: number
          treatment_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_treatments_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_treatments_treatment_id_fkey"
            columns: ["treatment_id"]
            isOneToOne: false
            referencedRelation: "treatments"
            referencedColumns: ["id"]
          },
        ]
      }
      clinics: {
        Row: {
          address: string | null
          created_at: string | null
          email: string | null
          id: string
          lab_expense_discount_percentage: number | null
          name: string
          phone: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          lab_expense_discount_percentage?: number | null
          name: string
          phone?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          lab_expense_discount_percentage?: number | null
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          appointment_id: string | null
          created_at: string | null
          description: string | null
          document_type: Database["public"]["Enums"]["document_type"] | null
          file_name: string
          file_path: string
          file_size_bytes: number | null
          file_url: string | null
          id: string
          mime_type: string | null
          patient_id: string
          uploaded_by: string | null
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string | null
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          patient_id: string
          uploaded_by?: string | null
        }
        Update: {
          appointment_id?: string | null
          created_at?: string | null
          description?: string | null
          document_type?: Database["public"]["Enums"]["document_type"] | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          file_url?: string | null
          id?: string
          mime_type?: string | null
          patient_id?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "documents_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_clinics: {
        Row: {
          assigned_at: string | null
          clinic_id: string
          id: string
          is_primary: boolean | null
          patient_id: string
        }
        Insert: {
          assigned_at?: string | null
          clinic_id: string
          id?: string
          is_primary?: boolean | null
          patient_id: string
        }
        Update: {
          assigned_at?: string | null
          clinic_id?: string
          id?: string
          is_primary?: boolean | null
          patient_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_clinics_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_clinics_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_representatives: {
        Row: {
          created_at: string | null
          dni_nie: string | null
          email: string | null
          full_name: string
          id: string
          is_primary_contact: boolean | null
          patient_id: string
          phone: string | null
          relationship: string | null
        }
        Insert: {
          created_at?: string | null
          dni_nie?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_primary_contact?: boolean | null
          patient_id: string
          phone?: string | null
          relationship?: string | null
        }
        Update: {
          created_at?: string | null
          dni_nie?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_primary_contact?: boolean | null
          patient_id?: string
          phone?: string | null
          relationship?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_representatives_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          ai_summary: string | null
          ai_summary_updated_at: string | null
          allergies: string | null
          billing_address: string | null
          billing_city: string | null
          billing_country: string | null
          billing_name: string | null
          billing_postal_code: string | null
          created_at: string | null
          current_medication: string | null
          dni_nie: string | null
          dob: string | null
          email: string | null
          first_name: string
          gender: string | null
          historia_id: string | null
          id: string
          important_diseases: string | null
          in_treatment: boolean | null
          last_name: string
          nif_cif: string | null
          odoo_partner_id: number | null
          phone: string | null
          previous_operations: string | null
          treatment_plan: string | null
        }
        Insert: {
          address?: string | null
          ai_summary?: string | null
          ai_summary_updated_at?: string | null
          allergies?: string | null
          billing_address?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_name?: string | null
          billing_postal_code?: string | null
          created_at?: string | null
          current_medication?: string | null
          dni_nie?: string | null
          dob?: string | null
          email?: string | null
          first_name: string
          gender?: string | null
          historia_id?: string | null
          id?: string
          important_diseases?: string | null
          in_treatment?: boolean | null
          last_name: string
          nif_cif?: string | null
          odoo_partner_id?: number | null
          phone?: string | null
          previous_operations?: string | null
          treatment_plan?: string | null
        }
        Update: {
          address?: string | null
          ai_summary?: string | null
          ai_summary_updated_at?: string | null
          allergies?: string | null
          billing_address?: string | null
          billing_city?: string | null
          billing_country?: string | null
          billing_name?: string | null
          billing_postal_code?: string | null
          created_at?: string | null
          current_medication?: string | null
          dni_nie?: string | null
          dob?: string | null
          email?: string | null
          first_name?: string
          gender?: string | null
          historia_id?: string | null
          id?: string
          important_diseases?: string | null
          in_treatment?: boolean | null
          last_name?: string
          nif_cif?: string | null
          odoo_partner_id?: number | null
          phone?: string | null
          previous_operations?: string | null
          treatment_plan?: string | null
        }
        Relationships: []
      }
      payment_installments: {
        Row: {
          amount: number
          billing_record_id: string | null
          created_at: string | null
          description: string | null
          due_date: string
          id: string
          notes: string | null
          odoo_invoice_id: number | null
          paid_at: string | null
          patient_id: string
          payment_method: string | null
          status: Database["public"]["Enums"]["installment_status"] | null
        }
        Insert: {
          amount: number
          billing_record_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date: string
          id?: string
          notes?: string | null
          odoo_invoice_id?: number | null
          paid_at?: string | null
          patient_id: string
          payment_method?: string | null
          status?: Database["public"]["Enums"]["installment_status"] | null
        }
        Update: {
          amount?: number
          billing_record_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string
          id?: string
          notes?: string | null
          odoo_invoice_id?: number | null
          paid_at?: string | null
          patient_id?: string
          payment_method?: string | null
          status?: Database["public"]["Enums"]["installment_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_installments_billing_record_id_fkey"
            columns: ["billing_record_id"]
            isOneToOne: false
            referencedRelation: "billing_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_installments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      professionals: {
        Row: {
          base_commission_percentage: number | null
          clinic_id: string | null
          created_at: string | null
          email: string | null
          first_name: string
          id: string
          last_name: string
          phone: string | null
          specialty: string | null
        }
        Insert: {
          base_commission_percentage?: number | null
          clinic_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name: string
          id?: string
          last_name: string
          phone?: string | null
          specialty?: string | null
        }
        Update: {
          base_commission_percentage?: number | null
          clinic_id?: string | null
          created_at?: string | null
          email?: string | null
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          specialty?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "professionals_clinic_id_fkey"
            columns: ["clinic_id"]
            isOneToOne: false
            referencedRelation: "clinics"
            referencedColumns: ["id"]
          },
        ]
      }
      reminder_events: {
        Row: {
          created_at: string | null
          description: string | null
          event_type: string
          id: string
          metadata: Json | null
          reminder_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          event_type: string
          id?: string
          metadata?: Json | null
          reminder_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          event_type?: string
          id?: string
          metadata?: Json | null
          reminder_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminder_events_reminder_id_fkey"
            columns: ["reminder_id"]
            isOneToOne: false
            referencedRelation: "reminders"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          appointment_id: string | null
          channel: Database["public"]["Enums"]["reminder_channel"] | null
          created_at: string | null
          created_by: string | null
          error_message: string | null
          id: string
          message: string
          n8n_execution_id: string | null
          patient_id: string
          reminder_type: Database["public"]["Enums"]["reminder_type"] | null
          scheduled_at: string
          sent_at: string | null
          status: Database["public"]["Enums"]["reminder_status"] | null
          subject: string | null
        }
        Insert: {
          appointment_id?: string | null
          channel?: Database["public"]["Enums"]["reminder_channel"] | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          message: string
          n8n_execution_id?: string | null
          patient_id: string
          reminder_type?: Database["public"]["Enums"]["reminder_type"] | null
          scheduled_at: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"] | null
          subject?: string | null
        }
        Update: {
          appointment_id?: string | null
          channel?: Database["public"]["Enums"]["reminder_channel"] | null
          created_at?: string | null
          created_by?: string | null
          error_message?: string | null
          id?: string
          message?: string
          n8n_execution_id?: string | null
          patient_id?: string
          reminder_type?: Database["public"]["Enums"]["reminder_type"] | null
          scheduled_at?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["reminder_status"] | null
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      treatments: {
        Row: {
          created_at: string | null
          default_price: number | null
          id: string
          lab_cost: number | null
          service_name: string
          service_type: string | null
        }
        Insert: {
          created_at?: string | null
          default_price?: number | null
          id?: string
          lab_cost?: number | null
          service_name: string
          service_type?: string | null
        }
        Update: {
          created_at?: string | null
          default_price?: number | null
          id?: string
          lab_cost?: number | null
          service_name?: string
          service_type?: string | null
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
      appointment_status: "Pendiente" | "Confirmada" | "Realizada" | "Cancelada"
      billing_status: "Pendiente" | "Aprobado" | "Facturado Odoo"
      document_type:
        | "consentimiento"
        | "radiografia"
        | "foto_clinica"
        | "presupuesto"
        | "plan_tratamiento"
        | "informe"
        | "otro"
      installment_status: "pendiente" | "pagado" | "vencido" | "cancelado"
      reminder_channel: "email" | "telegram" | "web" | "sms"
      reminder_status: "pendiente" | "enviado" | "error" | "leido" | "cancelado"
      reminder_type:
        | "cambio_alineador"
        | "confirmar_cita"
        | "recordatorio_cita"
        | "pago_pendiente"
        | "seguimiento"
        | "personalizado"
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
    Enums: {
      appointment_status: ["Pendiente", "Confirmada", "Realizada", "Cancelada"],
      billing_status: ["Pendiente", "Aprobado", "Facturado Odoo"],
      document_type: [
        "consentimiento",
        "radiografia",
        "foto_clinica",
        "presupuesto",
        "plan_tratamiento",
        "informe",
        "otro",
      ],
      installment_status: ["pendiente", "pagado", "vencido", "cancelado"],
      reminder_channel: ["email", "telegram", "web", "sms"],
      reminder_status: ["pendiente", "enviado", "error", "leido", "cancelado"],
      reminder_type: [
        "cambio_alineador",
        "confirmar_cita",
        "recordatorio_cita",
        "pago_pendiente",
        "seguimiento",
        "personalizado",
      ],
    },
  },
} as const
