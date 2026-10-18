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
      ai_usage_logs: {
        Row: {
          completion_tokens: number | null
          created_at: string | null
          id: string
          model_name: string | null
          prompt_tokens: number | null
          total_tokens: number | null
          user_id: string | null
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string | null
          id?: string
          model_name?: string | null
          prompt_tokens?: number | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string | null
          id?: string
          model_name?: string | null
          prompt_tokens?: number | null
          total_tokens?: number | null
          user_id?: string | null
        }
        Relationships: []
      }
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
      global_settings: {
        Row: {
          key: string
          updated_at: string | null
          value_bool: boolean | null
        }
        Insert: {
          key: string
          updated_at?: string | null
          value_bool?: boolean | null
        }
        Update: {
          key?: string
          updated_at?: string | null
          value_bool?: boolean | null
        }
        Relationships: []
      }
      guestbook_posts: {
        Row: {
          author_name: string
          author_photo_url: string | null
          candle_count: number
          content: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
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
          author_photo_url?: string | null
          candle_count?: number
          content: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
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
          author_photo_url?: string | null
          candle_count?: number
          content?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
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
            referencedRelation: "backoffice_humanity_index"
            referencedColumns: ["memorial_id"]
          },
          {
            foreignKeyName: "guestbook_posts_memorial_fk"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestbook_posts_memorial_fk"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "v_public_memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      guestbook_templates: {
        Row: {
          category: string
          content: string
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_active: boolean | null
          relation: string | null
          tone: string
          usage_count: number
        }
        Insert: {
          category: string
          content: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean | null
          relation?: string | null
          tone?: string
          usage_count?: number
        }
        Update: {
          category?: string
          content?: string
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_active?: boolean | null
          relation?: string | null
          tone?: string
          usage_count?: number
        }
        Relationships: []
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
            referencedRelation: "backoffice_humanity_index"
            referencedColumns: ["memorial_id"]
          },
          {
            foreignKeyName: "memorial_events_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorial_events_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "v_public_memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_follows: {
        Row: {
          created_at: string
          id: string
          memorial_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          memorial_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          memorial_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorial_follows_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "backoffice_humanity_index"
            referencedColumns: ["memorial_id"]
          },
          {
            foreignKeyName: "memorial_follows_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorial_follows_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "v_public_memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      memorial_merge_confirmations: {
        Row: {
          confirmed_at: string
          confirmed_by: string
          confirmer_capacity: string
          created_at: string
          id: string
          master_memorial_id: string
          revocation_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          source_memorial_id: string
          status: string
          updated_at: string
        }
        Insert: {
          confirmed_at?: string
          confirmed_by: string
          confirmer_capacity: string
          created_at?: string
          id?: string
          master_memorial_id: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          source_memorial_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          confirmed_at?: string
          confirmed_by?: string
          confirmer_capacity?: string
          created_at?: string
          id?: string
          master_memorial_id?: string
          revocation_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          source_memorial_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memorial_merge_confirmations_master_memorial_id_fkey"
            columns: ["master_memorial_id"]
            isOneToOne: false
            referencedRelation: "backoffice_humanity_index"
            referencedColumns: ["memorial_id"]
          },
          {
            foreignKeyName: "memorial_merge_confirmations_master_memorial_id_fkey"
            columns: ["master_memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorial_merge_confirmations_master_memorial_id_fkey"
            columns: ["master_memorial_id"]
            isOneToOne: false
            referencedRelation: "v_public_memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorial_merge_confirmations_source_memorial_id_fkey"
            columns: ["source_memorial_id"]
            isOneToOne: false
            referencedRelation: "backoffice_humanity_index"
            referencedColumns: ["memorial_id"]
          },
          {
            foreignKeyName: "memorial_merge_confirmations_source_memorial_id_fkey"
            columns: ["source_memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorial_merge_confirmations_source_memorial_id_fkey"
            columns: ["source_memorial_id"]
            isOneToOne: false
            referencedRelation: "v_public_memorials"
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
            referencedRelation: "backoffice_humanity_index"
            referencedColumns: ["memorial_id"]
          },
          {
            foreignKeyName: "memorial_relations_memorial_id_1_fkey"
            columns: ["memorial_id_1"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorial_relations_memorial_id_1_fkey"
            columns: ["memorial_id_1"]
            isOneToOne: false
            referencedRelation: "v_public_memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorial_relations_memorial_id_2_fkey"
            columns: ["memorial_id_2"]
            isOneToOne: false
            referencedRelation: "backoffice_humanity_index"
            referencedColumns: ["memorial_id"]
          },
          {
            foreignKeyName: "memorial_relations_memorial_id_2_fkey"
            columns: ["memorial_id_2"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorial_relations_memorial_id_2_fkey"
            columns: ["memorial_id_2"]
            isOneToOne: false
            referencedRelation: "v_public_memorials"
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
          deleted_at: string | null
          deleted_by: string | null
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
          notification_end_day: number | null
          notification_frequency: string | null
          notification_start_day: number | null
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
          deleted_at?: string | null
          deleted_by?: string | null
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
          notification_end_day?: number | null
          notification_frequency?: string | null
          notification_start_day?: number | null
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
          deleted_at?: string | null
          deleted_by?: string | null
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
          notification_end_day?: number | null
          notification_frequency?: string | null
          notification_start_day?: number | null
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
            referencedRelation: "backoffice_humanity_index"
            referencedColumns: ["memorial_id"]
          },
          {
            foreignKeyName: "memorials_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorials_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "v_public_memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          candle_count: number | null
          created_at: string
          currency: string
          deceased_name_snapshot: string | null
          ebilling_reference: string | null
          ebilling_transaction_id: string | null
          flower_count: number | null
          id: string
          last_api_response: string | null
          last_sync_at: string | null
          memorial_id: string | null
          metadata: Json | null
          payer_phone: string | null
          payment_type: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          candle_count?: number | null
          created_at?: string
          currency?: string
          deceased_name_snapshot?: string | null
          ebilling_reference?: string | null
          ebilling_transaction_id?: string | null
          flower_count?: number | null
          id?: string
          last_api_response?: string | null
          last_sync_at?: string | null
          memorial_id?: string | null
          metadata?: Json | null
          payer_phone?: string | null
          payment_type: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          candle_count?: number | null
          created_at?: string
          currency?: string
          deceased_name_snapshot?: string | null
          ebilling_reference?: string | null
          ebilling_transaction_id?: string | null
          flower_count?: number | null
          id?: string
          last_api_response?: string | null
          last_sync_at?: string | null
          memorial_id?: string | null
          metadata?: Json | null
          payer_phone?: string | null
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
      rag_chunks: {
        Row: {
          canonical_memorial_id: string
          chunk_index: number
          content: string
          embedding: string | null
          embedding_model: string | null
          fts: unknown
          id: string
          indexed_at: string
          memorial_id: string
          norm: string
          source_id: string
          source_type: string
          source_updated_at: string | null
          title: string | null
        }
        Insert: {
          canonical_memorial_id: string
          chunk_index?: number
          content: string
          embedding?: string | null
          embedding_model?: string | null
          fts?: unknown
          id?: string
          indexed_at?: string
          memorial_id: string
          norm: string
          source_id: string
          source_type: string
          source_updated_at?: string | null
          title?: string | null
        }
        Update: {
          canonical_memorial_id?: string
          chunk_index?: number
          content?: string
          embedding?: string | null
          embedding_model?: string | null
          fts?: unknown
          id?: string
          indexed_at?: string
          memorial_id?: string
          norm?: string
          source_id?: string
          source_type?: string
          source_updated_at?: string | null
          title?: string | null
        }
        Relationships: []
      }
      rag_index_log: {
        Row: {
          action: string
          chunks: number | null
          created_at: string
          id: string
          memorial_id: string | null
        }
        Insert: {
          action: string
          chunks?: number | null
          created_at?: string
          id?: string
          memorial_id?: string | null
        }
        Update: {
          action?: string
          chunks?: number | null
          created_at?: string
          id?: string
          memorial_id?: string | null
        }
        Relationships: []
      }
      ritual_prices: {
        Row: {
          created_at: string
          id: string
          item_type: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_type: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          item_type?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: []
      }
      social_search_history: {
        Row: {
          answer: string | null
          created_at: string
          id: string
          model: string | null
          question: string
          tokens_context: number | null
          user_id: string | null
        }
        Insert: {
          answer?: string | null
          created_at?: string
          id?: string
          model?: string | null
          question: string
          tokens_context?: number | null
          user_id?: string | null
        }
        Update: {
          answer?: string | null
          created_at?: string
          id?: string
          model?: string | null
          question?: string
          tokens_context?: number | null
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
            referencedRelation: "backoffice_humanity_index"
            referencedColumns: ["memorial_id"]
          },
          {
            foreignKeyName: "suggested_links_source_memorial_id_fkey"
            columns: ["source_memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggested_links_source_memorial_id_fkey"
            columns: ["source_memorial_id"]
            isOneToOne: false
            referencedRelation: "v_public_memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggested_links_target_memorial_id_fkey"
            columns: ["target_memorial_id"]
            isOneToOne: false
            referencedRelation: "backoffice_humanity_index"
            referencedColumns: ["memorial_id"]
          },
          {
            foreignKeyName: "suggested_links_target_memorial_id_fkey"
            columns: ["target_memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggested_links_target_memorial_id_fkey"
            columns: ["target_memorial_id"]
            isOneToOne: false
            referencedRelation: "v_public_memorials"
            referencedColumns: ["id"]
          },
        ]
      }
      system_logs: {
        Row: {
          created_at: string
          details: Json | null
          event_type: string
          id: string
        }
        Insert: {
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
        }
        Update: {
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
        }
        Relationships: []
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
      user_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          memorial_id: string | null
          message: string
          metadata: Json | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          memorial_id?: string | null
          message: string
          metadata?: Json | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          memorial_id?: string | null
          message?: string
          metadata?: Json | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_notifications_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "backoffice_humanity_index"
            referencedColumns: ["memorial_id"]
          },
          {
            foreignKeyName: "user_notifications_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_notifications_memorial_id_fkey"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "v_public_memorials"
            referencedColumns: ["id"]
          },
        ]
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
      backoffice_finance_audit: {
        Row: {
          amount: number | null
          date_libreville: string | null
          deceased_name_snapshot: string | null
          ebilling_reference: string | null
          id: string | null
          last_api_response: string | null
          payer_phone: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          date_libreville?: never
          deceased_name_snapshot?: string | null
          ebilling_reference?: string | null
          id?: string | null
          last_api_response?: string | null
          payer_phone?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          date_libreville?: never
          deceased_name_snapshot?: string | null
          ebilling_reference?: string | null
          id?: string | null
          last_api_response?: string | null
          payer_phone?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      backoffice_finance_stats: {
        Row: {
          day: string | null
          failure_count: number | null
          success_count: number | null
          success_rate: number | null
          total: number | null
        }
        Relationships: []
      }
      backoffice_humanity_index: {
        Row: {
          density_score: number | null
          gesture_score: number | null
          humanity_index: number | null
          inference_bonus: number | null
          memorial_id: string | null
        }
        Insert: {
          density_score?: never
          gesture_score?: never
          humanity_index?: never
          inference_bonus?: never
          memorial_id?: string | null
        }
        Update: {
          density_score?: never
          gesture_score?: never
          humanity_index?: never
          inference_bonus?: never
          memorial_id?: string | null
        }
        Relationships: []
      }
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
      public_guestbook: {
        Row: {
          author_name: string | null
          author_photo_url: string | null
          content: string | null
          created_at: string | null
          id: string | null
          memorial_id: string | null
          relation_category: string | null
          relation_link: string | null
        }
        Insert: {
          author_name?: string | null
          author_photo_url?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          memorial_id?: string | null
          relation_category?: string | null
          relation_link?: string | null
        }
        Update: {
          author_name?: string | null
          author_photo_url?: string | null
          content?: string | null
          created_at?: string | null
          id?: string | null
          memorial_id?: string | null
          relation_category?: string | null
          relation_link?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guestbook_posts_memorial_fk"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "backoffice_humanity_index"
            referencedColumns: ["memorial_id"]
          },
          {
            foreignKeyName: "guestbook_posts_memorial_fk"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guestbook_posts_memorial_fk"
            columns: ["memorial_id"]
            isOneToOne: false
            referencedRelation: "v_public_memorials"
            referencedColumns: ["id"]
          },
        ]
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
      v_pending_reconciliation: {
        Row: {
          amount: number | null
          created_at: string | null
          deceased_name_snapshot: string | null
          ebilling_reference: string | null
          id: string | null
          memorial_id: string | null
          payer_phone: string | null
          status: string | null
        }
        Relationships: []
      }
      v_public_memorials: {
        Row: {
          biography: string | null
          birth_date: string | null
          created_at: string | null
          created_by: string | null
          creator_relation: string | null
          death_date: string | null
          default_photo_index: number | null
          donation_enabled: boolean | null
          first_name: string | null
          funeral_date: string | null
          funeral_location: string | null
          id: string | null
          is_active: boolean | null
          is_demo: boolean | null
          is_published: boolean | null
          last_name: string | null
          legacy_slug: string | null
          merged_into: string | null
          network_size: number | null
          notification_end_day: number | null
          notification_frequency: string | null
          notification_start_day: number | null
          photo_url: string | null
          photos: string[] | null
          share_token: string | null
          slug: string | null
          social_density_score: number | null
          total_candles: number | null
          total_flowers: number | null
          total_posts: number | null
          updated_at: string | null
        }
        Insert: {
          biography?: string | null
          birth_date?: string | null
          created_at?: string | null
          created_by?: string | null
          creator_relation?: string | null
          death_date?: string | null
          default_photo_index?: number | null
          donation_enabled?: boolean | null
          first_name?: string | null
          funeral_date?: string | null
          funeral_location?: string | null
          id?: string | null
          is_active?: boolean | null
          is_demo?: boolean | null
          is_published?: boolean | null
          last_name?: string | null
          legacy_slug?: string | null
          merged_into?: string | null
          network_size?: number | null
          notification_end_day?: number | null
          notification_frequency?: string | null
          notification_start_day?: number | null
          photo_url?: string | null
          photos?: string[] | null
          share_token?: string | null
          slug?: string | null
          social_density_score?: number | null
          total_candles?: number | null
          total_flowers?: number | null
          total_posts?: number | null
          updated_at?: string | null
        }
        Update: {
          biography?: string | null
          birth_date?: string | null
          created_at?: string | null
          created_by?: string | null
          creator_relation?: string | null
          death_date?: string | null
          default_photo_index?: number | null
          donation_enabled?: boolean | null
          first_name?: string | null
          funeral_date?: string | null
          funeral_location?: string | null
          id?: string | null
          is_active?: boolean | null
          is_demo?: boolean | null
          is_published?: boolean | null
          last_name?: string | null
          legacy_slug?: string | null
          merged_into?: string | null
          network_size?: number | null
          notification_end_day?: number | null
          notification_frequency?: string | null
          notification_start_day?: number | null
          photo_url?: string | null
          photos?: string[] | null
          share_token?: string | null
          slug?: string | null
          social_density_score?: number | null
          total_candles?: number | null
          total_flowers?: number | null
          total_posts?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "memorials_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "backoffice_humanity_index"
            referencedColumns: ["memorial_id"]
          },
          {
            foreignKeyName: "memorials_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorials_merged_into_fkey"
            columns: ["merged_into"]
            isOneToOne: false
            referencedRelation: "v_public_memorials"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "backoffice_humanity_index"
            referencedColumns: ["memorial_id"]
          },
          {
            foreignKeyName: "memorial_relations_memorial_id_1_fkey"
            columns: ["memorial_id_1"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorial_relations_memorial_id_1_fkey"
            columns: ["memorial_id_1"]
            isOneToOne: false
            referencedRelation: "v_public_memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorial_relations_memorial_id_2_fkey"
            columns: ["memorial_id_2"]
            isOneToOne: false
            referencedRelation: "backoffice_humanity_index"
            referencedColumns: ["memorial_id"]
          },
          {
            foreignKeyName: "memorial_relations_memorial_id_2_fkey"
            columns: ["memorial_id_2"]
            isOneToOne: false
            referencedRelation: "memorials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "memorial_relations_memorial_id_2_fkey"
            columns: ["memorial_id_2"]
            isOneToOne: false
            referencedRelation: "v_public_memorials"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_force_validate_all_suggestions: { Args: never; Returns: Json }
      admin_merge_memorial: {
        Args: { master_id: string; source_id: string }
        Returns: Json
      }
      admin_unmerge_memorial: { Args: { source_id: string }; Returns: Json }
      confirm_payment_and_publish: {
        Args: { p_ebilling_ref: string; p_transaction_id: string }
        Returns: Json
      }
      disable_contributions_after_funeral: { Args: never; Returns: undefined }
      expire_orphan_stale_transactions: { Args: never; Returns: number }
      fulfill_payment_success: {
        Args: {
          p_ebilling_transaction_id?: string
          p_last_api_response?: string
          p_reference: string
          p_tx_id: string
        }
        Returns: Json
      }
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
      get_contributor_profile: {
        Args: { p_limit?: number; p_offset?: number; p_post_id: string }
        Returns: Json
      }
      get_memorial_family_ids: {
        Args: { p_master_id: string }
        Returns: string[]
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
      get_memorial_gesture_stats_consolidated: {
        Args: { p_master_id: string }
        Returns: {
          is_total: boolean
          memorial_id: string
          post_count: number
          total_candles: number
          total_flowers: number
        }[]
      }
      get_memorial_social_stats: {
        Args: { target_memorial_id: string }
        Returns: {
          category: string
          count: number
        }[]
      }
      get_paginated_memorials: {
        Args: { p_limit?: number; p_offset?: number; p_search_query?: string }
        Returns: {
          birth_date: string
          death_date: string
          first_name: string
          id: string
          is_published: boolean
          last_name: string
          photo_url: string
          slug: string
          total_count: number
        }[]
      }
      get_public_guestbook_posts: {
        Args: { p_limit?: number; p_memorial_id?: string; p_offset?: number }
        Returns: {
          author_name: string
          author_photo_url: string
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
      get_public_guestbook_posts_consolidated: {
        Args: { p_limit?: number; p_master_id: string; p_offset?: number }
        Returns: {
          author_name: string
          author_photo_url: string
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
      get_public_memorial_events_consolidated: {
        Args: { p_master_id: string }
        Returns: {
          created_at: string
          description: string
          event_date: string
          event_end_time: string
          event_type: string
          gps_coordinates: string
          id: string
          is_public: boolean
          location: string
          memorial_id: string
          updated_at: string
        }[]
      }
      get_resolved_memorial_lineage: {
        Args: { p_master_id: string }
        Returns: {
          endpoint_a: string
          endpoint_b: string
          is_conflict: boolean
          lineage_class: string
          normalized_type: string
          origin_memorial_ids: string[]
          relation_ids: string[]
          relation_labels: string[]
          status: string
        }[]
      }
      get_resolved_memorial_relations: {
        Args: { p_master_id: string }
        Returns: {
          endpoint_a: string
          endpoint_b: string
          is_biological: boolean
          is_conflict: boolean
          normalized_type: string
          origin_memorial_ids: string[]
          relation_ids: string[]
          relation_labels: string[]
          status: string
        }[]
      }
      get_viewer_relational_eligibility: { Args: never; Returns: boolean }
      get_viewer_relational_eligibility_for: {
        Args: { p_memorial_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_template_usage: {
        Args: { p_template_id: string }
        Returns: undefined
      }
      inverse_normalized: { Args: { ntype: string }; Returns: string }
      is_admin_or_moderator: { Args: { _user_id: string }; Returns: boolean }
      is_master_representative: {
        Args: { _master_id: string; _user_id: string }
        Returns: boolean
      }
      is_memorial_creation_free: {
        Args: { p_funeral_date: string }
        Returns: boolean
      }
      match_documents: {
        Args: {
          match_count: number
          match_threshold: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          similarity: number
        }[]
      }
      migrate_to_secure_slugs: { Args: never; Returns: undefined }
      normalize_relation_type: { Args: { relation: string }; Returns: string }
      normalized_to_label: { Args: { ntype: string }; Returns: string }
      rag_hybrid_search: {
        Args: {
          p_limit?: number
          p_memorial_id?: string
          p_query: string
          p_query_embedding?: string
          p_source_types?: string[]
        }
        Returns: {
          canonical_memorial_id: string
          chunk_id: string
          content: string
          fts_rank: number
          memorial_id: string
          memorial_name: string
          memorial_slug: string
          rrf_score: number
          source_id: string
          source_type: string
          title: string
          trgm_rank: number
          vec_rank: number
        }[]
      }
      rag_index_stats: { Args: never; Returns: Json }
      rag_norm: { Args: { t: string }; Returns: string }
      rag_reindex_memorial: { Args: { p_memorial_id: string }; Returns: number }
      rel_p1_can_view: {
        Args: { p_memorial: string; p_user: string }
        Returns: boolean
      }
      rel_p1_is_eligible: { Args: { p_user: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      transfer_memorial_ownership: {
        Args: { p_memorial_id: string; p_new_owner_id: string }
        Returns: Json
      }
      transitive_rule: { Args: { r_px: string; r_py: string }; Returns: string }
      unaccent: { Args: { "": string }; Returns: string }
      verify_reconciliation_token: {
        Args: { p_token: string }
        Returns: boolean
      }
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
  public: {
    Enums: {
      app_role: ["admin", "moderator"],
    },
  },
} as const
