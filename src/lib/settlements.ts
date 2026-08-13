interface PlayerCashout {
  memberId: string;
  displayName: string;
  cashoutTotal: number;
  buyinTotal: number;
  preferredPaymentMethod: string | null;
}

interface SettlementResult {
  toMemberId: string;
  amount: number;
  suggestedPaymentMethod: string | null;
}

export function calculateSettlements(
  players: PlayerCashout[],
  bankerMemberId: string,
): SettlementResult[] {
  return players
    .filter((player) => player.memberId !== bankerMemberId)
    .filter((player) => player.cashoutTotal > 0)
    .map((player) => ({
      toMemberId: player.memberId,
      amount: player.cashoutTotal,
      suggestedPaymentMethod: player.preferredPaymentMethod,
    }))
    .sort((left, right) => right.amount - left.amount);
}
