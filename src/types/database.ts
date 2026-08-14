export type PaymentMethod = "venmo" | "cashapp" | "zelle";
export type MemberRole = "admin" | "member";
export type SessionStatus = "active" | "settling" | "settled";
export type TransactionType = "buyin" | "cashout";
export type SettlementPaymentMethod = "venmo" | "cashapp" | "zelle" | "cash";

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          preferred_payment_method: PaymentMethod | null;
          preferred_payment_handle: string | null;
          venmo_handle: string | null;
          cashapp_handle: string | null;
          zelle_handle: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          preferred_payment_method?: PaymentMethod | null;
          preferred_payment_handle?: string | null;
          venmo_handle?: string | null;
          cashapp_handle?: string | null;
          zelle_handle?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          preferred_payment_method?: PaymentMethod | null;
          preferred_payment_handle?: string | null;
          venmo_handle?: string | null;
          cashapp_handle?: string | null;
          zelle_handle?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      groups: {
        Row: {
          id: string;
          name: string;
          invite_code: string;
          created_by: string;
          buyin_presets: number[];
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          invite_code: string;
          created_by: string;
          buyin_presets?: number[];
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          invite_code?: string;
          created_by?: string;
          buyin_presets?: number[];
          created_at?: string;
        };
        Relationships: [];
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string | null;
          display_name: string;
          role: MemberRole;
          is_claimed: boolean;
          venmo_handle: string | null;
          cashapp_handle: string | null;
          zelle_handle: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id?: string | null;
          display_name: string;
          role?: MemberRole;
          is_claimed?: boolean;
          venmo_handle?: string | null;
          cashapp_handle?: string | null;
          zelle_handle?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string | null;
          display_name?: string;
          role?: MemberRole;
          is_claimed?: boolean;
          venmo_handle?: string | null;
          cashapp_handle?: string | null;
          zelle_handle?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          group_id: string;
          banker_id: string;
          status: SessionStatus;
          started_at: string;
          ended_at: string | null;
          notes: string | null;
        };
        Insert: {
          id?: string;
          group_id: string;
          banker_id: string;
          status?: SessionStatus;
          started_at?: string;
          ended_at?: string | null;
          notes?: string | null;
        };
        Update: {
          id?: string;
          group_id?: string;
          banker_id?: string;
          status?: SessionStatus;
          started_at?: string;
          ended_at?: string | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      session_players: {
        Row: {
          id: string;
          session_id: string;
          member_id: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          session_id: string;
          member_id: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          member_id?: string;
          joined_at?: string;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          id: string;
          session_id: string;
          member_id: string;
          type: TransactionType;
          amount: number;
          created_by: string;
          created_at: string;
          payment_method: 'venmo' | 'cashapp' | 'zelle' | 'cash' | null
        };
        Insert: {
          id?: string;
          session_id: string;
          member_id: string;
          type: TransactionType;
          amount: number;
          created_by: string;
          created_at?: string;
          payment_method: 'venmo' | 'cashapp' | 'zelle' | 'cash' | null
        };
        Update: {
          id?: string;
          session_id?: string;
          member_id?: string;
          type?: TransactionType;
          amount?: number;
          created_by?: string;
          created_at?: string;
          payment_method: 'venmo' | 'cashapp' | 'zelle' | 'cash' | null
        };
        Relationships: [];
      };
      settlements: {
        Row: {
          id: string;
          session_id: string;
          from_member_id: string;
          to_member_id: string;
          amount: number;
          payment_method: SettlementPaymentMethod | null;
          is_paid: boolean;
          paid_at: string | null;
        };
        Insert: {
          id?: string;
          session_id: string;
          from_member_id: string;
          to_member_id: string;
          amount: number;
          payment_method?: SettlementPaymentMethod | null;
          is_paid?: boolean;
          paid_at?: string | null;
        };
        Update: {
          id?: string;
          session_id?: string;
          from_member_id?: string;
          to_member_id?: string;
          amount?: number;
          payment_method?: SettlementPaymentMethod | null;
          is_paid?: boolean;
          paid_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      generate_invite_code: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
