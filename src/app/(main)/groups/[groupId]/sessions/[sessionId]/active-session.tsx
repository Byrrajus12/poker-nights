"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatCents } from "@/lib/utils";
import type { Group, GroupMember, Session, SettlementPaymentMethod, Transaction } from "@/types";
import type { SessionPlayerWithMember } from "./page";

type ActiveSessionProps = {
  session: Session;
  group: Group;
  players: SessionPlayerWithMember[];
  groupMembers: GroupMember[];
  initialTransactions: Transaction[];
  currentUserId: string | null;
  isBanker: boolean;
};

type PlayerSummary = {
  buyins: number;
  cashouts: number;
  hasCashedOut: boolean;
  net: number | null;
  transactions: Transaction[];
};

type BuyinTarget = SessionPlayerWithMember | null;
type DetailTarget = SessionPlayerWithMember | null;
const paymentMethods: SettlementPaymentMethod[] = ["venmo", "cashapp", "zelle", "cash"];

function dollarsToCents(value: string): number | null {
  const trimmed = value.trim().replace(/^\$/, "");

  if (!/^\d+(\.\d{0,2})?$/.test(trimmed)) {
    return null;
  }

  const [dollars, cents = ""] = trimmed.split(".");
  return Number(dollars) * 100 + Number(cents.padEnd(2, "0"));
}

function formatElapsed(startedAt: string): string {
  const elapsedMs = Math.max(0, Date.now() - new Date(startedAt).getTime());
  const totalMinutes = Math.floor(elapsedMs / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return `${minutes}m`;
  }

  return `${hours}h ${minutes}m`;
}

function formatTime(timestamp: string): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatPaymentMethod(method: SettlementPaymentMethod | null): string | null {
  if (!method) {
    return null;
  }

  if (method === "cashapp") {
    return "CashApp";
  }

  return method[0].toUpperCase() + method.slice(1);
}

