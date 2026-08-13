"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Check, ChevronLeft, ExternalLink } from "lucide-react";
import { generatePaymentLink } from "@/lib/payment-links";
import { createClient } from "@/lib/supabase/client";
import { AmountDisplay } from "@/components/ui/amount-display";
import { FeltCard } from "@/components/ui/felt-card";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCents, formatDuration, formatSessionDate } from "@/lib/utils";
import type { SettlementPaymentMethod } from "@/types";

export type SettlementViewItem = { id: string; toMemberId: string; toDisplayName: string; amount: number; paymentMethod: SettlementPaymentMethod | null; isPaid: boolean; paidAt: string | null; suggestedPaymentMethod: SettlementPaymentMethod | null; preferredPaymentHandle: string | null };
export type PlayerResultItem = { memberId: string; displayName: string; buyinTotal: number; cashoutTotal: number; net: number };
type Props = { groupId: string; sessionId: string; settlements: SettlementViewItem[]; bankerDisplayName: string; currentMemberId: string | null; isBanker: boolean; isSettled: boolean; startedAt: string; endedAt: string | null; playerResults: PlayerResultItem[] };
const methods: SettlementPaymentMethod[] = ["venmo", "cashapp", "zelle", "cash"];
const label = (method: SettlementPaymentMethod | null) => !method ? "manual" : method === "cashapp" ? "Cash App" : method.charAt(0).toUpperCase() + method.slice(1);

const goldPill = "h-12 rounded-full bg-accent text-accent-ink text-[15px] font-semibold active:scale-[0.98] transition disabled:bg-surface-2 disabled:text-ink-3";
const ghostPill = "flex h-12 items-center justify-center gap-2 rounded-full bg-surface-2 text-[15px] font-semibold text-ink active:scale-[0.98] transition";
const sectionLabel = "text-[11px] font-semibold uppercase tracking-[0.10em] text-ink-3";
const tile = "rounded-3xl bg-surface";

export function SettlementView({ groupId, sessionId, settlements: initial, bankerDisplayName, currentMemberId, isBanker, isSettled, startedAt, endedAt, playerResults }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const reducedMotion = useReducedMotion();
  const [settlements, setSettlements] = useState(initial);
  const [selected, setSelected] = useState<Record<string, SettlementPaymentMethod>>(() => Object.fromEntries(initial.map((item) => [item.id, item.paymentMethod ?? item.suggestedPaymentMethod ?? "cash"])));
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const readOnly = !isBanker || isSettled;
  const visible = isBanker ? settlements : settlements.filter((item) => item.toMemberId === currentMemberId);
  const paidCount = settlements.filter((item) => item.isPaid).length;
  const allPaid = paidCount === settlements.length;
  const sortedResults = [...playerResults].sort((a, b) => b.net - a.net);
  const totalPot = playerResults.reduce((sum, item) => sum + item.buyinTotal, 0);
  const myResult = playerResults.find((item) => item.memberId === currentMemberId);
  const myPayout = visible.reduce((sum, item) => sum + item.amount, 0);

  async function markPaid(item: SettlementViewItem) {
    const method = selected[item.id] ?? "cash";
    const paidAt = new Date().toISOString();
    setSettlements((current) => current.map((row) => row.id === item.id ? { ...row, isPaid: true, paymentMethod: method, paidAt } : row));
    setBusy(item.id); setMessage("");
    const { error } = await supabase.from("settlements").update({ is_paid: true, paid_at: paidAt, payment_method: method }).eq("id", item.id);
    setBusy(null);
    if (error) { setSettlements((current) => current.map((row) => row.id === item.id ? item : row)); setMessage(error.message); }
  }

  async function finish() {
    setBusy("finish");
    const { error } = await supabase.from("sessions").update({ status: "settled" }).eq("id", sessionId);
    setBusy(null); if (error) { setMessage(error.message); return; }
    router.push(`/groups/${groupId}`); router.refresh();
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
                <PlayerAvatar name={player.displayName} ring={isPodium} size="sm" />
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

      {visible.length ? (
        <section className="mt-8">
          <p className={sectionLabel}>Payouts</p>
          <motion.div className="mt-3 space-y-2.5" layout={!reducedMotion}>
            {visible.map((item) => {
              const method = selected[item.id] ?? "cash";
              const paymentLink = generatePaymentLink(method, item.preferredPaymentHandle, item.amount);

              if (item.isPaid) {
                return (
                  <motion.div
                    className={`${tile} flex items-center gap-3 p-3.5 opacity-55`}
                    key={item.id}
                    layout={!reducedMotion}
                    transition={reducedMotion ? { duration: 0 } : { duration: 0.2 }}
                  >
                    <PlayerAvatar name={item.toDisplayName} size="sm" />
                    <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{item.toDisplayName}</p>
                    <span className="flex items-center gap-1.5 text-[13px] font-medium text-positive">
                      <Check aria-hidden size={15} />
                      Paid {formatCents(item.amount)}
                    </span>
                  </motion.div>
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
                    <PlayerAvatar name={item.toDisplayName} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[15px] font-semibold text-ink">{isBanker ? `Pay ${item.toDisplayName}` : `${bankerDisplayName} owes you`}</p>
                      <p className="text-[13px] text-ink-2">Paid in via {label(item.suggestedPaymentMethod)}</p>
                    </div>
                    <AmountDisplay amount={item.amount} size="lg" />
                  </div>
                  {isBanker ? (
                    <>
                      <div className="mt-4 flex h-10 rounded-xl bg-surface-2 p-1">
                        {methods.map((choice) => (
                          <button className={`flex-1 rounded-lg text-[13px] font-semibold transition ${method === choice ? "bg-surface-3 text-ink" : "text-ink-2"}`} key={choice} onClick={() => setSelected((current) => ({ ...current, [item.id]: choice }))} type="button">{label(choice)}</button>
                        ))}
                      </div>
                      <div className="mt-3 flex gap-2">
                        {paymentLink
                          ? <a className={`${ghostPill} flex-1`} href={paymentLink} rel="noreferrer" target="_blank">Open {label(method)}<ExternalLink aria-hidden size={16} /></a>
                          : <div className="flex h-12 flex-1 items-center justify-center rounded-full bg-surface-2 px-3 text-[13px] text-ink-2">{item.preferredPaymentHandle ? item.preferredPaymentHandle : "Pay manually"}</div>}
                        <button className={`${goldPill} flex-1`} disabled={busy === item.id} onClick={() => markPaid(item)} type="button">Mark paid</button>
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
