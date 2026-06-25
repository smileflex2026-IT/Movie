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
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          order: number
          slug: string
          top_ten: boolean
          updated_at: string
          virtual: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          order?: number
          slug: string
          top_ten?: boolean
          updated_at?: string
          virtual?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          order?: number
          slug?: string
          top_ten?: boolean
          updated_at?: string
          virtual?: boolean
        }
        Relationships: []
      }
      movies: {
        Row: {
          ads: Json
          backdrop: string
          badge: string | null
          cast_list: string[]
          category_id: string | null
          content_rating: string | null
          country: string | null
          created_at: string
          description: string
          director: string | null
          duration: number
          featured: boolean
          genres: string[]
          id: string
          language: string | null
          poster: string
          preview_clips: Json
          published: boolean
          rating: number | null
          release_date: string | null
          slug: string
          subtitles: Json
          title: string
          updated_at: string
          video: string
          weekly_trending_rank: number | null
          year: number | null
        }
        Insert: {
          ads?: Json
          backdrop?: string
          badge?: string | null
          cast_list?: string[]
          category_id?: string | null
          content_rating?: string | null
          country?: string | null
          created_at?: string
          description?: string
          director?: string | null
          duration?: number
          featured?: boolean
          genres?: string[]
          id?: string
          language?: string | null
          poster?: string
          preview_clips?: Json
          published?: boolean
          rating?: number | null
          release_date?: string | null
          slug: string
          subtitles?: Json
          title: string
          updated_at?: string
          video?: string
          weekly_trending_rank?: number | null
          year?: number | null
        }
        Update: {
          ads?: Json
          backdrop?: string
          badge?: string | null
          cast_list?: string[]
          category_id?: string | null
          content_rating?: string | null
          country?: string | null
          created_at?: string
          description?: string
          director?: string | null
          duration?: number
          featured?: boolean
          genres?: string[]
          id?: string
          language?: string | null
          poster?: string
          preview_clips?: Json
          published?: boolean
          rating?: number | null
          release_date?: string | null
          slug?: string
          subtitles?: Json
          title?: string
          updated_at?: string
          video?: string
          weekly_trending_rank?: number | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "movies_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      play_counts: {
        Row: {
          count: number
          movie_id: string
          updated_at: string
        }
        Insert: {
          count?: number
          movie_id: string
          updated_at?: string
        }
        Update: {
          count?: number
          movie_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "play_counts_movie_id_fkey"
            columns: ["movie_id"]
            isOneToOne: true
            referencedRelation: "movies"
            referencedColumns: ["id"]
          },
        ]
      }
      rail_settings: {
        Row: {
          continue_max_items: number
          continue_sort: string
          id: string
          top10_recency_half_life_days: number
          top10_weight_manual_rank: number
          top10_weight_play_count: number
          top10_weight_recency: number
          updated_at: string
        }
        Insert: {
          continue_max_items?: number
          continue_sort?: string
          id?: string
          top10_recency_half_life_days?: number
          top10_weight_manual_rank?: number
          top10_weight_play_count?: number
          top10_weight_recency?: number
          updated_at?: string
        }
        Update: {
          continue_max_items?: number
          continue_sort?: string
          id?: string
          top10_recency_half_life_days?: number
          top10_weight_manual_rank?: number
          top10_weight_play_count?: number
          top10_weight_recency?: number
          updated_at?: string
        }
        Relationships: []
      }
      user_category_order: {
        Row: {
          email: string
          ordered_ids: string[]
          updated_at: string
        }
        Insert: {
          email: string
          ordered_ids?: string[]
          updated_at?: string
        }
        Update: {
          email?: string
          ordered_ids?: string[]
          updated_at?: string
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
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_play_count: { Args: { _movie_id: string }; Returns: undefined }
      is_cms_staff: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "editor"
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
      app_role: ["admin", "editor"],
    },
  },
} as const
