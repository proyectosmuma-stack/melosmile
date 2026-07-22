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
      patients: {
        Row: {
          address: string | null
          allergies: string | null
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
          phone: string | null
          previous_operations: string | null
          treatment_plan: string | null
        }
        Insert: {
          address?: string | null
          allergies?: string | null
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
          phone?: string | null
          previous_operations?: string | null
          treatment_plan?: string | null
        }
        Update: {
          address?: string | null
          allergies?: string | null
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
          phone?: string | null
          previous_operations?: string | null
          treatment_plan?: string | null
        }
        Relationships: []
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
    },
  },
} as const
