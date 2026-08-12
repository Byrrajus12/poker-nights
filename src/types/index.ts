import type { Database } from "./database";

export type { Database } from "./database";
export type {
  PaymentMethod,
  MemberRole,
  SessionStatus,
  TransactionType,
  SettlementPaymentMethod,
} from "./database";

export type User = Database["public"]["Tables"]["users"]["Row"];
export type Group = Database["public"]["Tables"]["groups"]["Row"];
export type GroupMember = Database["public"]["Tables"]["group_members"]["Row"];
export type Session = Database["public"]["Tables"]["sessions"]["Row"];
export type SessionPlayer = Database["public"]["Tables"]["session_players"]["Row"];
export type Transaction = Database["public"]["Tables"]["transactions"]["Row"];
export type Settlement = Database["public"]["Tables"]["settlements"]["Row"];
