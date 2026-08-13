"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { generatePaymentLink } from "@/lib/payment-links";
import { createClient } from "@/lib/supabase/client";
import { formatCents } from "@/lib/utils";
import type { SettlementPaymentMethod } from "@/types";

export type SettlementViewItem = {
  id: string;
  toMemberId: string;
  toDisplayName: string;
  amount: number;
  paymentMethod: SettlementPaymentMethod | null;
  isPaid: boolean;
  paidAt: string | null;
  suggestedPaymentMethod: SettlementPaymentMethod | null;
  preferredPaymentHandle: string | null;
};

type SettlementViewProps = {
  groupId: string;
  sessionId: string;
  settlements: SettlementViewItem[];
  bankerDisplayName: string;
  currentMemberId: string | null;
  isBanker: boolean;
  isSettled: boolean;
};

const paymentMethods: SettlementPaymentMethod[] = ["venmo", "cashapp", "zelle", "cash"];

function formatPaymentMethod(method: SettlementPaymentMethod | null): string {
  if (!method) {
    return "manual payment";
  }

  if (method === "cashapp") {
    return "CashApp";
  }

  return method[0].toUpperCase() + method.slice(1);
}

export function SettlementView({
  groupId,
  sessionId,
  settlements: initialSettlements,
  bankerDisplayName,
  currentMemberId,
  isBanker,
  isSettled,
}: SettlementViewProps) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [settlements, setSettlements] = useState(initialSettlements);
  const [selectedMethods, setSelectedMethods] = useState(() =>
    Object.fromEntries(
      initialSettlements.map((settlement) => [
        settlement.id,
        settlement.paymentMethod ?? settlement.suggestedPaymentMethod ?? "cash",
      ]),
    ) as Record<string, SettlementPaymentMethod>,
  );
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const readOnly = !isBanker || isSettled;
  const visibleSettlements = isBanker
    ? settlements
    : settlements.filter((settlement) => settlement.toMemberId === currentMemberId);
  const paidCount = settlements.filter((settlement) => settlement.isPaid).length;
  const allPaid = paidCount === settlements.length;
  const totalOwed = settlements.reduce((total, settlement) => total + settlement.amount, 0);
  const playerPayout = visibleSettlements.reduce(
    (total, settlement) => total + settlement.amount,
    0,
  );

  async function markAsPaid(settlement: SettlementViewItem) {
    const method = selectedMethods[settlement.id] ?? "cash";
    const paidAt = new Date().toISOString();
    setBusy(settlement.id);
    setMessage(null);

    const { error } = await supabase
      .from("settlements")
      .update({
        is_paid: true,
        paid_at: paidAt,
        payment_method: method,
      })
      .eq("id", settlement.id);

    setBusy(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSettlements((current) =>
      current.map((item) =>
        item.id === settlement.id
          ? {
              ...item,
              isPaid: true,
              paidAt,
              paymentMethod: method,
            }
          : item,
      ),
    );
  }

  async function finishSession() {
    setBusy("finish");
    setMessage(null);

    const { error } = await supabase
      .from("sessions")
      .update({ status: "settled" })
      .eq("id", sessionId);

    setBusy(null);

    if (error) {
      setMessage(error.message);
      return;
    }

    router.push(`/groups/${groupId}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5 pb-28 text-zinc-100">
      <header className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
              Settlement
            </p>
            <h1 className="mt-1 text-3xl font-semibold text-zinc-50">Settle up</h1>
          </div>
          <span
            className={`rounded-md border px-3 py-2 text-sm font-medium ${
              isSettled
                ? "border-emerald-700 bg-emerald-950 text-emerald-200"
                : "border-amber-700 bg-amber-950 text-amber-200"
            }`}
          >
            {isSettled ? "Settled" : "Settling"}
          </span>
        </div>

        <div className="rounded-md border border-zinc-800 bg-zinc-900 p-4">
          {isBanker ? (
            <p className="text-lg font-semibold text-zinc-100">
              You owe {settlements.length} {settlements.length === 1 ? "player" : "players"} a
              total of {formatCents(totalOwed)}.
            </p>
          ) : visibleSettlements.length > 0 ? (
            <p className="text-lg font-semibold text-zinc-100">
              {bankerDisplayName} owes you {formatCents(playerPayout)} via{" "}
              {formatPaymentMethod(visibleSettlements[0]?.paymentMethod)}.
            </p>
          ) : (
            <p className="text-lg font-semibold text-zinc-100">
              No payout is due for this session.
            </p>
          )}
        </div>

        {message ? (
          <div className="rounded-md border border-amber-700 bg-amber-950/70 p-4 text-sm text-amber-100">
            {message}
          </div>
        ) : null}
      </header>

      {visibleSettlements.length > 0 ? (
        <section className="space-y-3">
          {visibleSettlements.map((settlement) => {
            const selectedMethod = selectedMethods[settlement.id] ?? "cash";
            const paymentLink = generatePaymentLink(
              selectedMethod,
              settlement.preferredPaymentHandle,
              settlement.amount,
            );

            return (
              <article
                className={`rounded-md border p-4 ${
                  settlement.isPaid
                    ? "border-emerald-800 bg-emerald-950/50"
                    : "border-zinc-800 bg-zinc-900"
                }`}
                key={settlement.id}
              >
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-lg font-semibold text-zinc-50">
                      {isBanker ? `Pay ${settlement.toDisplayName}` : `${bankerDisplayName} owes you`}
                    </p>
                    <p className="mt-1 text-3xl font-semibold text-zinc-50">
                      {formatCents(settlement.amount)}
                    </p>
                    <p className="mt-2 text-sm text-zinc-400">
                      They paid in via {formatPaymentMethod(settlement.suggestedPaymentMethod)}
                    </p>
                  </div>
                  {settlement.isPaid ? (
                    <span className="rounded-md border border-emerald-700 bg-emerald-900/60 px-3 py-2 text-sm font-medium text-emerald-100">
                      Sent
                    </span>
                  ) : null}
                </div>

                {settlement.isPaid ? null : (
                  <div className="mt-4 space-y-4">
                    {isBanker ? (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                        {paymentMethods.map((method) => (
                          <button
                            className={`min-h-12 rounded-md border px-3 text-sm font-semibold transition ${
                              selectedMethod === method
                                ? "border-zinc-100 bg-zinc-100 text-zinc-950"
                                : "border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-zinc-500"
                            }`}
                            key={method}
                            onClick={() =>
                              setSelectedMethods((current) => ({
                                ...current,
                                [settlement.id]: method,
                              }))
                            }
                            type="button"
                          >
                            {formatPaymentMethod(method)}
                          </button>
                        ))}
                      </div>
                    ) : null}

                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      {paymentLink ? (
                        <a
                          className="flex min-h-12 items-center justify-center rounded-md bg-blue-500 px-5 font-semibold text-white hover:bg-blue-400"
                          href={paymentLink}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Send
                        </a>
                      ) : (
                        <div className="min-h-12 flex-1 rounded-md border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-zinc-300">
                          {settlement.preferredPaymentHandle
                            ? `${formatPaymentMethod(selectedMethod)}: ${
                                settlement.preferredPaymentHandle
                              }`
                            : `${formatPaymentMethod(selectedMethod)}: manual payment`}
                        </div>
                      )}

                      {!readOnly ? (
                        <button
                          className="min-h-12 rounded-md bg-emerald-500 px-5 font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-60"
                          disabled={busy === settlement.id}
                          onClick={() => markAsPaid(settlement)}
                          type="button"
                        >
                          Mark as paid
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </section>
      ) : (
        <div className="rounded-md border border-emerald-800 bg-emerald-950/40 p-5 text-emerald-100">
          No payments needed. Everyone is square.
        </div>
      )}

      <footer className="fixed inset-x-0 bottom-0 border-t border-zinc-800 bg-zinc-950/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-medium text-zinc-200">
            {paidCount} of {settlements.length} payments sent
          </p>
          {!readOnly ? (
            <button
              className="min-h-12 rounded-md bg-zinc-100 px-6 font-semibold text-zinc-950 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!allPaid || busy === "finish"}
              onClick={finishSession}
              type="button"
            >
              Finish
            </button>
          ) : null}
        </div>
      </footer>
    </div>
  );
}
