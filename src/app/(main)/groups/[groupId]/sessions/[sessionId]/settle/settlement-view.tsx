"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight, Check, ChevronLeft } from "lucide-react";
import { getCashAppLink, getVenmoDeepLink } from "@/lib/payment-links";
import { calculateSettlements } from "@/lib/settlements";
import { createClient } from "@/lib/supabase/client";
import { AmountDisplay } from "@/components/ui/amount-display";
import { FeltCard } from "@/components/ui/felt-card";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { PaymentMethodIcon, PaymentMethodSelector } from "@/components/ui/payment-method-selector";
import { formatCents, formatDuration, formatSessionDate } from "@/lib/utils";
import type { Database, SessionStatus, Settlement, SettlementPaymentMethod } from "@/types";

type PaymentHandles = { venmo: string | null; cashapp: string | null; zelle: string | null };
export type SettlementViewItem = { id: string; toMemberId: string; toDisplayName: string; toAvatarUrl: string | null; amount: number; paymentMethod: SettlementPaymentMethod | null; isPaid: boolean; paidAt: string | null; suggestedPaymentMethod: SettlementPaymentMethod | null; handles: PaymentHandles };
export type PlayerResultItem = { memberId: string; displayName: string; avatarUrl: string | null; buyinTotal: number; cashoutTotal: number; net: number };
export type SettlementPlayerItem = PlayerResultItem & { preferredPaymentMethod: SettlementPaymentMethod | null; handles: PaymentHandles };
type Props = { groupId: string; sessionId: string; settlements: SettlementViewItem[]; bankerDisplayName: string; bankerMemberId: string; currentMemberId: string | null; isBanker: boolean; isSettled: boolean; sessionStatus: SessionStatus; startedAt: string; endedAt: string | null; players: SettlementPlayerItem[] };
const label = (method: SettlementPaymentMethod | null) => !method ? "manual" : method === "cashapp" ? "Cash App" : method.charAt(0).toUpperCase() + method.slice(1);

const goldPill = "h-12 rounded-full bg-accent text-accent-ink text-[15px] font-semibold active:scale-[0.98] transition disabled:bg-surface-2 disabled:text-ink-3";
const darkPill = "flex h-12 items-center justify-center gap-2 rounded-full bg-ink px-3 text-[15px] font-semibold text-bg active:scale-[0.98] transition";
const sectionLabel = "text-[11px] font-semibold uppercase tracking-[0.10em] text-ink-3";
const tile = "rounded-3xl bg-surface";

