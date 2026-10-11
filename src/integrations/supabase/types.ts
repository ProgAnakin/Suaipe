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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      email_template: {
        Row: {
          language: string
          sender_name: string
          subject_template: string
          header_title: string
          header_subtitle: string
          footer_store_name: string
          updated_at: string
        }
        Insert: {
          language: string
          sender_name?: string
          subject_template?: string
          header_title?: string
          header_subtitle?: string
          footer_store_name?: string
          updated_at?: string
        }
        Update: {
          language?: string
          sender_name?: string
          subject_template?: string
          header_title?: string
          header_subtitle?: string
          footer_store_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      manager_audit_log: {
        Row: {
          id: string
          user_id: string | null
          user_email: string | null
          product_id: string
          action: string | null
          old_active: boolean | null
          new_active: boolean | null
          store_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          user_email?: string | null
          product_id: string
          action?: string | null
          old_active?: boolean | null
          new_active?: boolean | null
          store_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          user_email?: string | null
          product_id?: string
          action?: string | null
          old_active?: boolean | null
          new_active?: boolean | null
          store_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      product_settings: {
        Row: {
          product_id: string
          store_id: string
          active: boolean
          price_override: string | null
          image_url: string | null
          video_url: string | null
          discount_percent: number | null
          faq_q1: string | null
          faq_a1: string | null
          faq_q2: string | null
          faq_a2: string | null
          faq_q3: string | null
          faq_a3: string | null
          updated_at: string
        }
        Insert: {
          product_id: string
          store_id?: string
          active?: boolean
          price_override?: string | null
          image_url?: string | null
          video_url?: string | null
          discount_percent?: number | null
          faq_q1?: string | null
          faq_a1?: string | null
          faq_q2?: string | null
          faq_a2?: string | null
          faq_q3?: string | null
          faq_a3?: string | null
          updated_at?: string
        }
        Update: {
          product_id?: string
          store_id?: string
          active?: boolean
          price_override?: string | null
          image_url?: string | null
          video_url?: string | null
          discount_percent?: number | null
          faq_q1?: string | null
          faq_a1?: string | null
          faq_q2?: string | null
          faq_a2?: string | null
          faq_q3?: string | null
          faq_a3?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quiz_cards: {
        Row: {
          id: number
          emoji: string
          image_url: string | null
          tag: string
          sort_order: number
          active: boolean
          text_it: string
          text_en: string | null
          text_pt: string | null
          text_es: string | null
          text_fr: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          emoji?: string
          image_url?: string | null
          tag: string
          sort_order?: number
          active?: boolean
          text_it?: string
          text_en?: string | null
          text_pt?: string | null
          text_es?: string | null
          text_fr?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          emoji?: string
          image_url?: string | null
          tag?: string
          sort_order?: number
          active?: boolean
          text_it?: string
          text_en?: string | null
          text_pt?: string | null
          text_es?: string | null
          text_fr?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      quiz_funnel_events: {
        Row: {
          id: string
          funnel_key: string
          event_type: string
          store_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          funnel_key: string
          event_type: string
          store_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          funnel_key?: string
          event_type?: string
          store_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
      quiz_sessions: {
        Row: {
          id: string
          email: string
          nome: string | null
          cognome: string | null
          answers: Json
          matched_product_id: string
          match_percent: number
          email_sent: boolean
          store_id: string | null
          product_name: string | null
          product_price: string | null
          product_image: string | null
          product_video: string | null
          discount_code: string | null
          discount_percent: number | null
          code_redeemed: boolean
          code_redeemed_at: string | null
          language: string | null
          consent_given_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          email: string
          nome?: string | null
          cognome?: string | null
          answers?: Json
          matched_product_id: string
          match_percent: number
          email_sent?: boolean
          store_id?: string | null
          product_name?: string | null
          product_price?: string | null
          product_image?: string | null
          product_video?: string | null
          discount_code?: string | null
          discount_percent?: number | null
          code_redeemed?: boolean
          code_redeemed_at?: string | null
          language?: string | null
          consent_given_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          email?: string
          nome?: string | null
          cognome?: string | null
          answers?: Json
          matched_product_id?: string
          match_percent?: number
          email_sent?: boolean
          store_id?: string | null
          product_name?: string | null
          product_price?: string | null
          product_image?: string | null
          product_video?: string | null
          discount_code?: string | null
          discount_percent?: number | null
          code_redeemed?: boolean
          code_redeemed_at?: string | null
          language?: string | null
          consent_given_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      custom_products: {
        Row: {
          id: string
          name: string
          description: string
          price: string
          rating: number
          image_url: string | null
          video_url: string
          tags: string[]
          faq: Json
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name: string
          description: string
          price: string
          rating?: number
          image_url?: string | null
          video_url?: string
          tags?: string[]
          faq?: Json
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          price?: string
          rating?: number
          image_url?: string | null
          video_url?: string
          tags?: string[]
          faq?: Json
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_global_status: {
        Row: {
          product_id: string
          hidden: boolean
          updated_at: string
        }
        Insert: {
          product_id: string
          hidden?: boolean
          updated_at?: string
        }
        Update: {
          product_id?: string
          hidden?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      product_guides: {
        Row: {
          product_id: string
          product_name: string
          description_it: string
          description_en: string
          insight_1_it: string
          insight_1_en: string
          insight_2_it: string
          insight_2_en: string
          manager_advice_it: string
          manager_advice_en: string
          manager_advice_audio_url: string | null
          video_url: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          product_id: string
          product_name?: string
          description_it?: string
          description_en?: string
          insight_1_it?: string
          insight_1_en?: string
          insight_2_it?: string
          insight_2_en?: string
          manager_advice_it?: string
          manager_advice_en?: string
          manager_advice_audio_url?: string | null
          video_url?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          product_id?: string
          product_name?: string
          description_it?: string
          description_en?: string
          insight_1_it?: string
          insight_1_en?: string
          insight_2_it?: string
          insight_2_en?: string
          manager_advice_it?: string
          manager_advice_en?: string
          manager_advice_audio_url?: string | null
          video_url?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      product_guide_files: {
        Row: {
          id: string
          product_id: string
          label: string
          file_path: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          id?: string
          product_id: string
          label?: string
          file_path: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          id?: string
          product_id?: string
          label?: string
          file_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: []
      }
      store_roles: {
        Row: {
          id: string
          user_id: string
          role: string
          store_id: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          store_id?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          store_id?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_email_cooldown: {
        Args: { p_email: string }
        Returns: { in_cooldown: boolean; hours_remaining: number }[]
      }
      check_login_rate_limit: {
        Args: { p_email: string }
        Returns: { allowed: boolean; locked_seconds: number; attempts_left: number }
      }
      record_login_attempt: {
        Args: { p_email: string; p_success: boolean }
        Returns: undefined
      }
      get_my_store_role: {
        Args: Record<string, never>
        Returns: { role: string; store_id: string | null }[]
      }
      verify_staff_pin: {
        Args: {
          pin_input: string
          client_id?: string
          user_agent?: string
          ip_address?: string | null
        }
        Returns: { valid: boolean; locked_seconds: number }
      }
      mark_code_redeemed: {
        Args: { p_session_id: string }
        Returns: number
      }
      purge_sessions_older_than: {
        Args: { p_days?: number; p_store_id?: string }
        Returns: number
      }
      list_store_roles_admin: {
        Args: Record<string, never>
        Returns: {
          id: string
          user_id: string
          user_email: string
          role: string
          store_id: string | null
          created_at: string
        }[]
      }
      upsert_store_role_admin: {
        Args: {
          p_user_email: string
          p_role: string
          p_store_id?: string | null
        }
        Returns: string
      }
      delete_store_role_admin: {
        Args: { p_role_id: string }
        Returns: number
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