export function ActiveSession({
  session,
  group,
  players: initialPlayers,
  groupMembers: initialGroupMembers,
  initialTransactions,
  currentUserId,
  isBanker,
}: ActiveSessionProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [players, setPlayers] = useState(initialPlayers);
  const [groupMembers, setGroupMembers] = useState(initialGroupMembers);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [elapsed, setElapsed] = useState(() => formatElapsed(session.started_at));
  const [buyinTarget, setBuyinTarget] = useState<BuyinTarget>(null);
  const [detailTarget, setDetailTarget] = useState<DetailTarget>(null);
  const [customBuyin, setCustomBuyin] = useState("");
  const [selectedBuyinMethod, setSelectedBuyinMethod] = useState<SettlementPaymentMethod | null>(null);
  const [cashoutAmount, setCashoutAmount] = useState("");
  const [newPlayerName, setNewPlayerName] = useState("");
  const [showAddPlayer, setShowAddPlayer] = useState(false);
  const [confirmUndo, setConfirmUndo] = useState<Transaction | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const isActive = session.status === "active";
  const canManage = isBanker && isActive && currentUserId !== null;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setElapsed(formatElapsed(session.started_at));
    }, 60000);

    return () => window.clearInterval(timer);
  }, [session.started_at]);

  const summaries = useMemo(() => {
    const byMember = new Map<string, PlayerSummary>();

    for (const player of players) {
      byMember.set(player.member_id, {
        buyins: 0,
        cashouts: 0,
        hasCashedOut: false,
        net: null,
        transactions: [],
      });
    }

    for (const transaction of transactions) {
      const summary = byMember.get(transaction.member_id);

      if (!summary) {
        continue;
      }

      summary.transactions.push(transaction);

      if (transaction.type === "buyin") {
        summary.buyins += transaction.amount;
      } else {
        summary.cashouts += transaction.amount;
        summary.hasCashedOut = true;
      }
    }

    for (const summary of byMember.values()) {
      summary.transactions.sort(
        (left, right) => new Date(left.created_at).getTime() - new Date(right.created_at).getTime(),
      );
      summary.net = summary.hasCashedOut ? summary.cashouts - summary.buyins : null;
    }

    return byMember;
  }, [players, transactions]);

  const totalBuyins = transactions.reduce(
    (total, transaction) => total + (transaction.type === "buyin" ? transaction.amount : 0),
    0,
  );
  const totalCashouts = transactions.reduce(
    (total, transaction) => total + (transaction.type === "cashout" ? transaction.amount : 0),
    0,
  );
  const seatedMemberIds = new Set(players.map((player) => player.member_id));
  const availableMembers = groupMembers.filter((member) => !seatedMemberIds.has(member.id));

  function getMostRecentBuyinMethod(memberId: string): SettlementPaymentMethod | null {
    const buyins = transactions
      .filter((transaction) => transaction.member_id === memberId && transaction.type === "buyin")
      .sort(
        (left, right) =>
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
      );

    return buyins[0]?.payment_method ?? null;
  }

  function openBuyinModal(player: SessionPlayerWithMember) {
    setSelectedBuyinMethod(getMostRecentBuyinMethod(player.member_id));
    setBuyinTarget(player);
  }

  async function addTransaction(
    memberId: string,
    type: "buyin" | "cashout",
    amount: number,
    paymentMethod: SettlementPaymentMethod | null = null,
  ) {
    if (!currentUserId) {
      setMessage("You need to be signed in to manage this session.");
      return false;
    }

    if (amount <= 0) {
      setMessage("Enter an amount greater than $0.");
      return false;
    }

    setBusy(`${type}-${memberId}`);
    setMessage(null);

    const { data, error } = await supabase
      .from("transactions")
      .insert({
        session_id: session.id,
        member_id: memberId,
        type,
        amount,
        created_by: currentUserId,
        payment_method: type === "buyin" ? paymentMethod : null,
      })
      .select("id,session_id,member_id,type,amount,created_by,created_at,payment_method")
      .single();

    setBusy(null);

    if (error) {
      setMessage(error.message);
      return false;
    }

    setTransactions((current) => [...current, data]);
    return true;
  }

  async function handlePresetBuyin(player: SessionPlayerWithMember, amount: number) {
    if (!selectedBuyinMethod) {
      setMessage("Choose how the player paid first.");
      return;
    }

    const didAdd = await addTransaction(player.member_id, "buyin", amount, selectedBuyinMethod);

    if (didAdd) {
      setBuyinTarget(null);
      setCustomBuyin("");
      setSelectedBuyinMethod(null);
    }
  }

  async function handleCustomBuyin() {
    if (!buyinTarget) {
      return;
    }

    if (!selectedBuyinMethod) {
      setMessage("Choose how the player paid first.");
      return;
    }

    const amount = dollarsToCents(customBuyin);

    if (amount === null) {
      setMessage("Use a dollar amount like 20 or 20.50.");
      return;
    }

    const didAdd = await addTransaction(
      buyinTarget.member_id,
      "buyin",
      amount,
      selectedBuyinMethod,
    );

    if (didAdd) {
      setBuyinTarget(null);
      setCustomBuyin("");
      setSelectedBuyinMethod(null);
    }
  }

  async function handleCashout() {
    if (!detailTarget) {
      return;
    }

    const amount = dollarsToCents(cashoutAmount);

    if (amount === null) {
      setMessage("Use a dollar amount like 120 or 120.50.");
      return;
    }

    const didAdd = await addTransaction(detailTarget.member_id, "cashout", amount);

    if (didAdd) {
      setCashoutAmount("");
    }
  }

  async function undoTransaction(transaction: Transaction) {
    setBusy(`undo-${transaction.id}`);
    setMessage(null);

    const { error } = await supabase.from("transactions").delete().eq("id", transaction.id);

    setBusy(null);
    setConfirmUndo(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setTransactions((current) => current.filter((item) => item.id !== transaction.id));
  }

  async function addExistingPlayer(member: GroupMember) {
    setBusy(`player-${member.id}`);
    setMessage(null);

    const { data, error } = await supabase
      .from("session_players")
      .insert({
        session_id: session.id,
        member_id: member.id,
      })
      .select("id,session_id,member_id,joined_at")
      .single();

    setBusy(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPlayers((current) => [
      ...current,
      {
        ...data,
        member: {
          id: member.id,
          display_name: member.display_name,
        },
      },
    ]);
    setShowAddPlayer(false);
  }

  async function addBrandNewPlayer() {
    const displayName = newPlayerName.trim();

    if (!displayName) {
      setMessage("Enter a player name.");
      return;
    }

    setBusy("new-player");
    setMessage(null);

    const { data: member, error: memberError } = await supabase
      .from("group_members")
      .insert({
        group_id: group.id,
        display_name: displayName,
      })
      .select("id,group_id,user_id,display_name,role,is_claimed,created_at")
      .single();

    if (memberError) {
      setBusy(null);
      setMessage(memberError.message);
      return;
    }

    const { data: sessionPlayer, error: playerError } = await supabase
      .from("session_players")
      .insert({
        session_id: session.id,
        member_id: member.id,
      })
      .select("id,session_id,member_id,joined_at")
      .single();

    setBusy(null);

    if (playerError) {
      setMessage(playerError.message);
      return;
    }

    setGroupMembers((current) => [...current, member]);
    setPlayers((current) => [
      ...current,
      {
        ...sessionPlayer,
        member: {
          id: member.id,
          display_name: member.display_name,
        },
      },
    ]);
    setNewPlayerName("");
    setShowAddPlayer(false);
  }

  async function endSession() {
    const playersMissingCashout = players.filter(
      (player) => !summaries.get(player.member_id)?.hasCashedOut,
    );

    if (playersMissingCashout.length > 0) {
      setMessage(
        `Cash out first: ${playersMissingCashout
          .map((player) => player.member.display_name)
          .join(", ")}.`,
      );
      return;
    }

    const discrepancy = totalCashouts - totalBuyins;

    if (discrepancy !== 0) {
      setMessage(
        discrepancy < 0
          ? `Cashouts are ${formatCents(Math.abs(discrepancy))} short.`
          : `Cashouts are ${formatCents(discrepancy)} over.`,
      );
      return;
    }

    setBusy("end-session");
    setMessage(null);

    const { error } = await supabase
      .from("sessions")
      .update({ ended_at: new Date().toISOString(), status: "settling" })
      .eq("id", session.id);

    setBusy(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push(`/groups/${group.id}/sessions/${session.id}/settle`);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-28 text-zinc-100">
      <header className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-500">{group.name}</p>
            <h1 className="mt-1 text-3xl font-semibold text-zinc-50">Active session</h1>
          </div>
          <span className="rounded-md border border-emerald-800 bg-emerald-950 px-3 py-2 text-sm font-medium capitalize text-emerald-200">
            {session.status}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Pot</p>
            <p className="mt-1 text-xl font-semibold text-zinc-50">{formatCents(totalBuyins)}</p>
          </div>
          <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Time</p>
            <p className="mt-1 text-xl font-semibold text-zinc-50">{elapsed}</p>
          </div>
          <div className="rounded-md border border-zinc-800 bg-zinc-900 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Players</p>
            <p className="mt-1 text-xl font-semibold text-zinc-50">{players.length}</p>
          </div>
        </div>
      </header>

      {message ? (
        <div className="rounded-md border border-amber-700 bg-amber-950/70 p-4 text-sm text-amber-100">
          {message}
        </div>
      ) : null}

      <section className="space-y-3">
        {players.map((player) => {
          const summary = summaries.get(player.member_id);
          const isBusy = busy === `buyin-${player.member_id}`;

          return (
            <button
              className="w-full rounded-md border border-zinc-800 bg-zinc-900 p-4 text-left transition hover:border-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              key={player.id}
              onClick={() => setDetailTarget(player)}
              type="button"
            >
              <div className="flex min-h-16 items-center gap-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-semibold text-zinc-50">
                    {player.member.display_name}
                  </p>
                  <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-zinc-500">Buyins</p>
                      <p className="text-lg font-semibold text-zinc-100">
                        {formatCents(summary?.buyins ?? 0)}
                      </p>
                    </div>
                    <div>
                      <p className="text-zinc-500">Cashout</p>
                      <p className="text-lg font-semibold text-zinc-100">
                        {summary?.hasCashedOut ? formatCents(summary.cashouts) : "Open"}
                      </p>
                    </div>
                  </div>
                  {summary?.net !== null && summary?.net !== undefined ? (
                    <p
                      className={`mt-2 text-lg font-semibold ${
                        summary.net >= 0 ? "text-emerald-300" : "text-red-300"
                      }`}
                    >
                      Net {summary.net >= 0 ? "+" : ""}
                      {formatCents(summary.net)}
                    </p>
                  ) : null}
                </div>
                {canManage ? (
                  <button
                    aria-label={`Add buyin for ${player.member.display_name}`}
                    className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-emerald-500 text-3xl font-semibold text-zinc-950 shadow-lg shadow-emerald-950/50 transition hover:bg-emerald-400 disabled:opacity-60"
                    disabled={isBusy}
                    onClick={(event) => {
                      event.stopPropagation();
                      openBuyinModal(player);
                    }}
                    type="button"
                  >
                    +
                  </button>
                ) : null}
              </div>
            </button>
          );
        })}
      </section>

      <div className="flex flex-col gap-3 sm:flex-row">
        {canManage ? (
          <>
            <button
              className="min-h-12 flex-1 rounded-md border border-zinc-700 px-4 font-medium text-zinc-100 hover:border-zinc-500"
              onClick={() => setShowAddPlayer(true)}
              type="button"
            >
              Add player
            </button>
            <button
              className="min-h-12 flex-1 rounded-md bg-red-500 px-4 font-semibold text-white hover:bg-red-400 disabled:opacity-60"
              disabled={busy === "end-session"}
              onClick={endSession}
              type="button"
            >
              End session
            </button>
          </>
        ) : (
          <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4 text-sm text-zinc-400">
            Read-only view. Only the banker can manage buyins and cashouts.
          </div>
        )}
      </div>

      {buyinTarget ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-3 sm:items-center sm:justify-center">
          <div className="w-full max-w-md rounded-md border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-500">Add buyin</p>
                <h2 className="text-2xl font-semibold text-zinc-50">
                  {buyinTarget.member.display_name}
                </h2>
              </div>
              <button
                className="min-h-12 rounded-md px-3 text-zinc-400 hover:text-zinc-100"
                onClick={() => {
                  setBuyinTarget(null);
                  setSelectedBuyinMethod(null);
                }}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="mt-5 flex gap-2">
              {paymentMethods.map((method) => (
                <button
                  className={`min-h-12 flex-1 rounded-md border px-2 text-sm font-semibold ${
                    selectedBuyinMethod === method
                      ? "border-emerald-400 bg-emerald-500 text-zinc-950"
                      : "border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-500"
                  }`}
                  key={method}
                  onClick={() => setSelectedBuyinMethod(method)}
                  type="button"
                >
                  {formatPaymentMethod(method)}
                </button>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              {group.buyin_presets.map((amount) => (
                <button
                  className="min-h-16 rounded-md bg-emerald-500 px-4 text-xl font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
                  disabled={busy === `buyin-${buyinTarget.member_id}` || !selectedBuyinMethod}
                  key={amount}
                  onClick={() => handlePresetBuyin(buyinTarget, amount)}
                  type="button"
                >
                  {formatCents(amount)}
                </button>
              ))}
            </div>

            <div className="mt-5 flex gap-2">
              <input
                className="min-h-12 min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-4 text-lg text-zinc-100 outline-none focus:border-emerald-500"
                inputMode="decimal"
                onChange={(event) => setCustomBuyin(event.target.value)}
                placeholder="Custom"
                value={customBuyin}
              />
              <button
                className="min-h-12 rounded-md bg-zinc-100 px-5 font-semibold text-zinc-950 hover:bg-white disabled:opacity-60"
                disabled={busy === `buyin-${buyinTarget.member_id}` || !selectedBuyinMethod}
                onClick={handleCustomBuyin}
                type="button"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {detailTarget ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-3 sm:items-center sm:justify-center">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-md border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-500">Player</p>
                <h2 className="text-2xl font-semibold text-zinc-50">
                  {detailTarget.member.display_name}
                </h2>
              </div>
              <button
                className="min-h-12 rounded-md px-3 text-zinc-400 hover:text-zinc-100"
                onClick={() => {
                  setDetailTarget(null);
                  setCashoutAmount("");
                }}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-2">
              {(summaries.get(detailTarget.member_id)?.transactions ?? []).length > 0 ? (
                summaries.get(detailTarget.member_id)?.transactions.map((transaction) => (
                  <div
                    className="flex min-h-12 items-center justify-between rounded-md bg-zinc-900 px-4"
                    key={transaction.id}
                  >
                    <div>
                      <p className="font-medium capitalize text-zinc-100">{transaction.type}</p>
                      <p className="text-sm text-zinc-500">
                        {formatTime(transaction.created_at)}
                        {transaction.type === "buyin" && transaction.payment_method
                          ? ` via ${formatPaymentMethod(transaction.payment_method)}`
                          : ""}
                      </p>
                    </div>
                    <p
                      className={`text-lg font-semibold ${
                        transaction.type === "buyin" ? "text-zinc-100" : "text-emerald-300"
                      }`}
                    >
                      {formatCents(transaction.amount)}
                    </p>
                  </div>
                ))
              ) : (
                <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4 text-zinc-400">
                  No transactions yet.
                </div>
              )}
            </div>

            {canManage ? (
              <div className="mt-5 space-y-3">
                <div className="flex gap-2">
                  <input
                    className="min-h-12 min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-4 text-lg text-zinc-100 outline-none focus:border-emerald-500"
                    inputMode="decimal"
                    onChange={(event) => setCashoutAmount(event.target.value)}
                    placeholder="Cashout"
                    value={cashoutAmount}
                  />
                  <button
                    className="min-h-12 rounded-md bg-emerald-500 px-5 font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
                    disabled={busy === `cashout-${detailTarget.member_id}`}
                    onClick={handleCashout}
                    type="button"
                  >
                    Cash out
                  </button>
                </div>

                <button
                  className="min-h-12 w-full rounded-md border border-red-800 px-4 font-medium text-red-200 hover:border-red-500 disabled:opacity-50"
                  disabled={(summaries.get(detailTarget.member_id)?.transactions.length ?? 0) === 0}
                  onClick={() => {
                    const playerTransactions =
                      summaries.get(detailTarget.member_id)?.transactions ?? [];
                    setConfirmUndo(playerTransactions[playerTransactions.length - 1] ?? null);
                  }}
                  type="button"
                >
                  Undo last
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {showAddPlayer ? (
        <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-3 sm:items-center sm:justify-center">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-md border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-zinc-500">Session roster</p>
                <h2 className="text-2xl font-semibold text-zinc-50">Add player</h2>
              </div>
              <button
                className="min-h-12 rounded-md px-3 text-zinc-400 hover:text-zinc-100"
                onClick={() => setShowAddPlayer(false)}
                type="button"
              >
                Close
              </button>
            </div>

            <div className="mt-5 space-y-2">
              {availableMembers.length > 0 ? (
                availableMembers.map((member) => (
                  <button
                    className="flex min-h-12 w-full items-center justify-between rounded-md bg-zinc-900 px-4 text-left font-medium text-zinc-100 hover:bg-zinc-800 disabled:opacity-60"
                    disabled={busy === `player-${member.id}`}
                    key={member.id}
                    onClick={() => addExistingPlayer(member)}
                    type="button"
                  >
                    <span>{member.display_name}</span>
                    <span className="text-zinc-500">Add</span>
                  </button>
                ))
              ) : (
                <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4 text-zinc-400">
                  Everyone in the roster is already seated.
                </div>
              )}
            </div>

            <div className="mt-5 flex gap-2">
              <input
                className="min-h-12 min-w-0 flex-1 rounded-md border border-zinc-700 bg-zinc-900 px-4 text-lg text-zinc-100 outline-none focus:border-emerald-500"
                onChange={(event) => setNewPlayerName(event.target.value)}
                placeholder="New player"
                value={newPlayerName}
              />
              <button
                className="min-h-12 rounded-md bg-zinc-100 px-5 font-semibold text-zinc-950 hover:bg-white disabled:opacity-60"
                disabled={busy === "new-player"}
                onClick={addBrandNewPlayer}
                type="button"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmUndo ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-sm rounded-md border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <h2 className="text-xl font-semibold text-zinc-50">Undo transaction?</h2>
            <p className="mt-2 text-zinc-400">
              Remove the last {confirmUndo.type} for {formatCents(confirmUndo.amount)}.
            </p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                className="min-h-12 rounded-md border border-zinc-700 px-4 font-medium text-zinc-100 hover:border-zinc-500"
                onClick={() => setConfirmUndo(null)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="min-h-12 rounded-md bg-red-500 px-4 font-semibold text-white hover:bg-red-400 disabled:opacity-60"
                disabled={busy === `undo-${confirmUndo.id}`}
                onClick={() => undoTransaction(confirmUndo)}
                type="button"
              >
                Undo
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