export function SettlementView({ groupId, sessionId, settlements: initial, bankerDisplayName, bankerMemberId, currentMemberId, isBanker, isSettled, sessionStatus, startedAt, endedAt, players }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const reducedMotion = useReducedMotion();
  const shouldInitialize = initial.length === 0 && sessionStatus === "settling";
  const initializationStarted = useRef(false);
  const [settlements, setSettlements] = useState(initial);
  const [selected, setSelected] = useState<Record<string, SettlementPaymentMethod>>(() => Object.fromEntries(initial.map((item) => [item.id, item.paymentMethod ?? item.suggestedPaymentMethod ?? "cash"])));
  const [initializing, setInitializing] = useState(shouldInitialize);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [editingHandle, setEditingHandle] = useState<string | null>(null);
  const [handleValue, setHandleValue] = useState("");
  const readOnly = !isBanker || isSettled;
  const visible = isBanker ? settlements : settlements.filter((item) => item.toMemberId === currentMemberId);
  const paidCount = settlements.filter((item) => item.isPaid).length;
  const allPaid = !initializing && paidCount === settlements.length;
  const sortedResults = [...players].sort((a, b) => b.net - a.net);
  const totalPot = players.reduce((sum, item) => sum + item.buyinTotal, 0);
  const myResult = players.find((item) => item.memberId === currentMemberId);
  const myPayout = visible.reduce((sum, item) => sum + item.amount, 0);

  useEffect(() => {
    if (!shouldInitialize || initializationStarted.current) return;
    initializationStarted.current = true;

    async function initializeSettlements() {
      setMessage("");

      try {
        const rows = calculateSettlements(players, bankerMemberId).map((settlement) => ({
          session_id: sessionId,
          from_member_id: bankerMemberId,
          to_member_id: settlement.toMemberId,
          amount: settlement.amount,
          payment_method: normalizePaymentMethod(settlement.suggestedPaymentMethod),
        }));

        if (rows.length > 0) {
          const { error: insertError } = await supabase
            .from("settlements")
            .upsert(rows, { onConflict: "session_id,to_member_id", ignoreDuplicates: true });
          if (insertError) throw insertError;
        }

        const { data, error: fetchError } = await supabase
          .from("settlements")
          .select("id,session_id,from_member_id,to_member_id,amount,payment_method,is_paid,paid_at")
          .eq("session_id", sessionId)
          .order("amount", { ascending: false });
        if (fetchError) throw fetchError;

        const playersById = new Map(players.map((player) => [player.memberId, player]));
        const canonical = (data ?? []).map((settlement) =>
          toSettlementViewItem(settlement, playersById, isSettled),
        );
        setSettlements(canonical);
        setSelected(Object.fromEntries(canonical.map((item) => [
          item.id,
          item.paymentMethod ?? item.suggestedPaymentMethod ?? "cash",
        ])));
      } catch (error) {
        setMessage(getErrorMessage(error));
      } finally {
        setInitializing(false);
      }
    }

    void initializeSettlements();
  }, [bankerMemberId, isSettled, players, sessionId, shouldInitialize, supabase]);

  async function markPaid(item: SettlementViewItem) {
    const method = selected[item.id] ?? "cash";
    const paidAt = new Date().toISOString();
    setSettlements((current) => current.map((row) => row.id === item.id ? { ...row, isPaid: true, paymentMethod: method, paidAt } : row));
    setBusy(item.id); setMessage("");
    const { error } = await supabase.from("settlements").update({ is_paid: true, paid_at: paidAt, payment_method: method }).eq("id", item.id);
    setBusy(null);
    if (error) { setSettlements((current) => current.map((row) => row.id === item.id ? item : row)); setMessage(error.message); }
  }

  async function undoMarkPaid(item: SettlementViewItem) {
    if (readOnly || busy) return;
    setSettlements((current) => current.map((row) => row.id === item.id ? { ...row, isPaid: false, paidAt: null } : row));
    setBusy(item.id); setMessage("");
    const { error } = await supabase.from("settlements").update({ is_paid: false, paid_at: null }).eq("id", item.id);
    setBusy(null);
    if (error) { setSettlements((current) => current.map((row) => row.id === item.id ? item : row)); setMessage(error.message); }
  }

  async function finish() {
    setBusy("finish");
    const { error } = await supabase.from("sessions").update({ status: "settled" }).eq("id", sessionId);
    setBusy(null); if (error) { setMessage(error.message); return; }
    router.push(`/groups/${groupId}`); router.refresh();
  }

  async function saveHandle(item: SettlementViewItem, method: Exclude<SettlementPaymentMethod, "cash">) {
    const trimmed = handleValue.trim();
    const value = method === "venmo" ? trimmed.replace(/^@+/, "") : method === "cashapp" ? trimmed.replace(/^\$+/, "") : trimmed;
    if (!value) return;
    setBusy(`handle-${item.id}`); setMessage("");
    const update: Database["public"]["Tables"]["group_members"]["Update"] = method === "venmo"
      ? { venmo_handle: value }
      : method === "cashapp"
        ? { cashapp_handle: value }
        : { zelle_handle: value };
    const { error } = await supabase.from("group_members").update(update).eq("id", item.toMemberId);
    setBusy(null);
    if (error) { setMessage(error.message); return; }
    setSettlements((current) => current.map((row) => row.toMemberId === item.toMemberId ? { ...row, handles: { ...row.handles, [method]: value } } : row));
    setEditingHandle(null); setHandleValue("");
  }

  return (
    <div className="pb-32">
      <Link className="-ml-1 flex h-11 w-fit items-center gap-1 pr-2 text-[15px] font-medium text-ink-2" href={`/groups/${groupId}`}>
        <ChevronLeft aria-hidden size={20} />
        Back
      </Link>

      <h1 className="mt-1 text-[30px] font-bold tracking-tight text-ink">Settle up</h1>
      <div className="mt-1 flex items-center gap-3">
        <p className="text-[13px] text-ink-2">{formatSessionDate(startedAt)} · {formatDuration(startedAt, endedAt)}</p>
        <StatusBadge status={isSettled ? "settled" : "settling"} />
      </div>

      <FeltCard className="mt-6" variant={isSettled ? "unlit" : "live"}>
        <div className="px-[22px] py-5">
          <p className={`font-serif-accent text-[17px] ${isSettled ? "text-ink-3" : "text-on-felt-dim"}`}>final pot</p>
          <AmountDisplay amount={totalPot} className={`!text-[36px] ${isSettled ? "!text-ink" : "!text-on-felt"}`} size="xl" variant="display" />
        </div>
      </FeltCard>

      <section className={`${tile} mt-6 overflow-hidden`}>
        <div className="divide-y divide-line">
          {sortedResults.map((player, index) => {
            const isPodium = index === 0 && player.net > 0;
            return (
              <div className={`flex items-center gap-3 px-4 py-3.5 ${isPodium ? "bg-surface-2" : ""}`} key={player.memberId}>
                <PlayerAvatar avatarUrl={player.avatarUrl} name={player.displayName} ring={isPodium} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-ink">
                    {player.displayName}
                    {isPodium ? <span className="font-serif-accent ml-2 text-[14px] font-normal text-ink-2">took the table</span> : null}
                  </p>
                  <p className="text-[13px] tabular-nums text-ink-2">In {formatCents(player.buyinTotal)} · Out {formatCents(player.cashoutTotal)}</p>
                </div>
                <AmountDisplay amount={player.net} className="!text-[16px]" colored showSign size="md" />
              </div>
            );
          })}
        </div>
      </section>

      {!isBanker ? (
        <section className={`${tile} mt-6 p-5`}>
          <p className={sectionLabel}>Your result</p>
          {myResult && myResult.net > 0
            ? <p className="mt-1.5 text-[15px] text-ink">{bankerDisplayName} owes you <AmountDisplay amount={myPayout} className="align-middle" size="md" />{visible[0] ? ` via ${label(visible[0].paymentMethod ?? visible[0].suggestedPaymentMethod)}` : ""}.</p>
            : myResult?.net === 0
              ? <p className="mt-1.5 text-[15px] text-ink">You broke even.</p>
              : <p className="mt-1.5 text-[15px] text-ink">Nothing owed.</p>}
        </section>
      ) : null}

      {message ? <p className="mt-6 rounded-2xl bg-surface-2 p-3 text-sm text-danger">{message}</p> : null}

      {initializing ? (
        <div className={`${tile} mt-8 p-5 text-[13px] text-ink-2`}>Calculating settlements...</div>
      ) : visible.length ? (
        <section className="mt-8">
          <p className={sectionLabel}>Payouts</p>
          <motion.div className="mt-3 space-y-2.5" layout={!reducedMotion}>
            {visible.map((item) => {
              const method = selected[item.id] ?? "cash";
              const availableHandles = { venmo: Boolean(item.handles.venmo), cashapp: Boolean(item.handles.cashapp), zelle: Boolean(item.handles.zelle) };
              const selectedHandle = method === "cash" ? null : item.handles[method];
              const paymentLink = selectedHandle && method === "venmo"
                ? getVenmoDeepLink(selectedHandle, item.amount / 100, "Poker Night")
                : selectedHandle && method === "cashapp"
                  ? getCashAppLink(selectedHandle, item.amount / 100)
                  : null;

              if (item.isPaid) {
                return (
                  <motion.button
                    aria-label={readOnly ? `${item.toDisplayName} paid` : `Mark payment to ${item.toDisplayName} as unpaid`}
                    className={`${tile} flex w-full items-center gap-3 p-3.5 text-left ${readOnly ? "" : "cursor-pointer active:scale-[0.99]"}`}
                    disabled={readOnly || busy === item.id}
                    key={item.id}
                    layout={!reducedMotion}
                    onClick={() => undoMarkPaid(item)}
                    transition={reducedMotion ? { duration: 0 } : { duration: 0.2 }}
                    type="button"
                  >
                    <PlayerAvatar avatarUrl={item.toAvatarUrl} name={item.toDisplayName} size="sm" />
                    <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{item.toDisplayName}</p>
                    <AmountDisplay amount={item.amount} className="!text-[15px]" size="md" />
                    <span className="grid size-6 place-items-center rounded-full bg-positive/15 text-positive"><Check aria-hidden size={15} /></span>
                    <PaymentMethodIcon method={item.paymentMethod ?? method} size={16} />
                  </motion.button>
                );
              }

              return (
                <motion.article
                  className={`${tile} p-4`}
                  key={item.id}
                  layout={!reducedMotion}
                  transition={reducedMotion ? { duration: 0 } : { duration: 0.2 }}
                >
                  <div className="flex items-center gap-3">
                    <PlayerAvatar avatarUrl={item.toAvatarUrl} name={item.toDisplayName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-ink">{isBanker ? `Pay ${item.toDisplayName}` : `${bankerDisplayName} owes you`}</p>
                      <p className="text-[13px] text-ink-2">Paid in via {label(item.suggestedPaymentMethod)}</p>
                    </div>
                    <AmountDisplay amount={item.amount} size="lg" />
                  </div>
                  {isBanker ? (
                    <>
                      <div className="mt-4"><PaymentMethodSelector availableHandles={availableHandles} onChange={(choice) => { setSelected((current) => ({ ...current, [item.id]: choice })); setEditingHandle(null); }} value={method} /></div>
                      {method !== "cash" && !selectedHandle && editingHandle === item.id ? (
                        <div className="mt-3 flex gap-2">
                          <input autoFocus className="h-12 min-w-0 flex-1 rounded-2xl bg-surface-2 px-3 text-[15px] text-ink placeholder:text-ink-3" onChange={(event) => setHandleValue(event.target.value)} placeholder={method === "zelle" ? "email or phone" : method === "cashapp" ? "cashtag" : "username"} value={handleValue} />
                          <button className="h-12 rounded-full bg-surface-3 px-4 text-[14px] font-semibold text-ink disabled:text-ink-3" disabled={!handleValue.trim() || busy === `handle-${item.id}`} onClick={() => saveHandle(item, method)} type="button">Save</button>
                        </div>
                      ) : null}
                      <div className={`mt-3 grid gap-2 ${method !== "cash" && editingHandle !== item.id ? "grid-cols-2" : "grid-cols-1"}`}>
                        {paymentLink ? (
                          <a className={`${darkPill} min-w-0`} href={paymentLink} rel={method === "cashapp" ? "noreferrer" : undefined} target={method === "cashapp" ? "_blank" : undefined}>Open {label(method)} <ArrowUpRight aria-hidden size={16} /></a>
                        ) : method !== "cash" && editingHandle !== item.id ? (
                          selectedHandle ? (
                            <div className="flex min-h-12 min-w-0 items-center justify-center rounded-full bg-surface-2 px-3 text-center text-[13px] text-ink-2">Send to {selectedHandle}</div>
                          ) : (
                            <div className="grid min-h-12 min-w-0 place-items-center px-2 text-center text-[12px] text-ink-3"><span>No {label(method)} handle · <button className="font-semibold text-ink-2 underline underline-offset-2" onClick={() => { setEditingHandle(item.id); setHandleValue(""); }} type="button">Add handle</button></span></div>
                          )
                        ) : null}
                        <button
                          className={`${goldPill} w-full`}
                          disabled={busy === item.id}
                          onClick={() => markPaid(item)}
                          type="button"
                        >
                          Mark paid
                        </button>
                      </div>
                    </>
                  ) : null}
                </motion.article>
              );
            })}
          </motion.div>
        </section>
      ) : (
        <div className={`${tile} mt-8 p-5 text-[13px] text-ink-2`}>No payments needed — everyone is even.</div>
      )}

      {!readOnly ? (
        <footer className="hairline-t fixed inset-x-0 bottom-0 z-30 bg-bg/78 backdrop-blur-xl">
          <div className="mx-auto flex max-w-md items-center gap-4 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
            <p className="text-[13px] tabular-nums text-ink-2">{paidCount} of {settlements.length} paid</p>
            <button className={`${goldPill} ml-auto flex-1 max-w-[60%]`} disabled={!allPaid || busy === "finish"} onClick={finish} type="button">{busy === "finish" ? "Finishing…" : "Finish"}</button>
          </div>
        </footer>
      ) : null}
    </div>
  );
}

function normalizePaymentMethod(method: string | null): SettlementPaymentMethod | null {
  return method === "venmo" || method === "cashapp" || method === "zelle" || method === "cash"
    ? method
    : null;
}

function getErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Unable to calculate settlements.";
}

function toSettlementViewItem(
  settlement: Settlement,
  playersById: Map<string, SettlementPlayerItem>,
  isSettled: boolean,
): SettlementViewItem {
  const player = playersById.get(settlement.to_member_id);

  return {
    id: settlement.id,
    toMemberId: settlement.to_member_id,
    toDisplayName: player?.displayName ?? "Unknown player",
    toAvatarUrl: player?.avatarUrl ?? null,
    amount: settlement.amount,
    paymentMethod: settlement.payment_method,
    isPaid: isSettled ? true : settlement.is_paid,
    paidAt: settlement.paid_at,
    suggestedPaymentMethod: settlement.payment_method ?? player?.preferredPaymentMethod ?? null,
    handles: player?.handles ?? { venmo: null, cashapp: null, zelle: null },
  };
}
