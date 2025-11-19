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
      admin_access_logs: {
        Row: {
          attempt_time: string
          created_at: string
          id: string
          ip_address: string | null
          notes: string | null
          path: string
          provided_key: string | null
          reason: string
          success: boolean
          user_agent: string | null
          user_email: string | null
          user_id: string | null
        }
        Insert: {
          attempt_time?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          notes?: string | null
          path: string
          provided_key?: string | null
          reason: string
          success?: boolean
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Update: {
          attempt_time?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          notes?: string | null
          path?: string
          provided_key?: string | null
          reason?: string
          success?: boolean
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      cart_sessions: {
        Row: {
          selected_school_city: string | null
          selected_school_id: string | null
          selected_school_name: string | null
          selected_school_state: string | null
          session_id: string
          updated_at: string | null
        }
        Insert: {
          selected_school_city?: string | null
          selected_school_id?: string | null
          selected_school_name?: string | null
          selected_school_state?: string | null
          session_id: string
          updated_at?: string | null
        }
        Update: {
          selected_school_city?: string | null
          selected_school_id?: string | null
          selected_school_name?: string | null
          selected_school_state?: string | null
          session_id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
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
      contact_inquiries: {
        Row: {
          created_at: string | null
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          message: string
          name: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount_cents: number
          cause_id: string | null
          created_at: string
          customer_email: string | null
          id: string
          nonprofit_ein: string | null
          nonprofit_id: string | null
          nonprofit_name: string | null
          order_id: string | null
        }
        Insert: {
          amount_cents?: number
          cause_id?: string | null
          created_at?: string
          customer_email?: string | null
          id?: string
          nonprofit_ein?: string | null
          nonprofit_id?: string | null
          nonprofit_name?: string | null
          order_id?: string | null
        }
        Update: {
          amount_cents?: number
          cause_id?: string | null
          created_at?: string
          customer_email?: string | null
          id?: string
          nonprofit_ein?: string | null
          nonprofit_id?: string | null
          nonprofit_name?: string | null
          order_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "donations_cause_id_fkey"
            columns: ["cause_id"]
            isOneToOne: false
            referencedRelation: "causes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_nonprofit_id_fkey"
            columns: ["nonprofit_id"]
            isOneToOne: false
            referencedRelation: "nonprofits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "donations_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          error_message: string
          error_stack: string | null
          file_name: string | null
          id: string
          page_url: string | null
          resolved: boolean
          session_id: string | null
          timestamp: string
          user_agent: string | null
        }
        Insert: {
          error_message: string
          error_stack?: string | null
          file_name?: string | null
          id?: string
          page_url?: string | null
          resolved?: boolean
          session_id?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Update: {
          error_message?: string
          error_stack?: string | null
          file_name?: string | null
          id?: string
          page_url?: string | null
          resolved?: boolean
          session_id?: string | null
          timestamp?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      help_articles: {
        Row: {
          active: boolean | null
          body: string
          created_at: string
          excerpt: string
          href: string
          id: string
          keywords: string[] | null
          requires_auth: boolean | null
          slug: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          active?: boolean | null
          body: string
          created_at?: string
          excerpt: string
          href: string
          id?: string
          keywords?: string[] | null
          requires_auth?: boolean | null
          slug: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          active?: boolean | null
          body?: string
          created_at?: string
          excerpt?: string
          href?: string
          id?: string
          keywords?: string[] | null
          requires_auth?: boolean | null
          slug?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      help_search_logs: {
        Row: {
          client_ts: string | null
          created_at: string
          id: string
          ip_hash: string | null
          q: string
          results_count: number
          user_id: string | null
        }
        Insert: {
          client_ts?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          q: string
          results_count?: number
          user_id?: string | null
        }
        Update: {
          client_ts?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          q?: string
          results_count?: number
          user_id?: string | null
        }
        Relationships: []
      }
      help_synonyms: {
        Row: {
          id: string
          synonyms: string[]
          term: string
        }
        Insert: {
          id?: string
          synonyms?: string[]
          term: string
        }
        Update: {
          id?: string
          synonyms?: string[]
          term?: string
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
          pinned: boolean | null
          title: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          pinned?: boolean | null
          title?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          pinned?: boolean | null
          title?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      legal_documents: {
        Row: {
          changelog: string | null
          content: string
          created_at: string
          created_by: string | null
          effective_date: string
          id: string
          published_at: string | null
          status: string
          title: string
          type: string
          updated_at: string
          version: number
        }
        Insert: {
          changelog?: string | null
          content: string
          created_at?: string
          created_by?: string | null
          effective_date: string
          id?: string
          published_at?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
          version: number
        }
        Update: {
          changelog?: string | null
          content?: string
          created_at?: string
          created_by?: string | null
          effective_date?: string
          id?: string
          published_at?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      legal_logs: {
        Row: {
          accepted_at: string
          created_at: string
          id: string
          order_id: string | null
          policy_type: string
          user_id: string | null
          version: number
        }
        Insert: {
          accepted_at?: string
          created_at?: string
          id?: string
          order_id?: string | null
          policy_type: string
          user_id?: string | null
          version: number
        }
        Update: {
          accepted_at?: string
          created_at?: string
          id?: string
          order_id?: string | null
          policy_type?: string
          user_id?: string | null
          version?: number
        }
        Relationships: []
      }
      nonprofits: {
        Row: {
          approved: boolean | null
          city: string | null
          country: string | null
          created_at: string
          description: string | null
          ein: string | null
          goal_cents: number | null
          id: string
          impact_metrics: Json | null
          indexed_name: string | null
          irs_status: string | null
          logo_url: string | null
          name: string
          search_name: string | null
          source: string | null
          state: string | null
          tags: string[] | null
          updated_at: string | null
        }
        Insert: {
          approved?: boolean | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          ein?: string | null
          goal_cents?: number | null
          id?: string
          impact_metrics?: Json | null
          indexed_name?: string | null
          irs_status?: string | null
          logo_url?: string | null
          name: string
          search_name?: string | null
          source?: string | null
          state?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Update: {
          approved?: boolean | null
          city?: string | null
          country?: string | null
          created_at?: string
          description?: string | null
          ein?: string | null
          goal_cents?: number | null
          id?: string
          impact_metrics?: Json | null
          indexed_name?: string | null
          irs_status?: string | null
          logo_url?: string | null
          name?: string
          search_name?: string | null
          source?: string | null
          state?: string | null
          tags?: string[] | null
          updated_at?: string | null
        }
        Relationships: []
      }
      order_sequences: {
        Row: {
          created_at: string | null
          last_sequence: number
          updated_at: string | null
          year: number
        }
        Insert: {
          created_at?: string | null
          last_sequence?: number
          updated_at?: string | null
          year: number
        }
        Update: {
          created_at?: string | null
          last_sequence?: number
          updated_at?: string | null
          year?: number
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
          items: Json | null
          nonprofit_ein: string | null
          nonprofit_id: string | null
          nonprofit_name: string | null
          order_number: string
          paid_at: string | null
          payment_mode: string | null
          product_name: string | null
          quantity: number
          receipt_url: string | null
          session_id: string
          sinalite_order_id: string | null
          status: string
          stripe_payment_intent_id: string | null
          subtotal_cents: number | null
          tax_cents: number | null
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
          items?: Json | null
          nonprofit_ein?: string | null
          nonprofit_id?: string | null
          nonprofit_name?: string | null
          order_number: string
          paid_at?: string | null
          payment_mode?: string | null
          product_name?: string | null
          quantity?: number
          receipt_url?: string | null
          session_id: string
          sinalite_order_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number | null
          tax_cents?: number | null
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
          items?: Json | null
          nonprofit_ein?: string | null
          nonprofit_id?: string | null
          nonprofit_name?: string | null
          order_number?: string
          paid_at?: string | null
          payment_mode?: string | null
          product_name?: string | null
          quantity?: number
          receipt_url?: string | null
          session_id?: string
          sinalite_order_id?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          subtotal_cents?: number | null
          tax_cents?: number | null
        }
        Relationships: []
      }
      pricing_settings: {
        Row: {
          created_at: string
          currency: string
          id: string
          markup_fixed_cents: number
          markup_mode: string
          markup_percent: number
          nonprofit_fixed_cents: number
          nonprofit_percent_of_markup: number
          nonprofit_share_mode: string
          updated_at: string
          vendor: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          markup_fixed_cents?: number
          markup_mode: string
          markup_percent?: number
          nonprofit_fixed_cents?: number
          nonprofit_percent_of_markup?: number
          nonprofit_share_mode: string
          updated_at?: string
          vendor: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          markup_fixed_cents?: number
          markup_mode?: string
          markup_percent?: number
          nonprofit_fixed_cents?: number
          nonprofit_percent_of_markup?: number
          nonprofit_share_mode?: string
          updated_at?: string
          vendor?: string
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          base_price_cents: number
          created_at: string | null
          currency: string | null
          id: string
          is_active: boolean | null
          label: string
          markup_fixed_cents: number | null
          markup_percent: number | null
          product_id: string
          updated_at: string | null
          vendor_variant_id: string
        }
        Insert: {
          base_price_cents: number
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          label: string
          markup_fixed_cents?: number | null
          markup_percent?: number | null
          product_id: string
          updated_at?: string | null
          vendor_variant_id: string
        }
        Update: {
          base_price_cents?: number
          created_at?: string | null
          currency?: string | null
          id?: string
          is_active?: boolean | null
          label?: string
          markup_fixed_cents?: number | null
          markup_percent?: number | null
          product_id?: string
          updated_at?: string | null
          vendor_variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          base_cost_cents: number
          category: string | null
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean | null
          markup_fixed_cents: number | null
          markup_percent: number | null
          name: string
          price_override_cents: number | null
          pricing_data: Json | null
          vendor: string
          vendor_id: string
          vendor_product_id: string | null
        }
        Insert: {
          base_cost_cents: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          markup_fixed_cents?: number | null
          markup_percent?: number | null
          name: string
          price_override_cents?: number | null
          pricing_data?: Json | null
          vendor?: string
          vendor_id: string
          vendor_product_id?: string | null
        }
        Update: {
          base_cost_cents?: number
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          markup_fixed_cents?: number | null
          markup_percent?: number | null
          name?: string
          price_override_cents?: number | null
          pricing_data?: Json | null
          vendor?: string
          vendor_id?: string
          vendor_product_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          city: string
          country: string
          created_at: string
          first_name: string
          id: string
          last_name: string
          phone: string | null
          state: string
          street_address: string
          updated_at: string
          zip_code: string
        }
        Insert: {
          city: string
          country?: string
          created_at?: string
          first_name: string
          id: string
          last_name: string
          phone?: string | null
          state: string
          street_address: string
          updated_at?: string
          zip_code: string
        }
        Update: {
          city?: string
          country?: string
          created_at?: string
          first_name?: string
          id?: string
          last_name?: string
          phone?: string | null
          state?: string
          street_address?: string
          updated_at?: string
          zip_code?: string
        }
        Relationships: []
      }
      schools: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      schools_user_added: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string | null
          county: string | null
          created_at: string | null
          created_by_user_id: string | null
          district: string | null
          id: string
          is_verified: boolean | null
          name: string
          school_level: string | null
          search_vector: unknown
          slug: string
          state: string
          zip: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          country?: string | null
          county?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          district?: string | null
          id?: string
          is_verified?: boolean | null
          name: string
          school_level?: string | null
          search_vector?: unknown
          slug: string
          state: string
          zip: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string | null
          county?: string | null
          created_at?: string | null
          created_by_user_id?: string | null
          district?: string | null
          id?: string
          is_verified?: boolean | null
          name?: string
          school_level?: string | null
          search_vector?: unknown
          slug?: string
          state?: string
          zip?: string
        }
        Relationships: []
      }
      service_role_audit: {
        Row: {
          created_at: string
          details: Json | null
          id: string
          ip_address: string | null
          operation: string
          record_id: string | null
          table_name: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          operation: string
          record_id?: string | null
          table_name: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          id?: string
          ip_address?: string | null
          operation?: string
          record_id?: string | null
          table_name?: string
        }
        Relationships: []
      }
      story_requests: {
        Row: {
          cause_id: string
          contact_email: string
          created_at: string
          id: string
          milestone_amount: number | null
          notes: string | null
          reached_at: string
          status: string
          updated_at: string
          video_url: string | null
        }
        Insert: {
          cause_id: string
          contact_email: string
          created_at?: string
          id?: string
          milestone_amount?: number | null
          notes?: string | null
          reached_at?: string
          status?: string
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          cause_id?: string
          contact_email?: string
          created_at?: string
          id?: string
          milestone_amount?: number | null
          notes?: string | null
          reached_at?: string
          status?: string
          updated_at?: string
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "story_requests_cause_id_fkey"
            columns: ["cause_id"]
            isOneToOne: false
            referencedRelation: "causes"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          category: string
          created_at: string
          id: string
          level: string
          message: string
          metadata: Json | null
          timestamp: string
          user_id: string | null
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          level: string
          message: string
          metadata?: Json | null
          timestamp?: string
          user_id?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          timestamp?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      who_we_serve_pages: {
        Row: {
          content: Json
          created_at: string
          id: string
          page_slug: string
          updated_at: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          page_slug: string
          updated_at?: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          page_slug?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_error_log_rate_limit: { Args: never; Returns: boolean }
      cleanup_expired_admin_sessions: { Args: never; Returns: undefined }
      cleanup_old_system_logs: { Args: never; Returns: undefined }
      generate_order_number: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_cause_raised: {
        Args: { amount: number; cause_uuid: string }
        Returns: undefined
      }
      ppp_session_id: { Args: never; Returns: string }
      require_ppp_session_id: { Args: never; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
