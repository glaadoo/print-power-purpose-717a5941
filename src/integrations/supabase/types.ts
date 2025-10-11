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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      causes: {
        Row: {
          created_at: string
          goal_cents: number
          id: string
          image_url: string | null
          name: string
          raised_cents: number
          summary: string | null
        }
        Insert: {
          created_at?: string
          goal_cents: number
          id?: string
          image_url?: string | null
          name: string
          raised_cents?: number
          summary?: string | null
        }
        Update: {
          created_at?: string
          goal_cents?: number
          id?: string
          image_url?: string | null
          name?: string
          raised_cents?: number
          summary?: string | null
        }
        Relationships: []
      }
      kenzie_messages: {
        Row: {
          content: string
          created_at: string
          id: number
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: number
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: number
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kenzie_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "kenzie_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      kenzie_sessions: {
        Row: {
          created_at: string
          id: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      orders: {
        Row: {
          amount_total_cents: number
          cause_id: string | null
          cause_name: string | null
          created_at: string
          currency: string
          customer_email: string | null
          donation_cents: number
          id: string
          order_number: string
          product_name: string | null
          quantity: number
          receipt_url: string | null
          session_id: string
          status: string
        }
        Insert: {
          amount_total_cents?: number
          cause_id?: string | null
          cause_name?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          donation_cents?: number
          id?: string
          order_number: string
          product_name?: string | null
          quantity?: number
          receipt_url?: string | null
          session_id: string
          status?: string
        }
        Update: {
          amount_total_cents?: number
          cause_id?: string | null
          cause_name?: string | null
          created_at?: string
          currency?: string
          customer_email?: string | null
          donation_cents?: number
          id?: string
          order_number?: string
          product_name?: string | null
          quantity?: number
          receipt_url?: string | null
          session_id?: string
          status?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          base_cost_cents: number
          category: string | null
          created_at: string
          id: string
          image_url: string | null
          name: string
          vendor: string
          vendor_id: string
        }
        Insert: {
          base_cost_cents: number
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          vendor?: string
          vendor_id: string
        }
        Update: {
          base_cost_cents?: number
          category?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          vendor?: string
          vendor_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      increment_cause_raised: {
        Args: { amount: number; cause_uuid: string }
        Returns: undefined
      }
      ppp_session_id: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
      require_ppp_session_id: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
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
  public: {
    Enums: {},
  },
} as const
