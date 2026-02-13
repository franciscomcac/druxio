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
      availability: {
        Row: {
          created_at: string | null
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean | null
          start_time: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean | null
          start_time: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean | null
          start_time?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          parent_category_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          parent_category_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          parent_category_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      expert_categories: {
        Row: {
          category: string
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          accepted_quote_id: string | null
          budget_max: number
          budget_min: number
          buyer_id: string
          category: string
          created_at: string | null
          deadline_minutes: number
          description: string | null
          expires_at: string | null
          id: string
          status: string
          subcategory: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          accepted_quote_id?: string | null
          budget_max?: number
          budget_min?: number
          buyer_id: string
          category: string
          created_at?: string | null
          deadline_minutes?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          status?: string
          subcategory?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          accepted_quote_id?: string | null
          budget_max?: number
          budget_min?: number
          buyer_id?: string
          category?: string
          created_at?: string | null
          deadline_minutes?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          status?: string
          subcategory?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      matches: {
        Row: {
          created_at: string | null
          id: string
          mentee_id: string
          mentor_id: string
          query_categories: string[] | null
          query_description: string | null
          score: number
          status: Database["public"]["Enums"]["match_status"] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          mentee_id: string
          mentor_id: string
          query_categories?: string[] | null
          query_description?: string | null
          score: number
          status?: Database["public"]["Enums"]["match_status"] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          mentee_id?: string
          mentor_id?: string
          query_categories?: string[] | null
          query_description?: string | null
          score?: number
          status?: Database["public"]["Enums"]["match_status"] | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          image_urls: string[] | null
          is_read: boolean | null
          sender_id: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          image_urls?: string[] | null
          is_read?: boolean | null
          sender_id: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          image_urls?: string[] | null
          is_read?: boolean | null
          sender_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string | null
          goals: Json | null
          hourly_rate: number | null
          id: string
          is_online: boolean | null
          location: string | null
          rating_avg: number | null
          skills: string[] | null
          stripe_connect_id: string | null
          stripe_customer_id: string | null
          timezone: string | null
          total_sessions: number | null
          updated_at: string | null
          wallet_balance: number | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          goals?: Json | null
          hourly_rate?: number | null
          id: string
          is_online?: boolean | null
          location?: string | null
          rating_avg?: number | null
          skills?: string[] | null
          stripe_connect_id?: string | null
          stripe_customer_id?: string | null
          timezone?: string | null
          total_sessions?: number | null
          updated_at?: string | null
          wallet_balance?: number | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string | null
          goals?: Json | null
          hourly_rate?: number | null
          id?: string
          is_online?: boolean | null
          location?: string | null
          rating_avg?: number | null
          skills?: string[] | null
          stripe_connect_id?: string | null
          stripe_customer_id?: string | null
          timezone?: string | null
          total_sessions?: number | null
          updated_at?: string | null
          wallet_balance?: number | null
        }
        Relationships: []
      }
      quotes: {
        Row: {
          created_at: string | null
          estimated_minutes: number
          expert_id: string
          id: string
          job_id: string
          message: string | null
          price: number
          status: string
        }
        Insert: {
          created_at?: string | null
          estimated_minutes?: number
          expert_id: string
          id?: string
          job_id: string
          message?: string | null
          price: number
          status?: string
        }
        Update: {
          created_at?: string | null
          estimated_minutes?: number
          expert_id?: string
          id?: string
          job_id?: string
          message?: string | null
          price?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "quotes_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          created_at: string | null
          id: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          session_id: string
        }
        Insert: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating: number
          reviewee_id: string
          reviewer_id: string
          session_id: string
        }
        Update: {
          comment?: string | null
          created_at?: string | null
          id?: string
          rating?: number
          reviewee_id?: string
          reviewer_id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          categories: string[] | null
          created_at: string | null
          duration_minutes: number | null
          end_time: string | null
          id: string
          issue_description: string | null
          mentee_id: string
          mentor_id: string
          notes: string | null
          price: number | null
          rating: number | null
          recording_url: string | null
          session_type: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["session_status"] | null
          twilio_room_sid: string | null
          updated_at: string | null
        }
        Insert: {
          categories?: string[] | null
          created_at?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          issue_description?: string | null
          mentee_id: string
          mentor_id: string
          notes?: string | null
          price?: number | null
          rating?: number | null
          recording_url?: string | null
          session_type?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["session_status"] | null
          twilio_room_sid?: string | null
          updated_at?: string | null
        }
        Update: {
          categories?: string[] | null
          created_at?: string | null
          duration_minutes?: number | null
          end_time?: string | null
          id?: string
          issue_description?: string | null
          mentee_id?: string
          mentor_id?: string
          notes?: string | null
          price?: number | null
          rating?: number | null
          recording_url?: string | null
          session_type?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["session_status"] | null
          twilio_room_sid?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          session_id: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          stripe_payment_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          stripe_payment_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          session_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          stripe_payment_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          admin_notes: string | null
          amount: number
          created_at: string
          crypto_address: string | null
          crypto_network: string | null
          crypto_token: string | null
          id: string
          method: string
          paypal_email: string | null
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          amount: number
          created_at?: string
          crypto_address?: string | null
          crypto_network?: string | null
          crypto_token?: string | null
          id?: string
          method: string
          paypal_email?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          amount?: number
          created_at?: string
          crypto_address?: string | null
          crypto_network?: string | null
          crypto_token?: string | null
          id?: string
          method?: string
          paypal_email?: string | null
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_quoted_on_job: {
        Args: { _job_id: string; _user_id: string }
        Returns: boolean
      }
      has_quoted_on_same_job: {
        Args: { _job_id: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      is_mentor: { Args: { _user_id: string }; Returns: boolean }
      is_session_participant: {
        Args: { _session_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "mentor" | "mentee"
      match_status: "pending" | "accepted" | "declined" | "expired"
      session_status:
        | "pending"
        | "accepted"
        | "live"
        | "completed"
        | "cancelled"
      transaction_status: "pending" | "completed" | "failed"
      transaction_type:
        | "deposit"
        | "withdrawal"
        | "session_payment"
        | "session_earning"
        | "refund"
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
      app_role: ["admin", "mentor", "mentee"],
      match_status: ["pending", "accepted", "declined", "expired"],
      session_status: ["pending", "accepted", "live", "completed", "cancelled"],
      transaction_status: ["pending", "completed", "failed"],
      transaction_type: [
        "deposit",
        "withdrawal",
        "session_payment",
        "session_earning",
        "refund",
      ],
    },
  },
} as const
