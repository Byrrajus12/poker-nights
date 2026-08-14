"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check, Plus, Undo2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { FeltCard } from "@/components/ui/felt-card";
import { ChipButton } from "@/components/ui/chip-button";
import { PlayerAvatar } from "@/components/ui/player-avatar";
import { AmountDisplay } from "@/components/ui/amount-display";
import { BottomSheet } from "@/components/ui/bottom-sheet";
import { PotDisplay } from "@/components/ui/pot-display";
import { PaymentMethodSelector } from "@/components/ui/payment-method-selector";
import { formatCents, formatDuration } from "@/lib/utils";
import type { Group, GroupMember, Session, SettlementPaymentMethod, Transaction } from "@/types";
import type { SessionPlayerWithMember } from "./page";

type Props = { session: Session; group: Group; players: SessionPlayerWithMember[]; groupMembers: GroupMember[]; initialTransactions: Transaction[]; currentUserId: string | null; isBanker: boolean };
type BuyinPaymentMethod = SettlementPaymentMethod;
type Summary = { buyins: number; cashouts: number; hasCashedOut: boolean; transactions: Transaction[]; method: SettlementPaymentMethod | null };
const methods: BuyinPaymentMethod[] = ["venmo", "cashapp", "zelle", "cash"];
const methodLabel = (method: SettlementPaymentMethod) => method === "cashapp" ? "Cash App" : method.charAt(0).toUpperCase() + method.slice(1);

const primaryButton = "h-14 rounded-full bg-accent text-accent-ink text-[17px] font-semibold active:scale-[0.98] transition disabled:bg-surface-2 disabled:text-ink-3";
const secondaryButton = "h-14 rounded-full bg-surface-2 text-ink text-[17px] font-semibold active:scale-[0.98] transition disabled:text-ink-3";
const statLabel = "text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-3";
const sectionLabel = "text-[11px] font-semibold uppercase tracking-[0.10em] text-ink-3";
const tile = "rounded-3xl bg-surface";
const moneyInput = "rounded-2xl bg-surface-2 text-right tabular-nums text-[17px] font-semibold text-ink focus:ring-2 focus:ring-white/15 outline-none";

function cents(value: string) {
  const clean = value.trim().replace(/^\$/, "");
  if (!/^\d+(\.\d{0,2})?$/.test(clean)) return null;
  const [dollars, fraction = ""] = clean.split(".");
  return Number(dollars) * 100 + Number(fraction.padEnd(2, "0"));
}

