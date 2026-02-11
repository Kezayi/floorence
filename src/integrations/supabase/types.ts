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
      audit_logs: {
        Row: {
          action_type: string
          created_at: string
          details: Json | null
          id: string
          performed_by: string
          performed_by_email: string | null
          target_user_email: string | null
          target_user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string
          details?: Json | null
          id?: string
          performed_by: string
          performed_by_email?: string | null
          target_user_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string
          details?: Json | null
          id?: string
          performed_by?: string
          performed_by_email?: string | null
          target_user_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      guestbook_posts: {
        Row: {
          author_name: string
          candle_count: number
          content: string
          created_at: string
          flower_count: number
          hidden_at: string | null
          hidden_by: string | null
          hidden_reason: string | null
          id: string
          is_demo: boolean | null
          is_hidden: boolean
          memorial_id: string
          payment_reference: string | null
          photos: string[] | null
          relation_category: string
          relation_group: string | null
          relation_link: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          author_name: string
          candle_count?: number
          content: string
          created_at?: string
          flower_count?: number
          hidden_at?: string | null
          hidden_by?: string | null
          hidden_reason?: string | null
          id?: string
          is_demo?: boolean | null
          is_hidden?: boolean
          memorial_id: string
          payment_reference?: string | null
          photos?: string[] | null
          relation_category: string
          relation_group?: string | null
          relation_link?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          author_name?: string
          candle_count?: number
          content?: string
          created_at?: string
          flower_count?: number
          hidden_at?: string | null
          hidden_by?: string | null
          hidden_reason?: string | null
          id?: string
          is_demo?: boolean | null
          is_hidden?: boolean
          memorial_id?: string
          payment_reference?: string | null
          photos?: string[] | null
          relation_category?: string
          relation_group?: string | null
          relation_link?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guestbook_posts_memorial_fk"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_events: {
        Row: {
          created_at: string
          description: string | null
          event_date: string
          event_end_time: string | null
          event_type: string
          gps_coordinates: string | null
          id: string
          is_public: boolean
          location: string | null
          memorial_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          event_date: string
          event_end_time?: string | null
          event_type: string
          gps_coordinates?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          memorial_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          event_date?: string
          event_end_time?: string | null
          event_type?: string
          gps_coordinates?: string | null
          id?: string
          is_public?: boolean
          location?: string | null
          memorial_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorial_events_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_relations: {
        Row: {
          id: string
          is_demo: boolean | null
          is_lineage: boolean | null
          memorial_id_1: string | null
          memorial_id_2: string | null
          person_a_id: string | null
          person_b_id: string | null
          relation_type: string
          relationship_type: string | null
          requested_by: string | null
          status: string | null
        }
        Insert: {
          id?: string
          is_demo?: boolean | null
          is_lineage?: boolean | null
          memorial_id_1?: string | null
          memorial_id_2?: string | null
          person_a_id?: string | null
          person_b_id?: string | null
          relation_type: string
          relationship_type?: string | null
          requested_by?: string | null
          status?: string | null
        }
        Update: {
          id?: string
          is_demo?: boolean | null
          is_lineage?: boolean | null
          memorial_id_1?: string | null
          memorial_id_2?: string | null
          person_a_id?: string | null
          person_b_id?: string | null
          relation_type?: string
          relationship_type?: string | null
          requested_by?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memorial_relations_memorial_id_1_fkey"
            columns: ["memorial_id_1"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorial_relations_memorial_id_2_fkey"
            columns: ["memorial_id_2"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorial_relations_person_a_id_fkey"
            columns: ["person_a_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorial_relations_person_b_id_fkey"
            columns: ["person_b_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      memorials: {
        Row: {
          biography: string | null
          birth_date: string | null
          contributions_disabled_at: string | null
          created_at: string
          created_by: string
          creator_relation: string | null
          death_date: string | null
          default_photo_index: number | null
          donation_enabled: boolean
          first_name: string
          funeral_date: string | null
          funeral_location: string | null
          heir_email: string | null
          heir_user_id: string | null
          id: string
          is_active: boolean
          is_demo: boolean | null
          is_published: boolean
          last_name: string
          legacy_slug: string | null
          merged_into: string | null
          network_size: number | null
          photo_url: string | null
          photos: string[] | null
          share_token: string | null
          slug: string
          social_density_score: number | null
          total_candles: number | null
          total_flowers: number | null
          total_posts: number | null
          updated_at: string
        }
        Insert: {
          biography?: string | null
          birth_date?: string | null
          contributions_disabled_at?: string | null
          created_at?: string
          created_by: string
          creator_relation?: string | null
          death_date?: string | null
          default_photo_index?: number | null
          donation_enabled?: boolean
          first_name: string
          funeral_date?: string | null
          funeral_location?: string | null
          heir_email?: string | null
          heir_user_id?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean | null
          is_published?: boolean
          last_name: string
          legacy_slug?: string | null
          merged_into?: string | null
          network_size?: number | null
          photo_url?: string | null
          photos?: string[] | null
          share_token?: string | null
          slug: string
          social_density_score?: number | null
          total_candles?: number | null
          total_flowers?: number | null
          total_posts?: number | null
          updated_at?: string
        }
        Update: {
          biography?: string | null
          birth_date?: string | null
          contributions_disabled_at?: string | null
          created_at?: string
          created_by?: string
          creator_relation?: string | null
          death_date?: string | null
          default_photo_index?: number | null
          donation_enabled?: boolean
          first_name?: string
          funeral_date?: string | null
          funeral_location?: string | null
          heir_email?: string | null
          heir_user_id?: string | null
          id?: string
          is_active?: boolean
          is_demo?: boolean | null
          is_published?: boolean
          last_name?: string
          legacy_slug?: string | null
          merged_into?: string | null
          network_size?: number | null
          photo_url?: string | null
          photos?: string[] | null
          share_token?: string | null
          slug?: string
          social_density_score?: number | null
          total_candles?: number | null
          total_flowers?: number | null
          total_posts?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorials_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          ebilling_reference: string | null
          ebilling_transaction_id: string | null
          id: string
          memorial_id: string | null
          metadata: Json | null
          payment_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          ebilling_reference?: string | null
          ebilling_transaction_id?: string | null
          id?: string
          memorial_id?: string | null
          metadata?: Json | null
          payment_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          ebilling_reference?: string | null
          ebilling_transaction_id?: string | null
          id?: string
          memorial_id?: string | null
          metadata?: Json | null
          payment_type?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          profile_completed: boolean
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          profile_completed?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          profile_completed?: boolean
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      suggested_links: {
        Row: {
          created_at: string | null
          created_by_ai: boolean | null
          id: string
          inference_logic: string | null
          notified_admin: boolean | null
          notified_at: string | null
          source_memorial_id: string | null
          status: string | null
          suggested_relation: string | null
          target_memorial_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by_ai?: boolean | null
          id?: string
          inference_logic?: string | null
          notified_admin?: boolean | null
          notified_at?: string | null
          source_memorial_id?: string | null
          status?: string | null
          suggested_relation?: string | null
          target_memorial_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by_ai?: boolean | null
          id?: string
          inference_logic?: string | null
          notified_admin?: boolean | null
          notified_at?: string | null
          source_memorial_id?: string | null
          status?: string | null
          suggested_relation?: string | null
          target_memorial_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "suggested_links_source_memorial_id_fkey"
            columns: ["source_memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggested_links_target_memorial_id_fkey"
            columns: ["target_memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
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
    }
    Views: {
      profiles_public: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          display_name?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          display_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      v_admin_success_metrics: {
        Row: {
          active_families_engaged: number | null
          success_rate_percent: number | null
          total_reunions: number | null
        }
        Relationships: []
      }
      v_dashboard_stats: {
        Row: {
          candles_last_week: number | null
          cat_allies: number | null
          cat_autres: number | null
          cat_famille_directe: number | null
          cat_famille_elargie: number | null
          cat_socio_coeur: number | null
          demo_memorials: number | null
          inter_memorial_links: number | null
          posts_last_week: number | null
          posts_prev_week: number | null
          predicted_candles_next_week: number | null
          real_memorials: number | null
          total_candles: number | null
          total_flowers: number | null
          total_memorials: number | null
          total_posts: number | null
          total_revenue: number | null
          total_users: number | null
          visible_posts: number | null
        }
        Relationships: []
      }
      v_social_inferences: {
        Row: {
          author_name: string | null
          connexions_suggerees: Json | null
          detail_liens: Json | null
          total_memorials: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_unified_lineages: {
        Row: {
          memorial_id_1: string | null
          memorial_id_2: string | null
          name_1: string | null
          name_2: string | null
          relation_type: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memorial_relations_memorial_id_1_fkey"
            columns: ["memorial_id_1"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorial_relations_memorial_id_2_fkey"
            columns: ["memorial_id_2"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_force_validate_all_suggestions: { Args: never; Returns: Json }
      disable_contributions_after_funeral: { Args: never; Returns: undefined }
      generate_secure_slug: {
        Args: { first_name: string; last_name: string }
        Returns: string
      }
      generate_suggested_links:
        | { Args: never; Returns: undefined }
        | {
            Args: { p_memorial_id_1?: string; p_memorial_id_2?: string }
            Returns: undefined
          }
      get_memorial_gesture_stats: {
        Args: { p_memorial_ids: string[] }
        Returns: {
          memorial_id: string
          post_count: number
          total_candles: number
          total_flowers: number
        }[]
      }
      get_public_guestbook_posts: {
        Args: { p_memorial_id?: string }
        Returns: {
          author_name: string
          candle_count: number
          content: string
          created_at: string
          flower_count: number
          id: string
          memorial_id: string
          photos: string[]
          relation_category: string
          relation_link: string
          updated_at: string
          user_id: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      inverse_normalized: { Args: { ntype: string }; Returns: string }
      is_admin_or_moderator: { Args: { _user_id: string }; Returns: boolean }
      is_memorial_creation_free: {
        Args: { p_funeral_date: string }
        Returns: boolean
      }
      migrate_to_secure_slugs: { Args: never; Returns: undefined }
      normalize_relation_type: { Args: { relation: string }; Returns: string }
      normalized_to_label: { Args: { ntype: string }; Returns: string }
      transitive_rule: { Args: { r_px: string; r_py: string }; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "moderator"
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
      app_role: ["admin", "moderator"],
    },
  },
} as const
