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
          created_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          preferred_payment_method?: PaymentMethod | null;
          preferred_payment_handle?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          preferred_payment_method?: PaymentMethod | null;
          preferred_payment_handle?: string | null;
          created_at?: string;
        };
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
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string | null;
          display_name: string;
          role: MemberRole;
          is_claimed: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          user_id?: string | null;
          display_name: string;
          role?: MemberRole;
          is_claimed?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          user_id?: string | null;
          display_name?: string;
          role?: MemberRole;
          is_claimed?: boolean;
          created_at?: string;
        };
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
        };
        Insert: {
          id?: string;
          session_id: string;
          member_id: string;
          type: TransactionType;
          amount: number;
          created_by: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          session_id?: string;
          member_id?: string;
          type?: TransactionType;
          amount?: number;
          created_by?: string;
          created_at?: string;
        };
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
      };
    };
  };
}