export function ActiveSession({ session, group, players: initialPlayers, groupMembers: initialMembers, initialTransactions, currentUserId, isBanker }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const reducedMotion = useReducedMotion();
  const [players, setPlayers] = useState(initialPlayers);
  const [members, setMembers] = useState(initialMembers);
  const [transactions, setTransactions] = useState(initialTransactions);
  const [elapsed, setElapsed] = useState(() => formatDuration(session.started_at));
  const [customTarget, setCustomTarget] = useState<SessionPlayerWithMember | null>(null);
  const [detailTarget, setDetailTarget] = useState<SessionPlayerWithMember | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [cashoutMode, setCashoutMode] = useState(false);
  const [customAmount, setCustomAmount] = useState("");
  const [selectedMethod, setSelectedMethod] = useState<BuyinPaymentMethod | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<Record<string, BuyinPaymentMethod | null>>(() => {
    const latest: Record<string, BuyinPaymentMethod | null> = Object.fromEntries(initialPlayers.map((player) => [player.member_id, null]));
    initialTransactions.forEach((transaction) => {
      if (transaction.type === "buyin" && methods.includes(transaction.payment_method as BuyinPaymentMethod)) {
        latest[transaction.member_id] = transaction.payment_method as BuyinPaymentMethod;
      }
    });
    return latest;
  });
  const [cashouts, setCashouts] = useState<Record<string, string>>({});
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [pressedChips, setPressedChips] = useState<Set<string>>(new Set());
  const [undoArmed, setUndoArmed] = useState<string | null>(null);
  const [heroCollapsed, setHeroCollapsed] = useState(false);
  const undoTimer = useRef<number | null>(null);
  const tempIdCounter = useRef(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const cashoutSubmitting = useRef(false);
  const canManage = isBanker && session.status === "active" && Boolean(currentUserId);

  useEffect(() => {
    const timer = window.setInterval(() => setElapsed(formatDuration(session.started_at)), 60000);
    return () => window.clearInterval(timer);
  }, [session.started_at]);

  useEffect(() => () => { if (undoTimer.current) window.clearTimeout(undoTimer.current); }, []);

  useEffect(() => {
    if (cashoutMode) return;
    const el = sentinelRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setHeroCollapsed(!entry.isIntersecting), { rootMargin: "-56px 0px 0px 0px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [cashoutMode]);

  const disarmUndo = useCallback(() => {
    if (undoTimer.current) { window.clearTimeout(undoTimer.current); undoTimer.current = null; }
    setUndoArmed(null);
  }, []);

  const summaries = useMemo(() => {
    const map = new Map<string, Summary>();
    players.forEach((player) => map.set(player.member_id, { buyins: 0, cashouts: 0, hasCashedOut: false, transactions: [], method: null }));
    transactions.forEach((transaction) => {
      const summary = map.get(transaction.member_id); if (!summary) return;
      summary.transactions.push(transaction);
      if (transaction.type === "buyin") { summary.buyins += transaction.amount; if (transaction.payment_method) summary.method = transaction.payment_method; }
      else { summary.cashouts += transaction.amount; summary.hasCashedOut = true; }
    });
    return map;
  }, [players, transactions]);
  const totalBuyins = [...summaries.values()].reduce((sum, item) => sum + item.buyins, 0);
  const enteredCashouts = players.reduce((sum, player) => sum + (cents(cashouts[player.member_id] ?? "") ?? 0), 0);
  const remaining = totalBuyins - enteredCashouts;
  const seated = new Set(players.map((player) => player.member_id));
  const available = members.filter((member) => !seated.has(member.id));

  const detailTransactions = detailTarget ? summaries.get(detailTarget.member_id)?.transactions ?? [] : [];
  const lastTransaction = detailTransactions[detailTransactions.length - 1];
  const undoIsArmed = Boolean(lastTransaction && undoArmed === lastTransaction.id);

  const openCustom = useCallback((player: SessionPlayerWithMember) => {
    setSelectedMethod(paymentMethods[player.member_id] ?? null); setCustomAmount(""); setCustomTarget(player);
  }, [paymentMethods]);

  async function addBuyin(player: SessionPlayerWithMember, amount: number, method = paymentMethods[player.member_id] ?? null) {
    if (!currentUserId || busy) return;
    tempIdCounter.current += 1;
    const tempId = `temp-${tempIdCounter.current}`;
    const optimistic: Transaction = { id: tempId, session_id: session.id, member_id: player.member_id, type: "buyin", amount, created_by: currentUserId, created_at: session.started_at, payment_method: method };
    setMessage(""); setTransactions((current) => [...current, optimistic]); setBusy(`buyin-${player.member_id}`);
    const { data, error } = await supabase.from("transactions").insert({ session_id: session.id, member_id: player.member_id, type: "buyin", amount, created_by: currentUserId, payment_method: method }).select("id,session_id,member_id,type,amount,created_by,created_at,payment_method").single();
    setBusy(null);
    if (error) { setTransactions((current) => current.filter((item) => item.id !== tempId)); setMessage(error.message); return; }
    setTransactions((current) => current.map((item) => item.id === tempId ? data : item));
    setPaymentMethods((current) => ({ ...current, [player.member_id]: method }));
  }

  function handlePresetTap(player: SessionPlayerWithMember, amount: number) {
    const key = `${player.member_id}-${amount}`;
    setPressedChips((current) => new Set(current).add(key));
    window.setTimeout(() => setPressedChips((current) => { const next = new Set(current); next.delete(key); return next; }), 450);
    void addBuyin(player, amount);
  }

  async function addCustomBuyin() {
    if (!customTarget) return;
    const amount = cents(customAmount);
    if (!amount || amount <= 0) { setMessage("Enter a valid amount greater than $0."); return; }
    await addBuyin(customTarget, amount, selectedMethod); setCustomTarget(null);
  }

  async function undoLast() {
    if (!detailTarget) return;
    const history = summaries.get(detailTarget.member_id)?.transactions ?? [];
    const last = history[history.length - 1]; if (!last || last.id.startsWith("temp-")) return;
    if (undoArmed !== last.id) {
      if (undoTimer.current) window.clearTimeout(undoTimer.current);
      setUndoArmed(last.id);
      undoTimer.current = window.setTimeout(() => { undoTimer.current = null; setUndoArmed(null); }, 3000);
      return;
    }
    disarmUndo();
    setBusy(`undo-${last.id}`);
    const { error } = await supabase.from("transactions").delete().eq("id", last.id);
    setBusy(null); if (error) setMessage(error.message); else setTransactions((current) => current.filter((item) => item.id !== last.id));
  }

  async function addExisting(member: GroupMember) {
    setBusy(`player-${member.id}`);
    const { data, error } = await supabase.from("session_players").insert({ session_id: session.id, member_id: member.id }).select("id,session_id,member_id,joined_at").single();
    setBusy(null); if (error) { setMessage(error.message); return; }
    setPlayers((current) => [...current, { ...data, member: { id: member.id, display_name: member.display_name } }]); setAddOpen(false);
  }

  async function addNew(event: FormEvent) {
    event.preventDefault(); const name = newName.trim(); if (!name) return;
    setBusy("new-player");
    const { data: member, error } = await supabase.from("group_members").insert({ group_id: group.id, display_name: name }).select("id,group_id,user_id,display_name,role,is_claimed,venmo_handle,cashapp_handle,zelle_handle,created_at").single();
    if (error) { setBusy(null); setMessage(error.message); return; }
    setMembers((current) => [...current, member]); setNewName(""); await addExisting(member);
  }

  function startCashout() {
    setCashouts(Object.fromEntries(players.map((player) => [player.member_id, summaries.get(player.member_id)?.hasCashedOut ? String((summaries.get(player.member_id)?.cashouts ?? 0) / 100) : ""]))); setCashoutMode(true); setConfirmEnd(false); setMessage("");
  }

  async function confirmCashouts(force = false) {
    if (!currentUserId || cashoutSubmitting.current) return;
    if (remaining !== 0 && !force) { setConfirmEnd(true); return; }
    const rows = players.flatMap((player) => {
      const amount = cents(cashouts[player.member_id] ?? "") ?? 0;
      return amount > 0 && !summaries.get(player.member_id)?.hasCashedOut ? [{ session_id: session.id, member_id: player.member_id, type: "cashout" as const, amount, created_by: currentUserId, payment_method: null }] : [];
    });
    cashoutSubmitting.current = true;
    setBusy("cashout"); setMessage("");

    try {
      if (rows.length) {
        const { error: cashoutError } = await supabase.from("transactions").insert(rows);
        if (cashoutError) { setMessage(cashoutError.message); return; }
      }

      const { error: sessionError } = await supabase
        .from("sessions")
        .update({ ended_at: new Date().toISOString(), status: "settling" })
        .eq("id", session.id);
      if (sessionError) { setMessage(sessionError.message); return; }

      router.push(`/groups/${group.id}/sessions/${session.id}/settle`); router.refresh();
    } finally {
      cashoutSubmitting.current = false;
      setBusy(null);
    }
  }

  const errorBanner = message ? <p className="rounded-2xl bg-surface-2 p-3 text-sm text-danger">{message}</p> : null;

  return (
    <AnimatePresence initial={false} mode="wait">
      {cashoutMode ? (
        <motion.div animate={{ opacity: 1 }} className="pb-40" exit={{ opacity: 0 }} initial={{ opacity: 0 }} key="cashout" transition={{ duration: 0.18, ease: "easeOut" }}>
          <button className="-ml-1 flex h-11 items-center px-1 text-[15px] font-medium text-ink-2" onClick={() => { setCashoutMode(false); setConfirmEnd(false); }} type="button">Cancel</button>

          <FeltCard className="mt-1" variant="cooled">
            <div className="px-[22px] py-[22px] text-center">
              <p className="font-serif-accent text-[17px] text-on-felt-dim">cashing out</p>
              <PotDisplay amount={totalBuyins} className="mt-1 text-on-felt" />
            </div>
          </FeltCard>

          <h1 className="mt-5 text-[28px] font-bold tracking-tight text-ink">Cash out</h1>
          <p className="mt-1 text-[13px] text-ink-2">Enter each player&apos;s final chip count.</p>

          <section className={`${tile} mt-5`}>
            {players.map((player, index) => {
              const summary = summaries.get(player.member_id);
              return (
                <div className={`flex items-center gap-3 p-3.5 ${index > 0 ? "border-t border-line" : ""} ${summary?.hasCashedOut ? "opacity-55" : ""}`} key={player.id}>
                  <PlayerAvatar name={player.member.display_name} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-ink">{player.member.display_name}</p>
                    <p className="text-[13px] tabular-nums text-ink-2">In {formatCents(summary?.buyins ?? 0)}</p>
                  </div>
                  <ChipButton aria-label={`Zero for ${player.member.display_name}`} disabled={summary?.hasCashedOut} onClick={() => { setCashouts((current) => ({ ...current, [player.member_id]: "0" })); setConfirmEnd(false); }}>0</ChipButton>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] text-ink-3">$</span>
                    <input aria-label={`${player.member.display_name} cashout`} className={`${moneyInput} h-12 w-28 pl-7 pr-3`} disabled={summary?.hasCashedOut} inputMode="decimal" onChange={(event) => { setCashouts((current) => ({ ...current, [player.member_id]: event.target.value })); setConfirmEnd(false); }} placeholder="0" value={cashouts[player.member_id] ?? ""} />
                  </div>
                </div>
              );
            })}
          </section>

          {message ? <div className="mt-4">{errorBanner}</div> : null}

          <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/78 backdrop-blur-xl">
            <div className="mx-auto max-w-md px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
              <div className="mb-3 flex items-center justify-between text-[13px] text-ink-2">
                <span className="flex items-center gap-1.5"><span className={statLabel}>Buy-ins</span><AmountDisplay amount={totalBuyins} size="sm" /></span>
                <span className="flex items-center gap-1.5"><span className={statLabel}>Entered</span><AmountDisplay amount={enteredCashouts} size="sm" /></span>
                <span className="flex items-center gap-1.5">
                  <span className={statLabel}>Left</span>
                  <motion.span
                    animate={remaining === 0 && !reducedMotion ? { scale: [1, 1.06, 1] } : undefined}
                    className="flex items-center gap-1 text-[13px] font-semibold tabular-nums"
                    key={remaining === 0 ? "balanced" : "unbalanced"}
                    transition={{ duration: 0.3 }}
                  >
                    {remaining === 0 ? (
                      <>
                        <Check aria-hidden className="text-positive" size={14} />
                        <span className="text-positive">Balanced</span>
                      </>
                    ) : (
                      <AmountDisplay amount={remaining} colored size="sm" />
                    )}
                  </motion.span>
                </span>
              </div>
              {confirmEnd && remaining !== 0 ? (
                <div className="mb-3 rounded-2xl border border-line-2 bg-surface px-3.5 py-3">
                  <p className="text-[13px] text-ink">Cashouts are {formatCents(Math.abs(remaining))} off from buyins. End anyway?</p>
                  <div className="mt-2 flex justify-end gap-2">
                    <button className="h-9 rounded-full px-3 text-[13px] font-semibold text-ink-2" onClick={() => setConfirmEnd(false)} type="button">Go back</button>
                    <button className="h-9 rounded-full bg-danger px-3 text-[13px] font-semibold text-white" onClick={() => void confirmCashouts(true)} type="button">End anyway</button>
                  </div>
                </div>
              ) : null}
              <button className={`${primaryButton} w-full`} disabled={busy === "cashout"} onClick={() => void confirmCashouts()} type="button">{busy === "cashout" ? "Ending…" : "End session"}</button>
            </div>
          </footer>
        </motion.div>
      ) : (
        <motion.div animate={{ opacity: 1 }} className="pb-28" exit={{ opacity: 0 }} initial={{ opacity: 0 }} key="live" transition={{ duration: 0.18, ease: "easeOut" }}>
          <FeltCard variant="live">
            <div className="px-[22px] py-[26px] text-center">
              <p className="font-serif-accent text-[17px] text-on-felt-dim">tonight&apos;s pot</p>
              <PotDisplay amount={totalBuyins} className="mt-1 text-on-felt" />
              <p className="mt-2 text-[13px] tabular-nums text-on-felt-dim">
                {players.length} {players.length === 1 ? "player" : "players"} · {elapsed}
              </p>
            </div>
          </FeltCard>
          <div aria-hidden className="h-px" ref={sentinelRef} />

          <AnimatePresence>
            {heroCollapsed ? (
              <motion.div
                animate={{ opacity: 1 }}
                className="sticky top-14 z-30 -mx-4 flex items-center justify-center border-b border-line bg-bg/78 px-4 py-2.5 backdrop-blur-xl"
                exit={{ opacity: 0 }}
                initial={{ opacity: 0 }}
                transition={{ duration: reducedMotion ? 0 : 0.15 }}
              >
                <AmountDisplay amount={totalBuyins} size="lg" />
              </motion.div>
            ) : null}
          </AnimatePresence>

          <p className="mt-4 text-[13px] text-ink-3">{group.name}</p>
          <p className={`${sectionLabel} mt-4`}>At the table</p>

          {message ? <div className="mt-3">{errorBanner}</div> : null}

          <section className={`${tile} mt-2.5`}>
            {players.map((player, index) => {
              const summary = summaries.get(player.member_id)!;
              const net = summary.cashouts - summary.buyins;
              return (
                <article className={`relative p-3.5 ${index > 0 ? "border-t border-line" : ""} ${summary.hasCashedOut ? "opacity-55" : ""}`} key={player.id}>
                  <div className="flex items-center justify-between gap-1.5">
                    <button className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left" onClick={() => setDetailTarget(player)} type="button">
                      <PlayerAvatar name={player.member.display_name} ring={!summary.hasCashedOut} size="md" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-semibold text-ink">{player.member.display_name}</span>
                        {summary.hasCashedOut
                          ? <span className="mt-0.5 flex items-center gap-1 text-[13px] tabular-nums text-ink-2">Out {formatCents(summary.cashouts)} · <AmountDisplay amount={net} colored showSign size="sm" /></span>
                          : <span className="mt-0.5 block text-[13px] tabular-nums text-ink-2">In {formatCents(summary.buyins)}</span>}
                      </span>
                    </button>
                    {canManage && !summary.hasCashedOut ? (
                      <div className="shrink-0">
                        <PaymentMethodSelector
                          onChange={(method) => setPaymentMethods((current) => ({ ...current, [player.member_id]: method }))}
                          size="sm"
                          value={paymentMethods[player.member_id] ?? null}
                        />
                      </div>
                    ) : null}
                  </div>
                  {canManage && !summary.hasCashedOut ? (
                    <div className="mt-2 flex gap-2">
                      {group.buyin_presets.map((amount) => {
                        const key = `${player.member_id}-${amount}`;
                        return (
                          <ChipButton aria-label={`Add ${formatCents(amount)} for ${player.member.display_name}`} className="flex-1" disabled={Boolean(busy)} key={amount} onClick={() => handlePresetTap(player, amount)} pressed={pressedChips.has(key)}>
                            {formatCents(amount).replace(".00", "")}
                          </ChipButton>
                        );
                      })}
                      <ChipButton aria-label={`Enter custom amount for ${player.member.display_name}`} className="px-3" onClick={() => openCustom(player)}>
                        <span className="flex items-center gap-1"><Plus aria-hidden size={14} /><span className="text-[11px]">Custom</span></span>
                      </ChipButton>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </section>

          {canManage ? (
            <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-bg/78 backdrop-blur-xl">
              <div className="mx-auto flex max-w-md gap-3 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <button className={`${secondaryButton} flex-1`} onClick={() => setAddOpen(true)} type="button">Add player</button>
                <button className={`${primaryButton} flex-[1.6]`} onClick={startCashout} type="button">Cash out</button>
              </div>
            </div>
          ) : (
            <p className="mt-4 text-center text-[13px] text-ink-2">View only. The banker manages this session.</p>
          )}

          <BottomSheet onClose={() => setCustomTarget(null)} open={Boolean(customTarget)} title={customTarget?.member.display_name ?? "Buy-in"}>
            <PaymentMethodSelector onChange={setSelectedMethod} value={selectedMethod} />
            <div className="mt-4 flex gap-2">
              <div className="relative flex-1">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[17px] text-ink-3">$</span>
                <input autoFocus className={`${moneyInput} h-14 w-full pl-9 pr-4 text-[22px]`} inputMode="decimal" onChange={(event) => setCustomAmount(event.target.value)} placeholder="0" value={customAmount} />
              </div>
              <button className={`${primaryButton} w-auto px-6`} onClick={addCustomBuyin} type="button">Add</button>
            </div>
          </BottomSheet>

          <BottomSheet onClose={() => { setDetailTarget(null); disarmUndo(); }} open={Boolean(detailTarget)} title={detailTarget?.member.display_name ?? "Player"}>
            <div className="divide-y divide-line">
              {detailTransactions.map((transaction) => (
                <div className="flex items-center justify-between py-3" key={transaction.id}>
                  <div>
                    <p className="text-[15px] font-medium capitalize text-ink">{transaction.type}</p>
                    <p className="text-[13px] text-ink-2">{new Date(transaction.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}{transaction.payment_method ? ` · ${methodLabel(transaction.payment_method)}` : ""}</p>
                  </div>
                  <AmountDisplay amount={transaction.amount} size="md" />
                </div>
              ))}
            </div>
            {detailTarget && !detailTransactions.length ? <p className="py-3 text-[13px] text-ink-2">No transactions yet.</p> : null}
            {canManage ? (
              <button className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-full bg-surface-2 text-[15px] font-semibold text-danger disabled:opacity-40" disabled={!detailTarget || !detailTransactions.length || Boolean(busy)} onClick={undoLast} type="button">
                <Undo2 aria-hidden size={18} />
                {undoIsArmed && lastTransaction ? `Confirm undo · ${formatCents(lastTransaction.amount)}` : "Undo last"}
              </button>
            ) : null}
          </BottomSheet>

          <BottomSheet onClose={() => setAddOpen(false)} open={addOpen} title="Add player">
            <div className="divide-y divide-line">
              {available.map((member) => (
                <button className="flex h-14 w-full items-center gap-3 text-left" disabled={Boolean(busy)} key={member.id} onClick={() => addExisting(member)} type="button">
                  <PlayerAvatar name={member.display_name} size="sm" />
                  <span className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{member.display_name}</span>
                  <Plus aria-hidden className="text-accent" size={20} />
                </button>
              ))}
            </div>
            {!available.length ? <p className="py-3 text-[13px] text-ink-2">Everyone is already seated.</p> : null}
            <form className="mt-4 flex gap-2 border-t border-line pt-4" onSubmit={addNew}>
              <input className="h-14 min-w-0 flex-1 rounded-2xl bg-surface-2 px-4 text-[17px] text-ink focus:ring-2 focus:ring-white/15 outline-none" onChange={(event) => setNewName(event.target.value)} placeholder="Name" value={newName} />
              <button className={`${secondaryButton} w-auto px-5`} disabled={!newName.trim() || Boolean(busy)}>Add</button>
            </form>
          </BottomSheet>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
