import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { GroupMember, SettlementPaymentMethod, Transaction } from "@/types";
import { SettlementView, type SettlementPlayerItem, type SettlementViewItem } from "./settlement-view";

type PlayerCashout = {
  memberId: string;
  displayName: string;
  avatarUrl: string | null;
  cashoutTotal: number;
  buyinTotal: number;
  preferredPaymentMethod: SettlementPaymentMethod | null;
};

type PaymentInfo = {
  venmo: string | null;
  cashapp: string | null;
  zelle: string | null;
};

export default async function SettleSessionPage({
  params,
}: {
  params: Promise<{ groupId: string; sessionId: string }>;
}) {
  const { groupId, sessionId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    redirect("/login");
  }

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .select("id,group_id,banker_id,status,started_at,ended_at,notes")
    .eq("id", sessionId)
    .eq("group_id", groupId)
    .maybeSingle();

  if (sessionError) {
    throw new Error(sessionError.message);
  }

  if (!session) {
    notFound();
  }

  if (session.status === "active") {
    redirect(`/groups/${groupId}/sessions/${sessionId}`);
  }

  const [
    { data: transactions, error: transactionsError },
    { data: sessionPlayers, error: playersError },
    { data: rosterMembers, error: membersError },
    { data: existingSettlements, error: existingSettlementsError },
  ] = await Promise.all([
    supabase
      .from("transactions")
      .select("id,session_id,member_id,type,amount,created_by,created_at,payment_method")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true }),
    supabase
      .from("session_players")
      .select("id,session_id,member_id,joined_at")
      .eq("session_id", sessionId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("group_members")
      .select("id,group_id,user_id,display_name,avatar_url,role,is_claimed,venmo_handle,cashapp_handle,zelle_handle,created_at")
      .eq("group_id", groupId),
    supabase
      .from("settlements")
      .select("id,session_id,from_member_id,to_member_id,amount,payment_method,is_paid,paid_at")
      .eq("session_id", sessionId)
      .order("amount", { ascending: false }),
  ]);

  if (transactionsError) {
    throw new Error(transactionsError.message);
  }

  if (playersError) {
    throw new Error(playersError.message);
  }

  if (membersError) {
    throw new Error(membersError.message);
  }

  if (existingSettlementsError) {
    throw new Error(existingSettlementsError.message);
  }

  const membersById = new Map((rosterMembers ?? []).map((member) => [member.id, member]));
  const bankerMember = (rosterMembers ?? []).find((member) => member.user_id === session.banker_id);
  const currentMember = (rosterMembers ?? []).find((member) => member.user_id === user.id);

  if (!bankerMember) {
    throw new Error("Banker is not a member of this group.");
  }

  const players = buildPlayerCashouts(sessionPlayers ?? [], transactions ?? [], membersById);
  const suggestedMethodByMemberId = new Map(
    players.map((player) => [player.memberId, player.preferredPaymentMethod]),
  );

  const paymentInfoByMemberId = await getPlayerPaymentInfo(
    rosterMembers ?? [],
    new Set(players.map((player) => player.memberId)),
  );
  const viewSettlements: SettlementViewItem[] = (existingSettlements ?? []).map((settlement) => {
    const toMember = membersById.get(settlement.to_member_id);
    const paymentInfo = paymentInfoByMemberId.get(settlement.to_member_id) ?? {
      venmo: null,
      cashapp: null,
      zelle: null,
    };

    return {
      id: settlement.id,
      toMemberId: settlement.to_member_id,
      toDisplayName: toMember?.display_name ?? "Unknown player",
      toAvatarUrl: toMember?.avatar_url ?? null,
      amount: settlement.amount,
      paymentMethod: settlement.payment_method,
      isPaid: session.status === "settled" ? true : settlement.is_paid,
      paidAt: settlement.paid_at,
      suggestedPaymentMethod:
        settlement.payment_method ?? suggestedMethodByMemberId.get(settlement.to_member_id) ?? null,
      handles: paymentInfo,
    };
  });
  const settlementPlayers: SettlementPlayerItem[] = players.map((player) => ({
    memberId: player.memberId,
    displayName: player.displayName,
    avatarUrl: player.avatarUrl,
    buyinTotal: player.buyinTotal,
    cashoutTotal: player.cashoutTotal,
    net: player.cashoutTotal - player.buyinTotal,
    preferredPaymentMethod: player.preferredPaymentMethod,
    handles: paymentInfoByMemberId.get(player.memberId) ?? {
      venmo: null,
      cashapp: null,
      zelle: null,
    },
  }));

  return (
    <SettlementView
      bankerDisplayName={bankerMember.display_name}
      bankerMemberId={bankerMember.id}
      currentMemberId={currentMember?.id ?? null}
      groupId={groupId}
      isBanker={user.id === session.banker_id}
      isSettled={session.status === "settled"}
      sessionStatus={session.status}
      sessionId={sessionId}
      settlements={viewSettlements}
      startedAt={session.started_at}
      endedAt={session.ended_at}
      players={settlementPlayers}
    />
  );
}

function buildPlayerCashouts(
  sessionPlayers: { member_id: string }[],
  transactions: Transaction[],
  membersById: Map<string, GroupMember>,
): PlayerCashout[] {
  return sessionPlayers.flatMap((player) => {
    const member = membersById.get(player.member_id);

    if (!member) {
      return [];
    }

    const playerTransactions = transactions.filter(
      (transaction) => transaction.member_id === player.member_id,
    );
    const buyinTotal = playerTransactions.reduce(
      (total, transaction) =>
        transaction.type === "buyin" ? total + transaction.amount : total,
      0,
    );
    const cashoutTotal = playerTransactions.reduce(
      (total, transaction) =>
        transaction.type === "cashout" ? total + transaction.amount : total,
      0,
    );
    const latestBuyin = [...playerTransactions]
      .filter((transaction) => transaction.type === "buyin")
      .sort(
        (left, right) =>
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
      )[0];

    return [
      {
        memberId: player.member_id,
        displayName: member.display_name,
        avatarUrl: member.avatar_url,
        cashoutTotal,
        buyinTotal,
        preferredPaymentMethod: latestBuyin?.payment_method ?? null,
      },
    ];
  });
}

async function getPlayerPaymentInfo(
  members: GroupMember[],
  playerMemberIds: Set<string>,
): Promise<Map<string, PaymentInfo>> {
  const recipientUserIds = members
    .filter((member) => playerMemberIds.has(member.id) && member.user_id)
    .map((member) => member.user_id as string);

  const admin = createAdminClient();
  const { data: users, error } = recipientUserIds.length > 0
    ? await admin.from("users").select("id,venmo_handle,cashapp_handle,zelle_handle").in("id", recipientUserIds)
    : { data: [], error: null };

  if (error) {
    throw new Error(error.message);
  }

  const usersById = new Map((users ?? []).map((user) => [user.id, user]));
  const paymentInfoByMemberId = new Map<string, PaymentInfo>();

  for (const member of members) {
    if (!playerMemberIds.has(member.id)) {
      continue;
    }

    const recipient = member.user_id ? usersById.get(member.user_id) : null;
    paymentInfoByMemberId.set(member.id, {
      venmo: recipient?.venmo_handle ?? member.venmo_handle,
      cashapp: recipient?.cashapp_handle ?? member.cashapp_handle,
      zelle: recipient?.zelle_handle ?? member.zelle_handle,
    });
  }

  return paymentInfoByMemberId;
}
