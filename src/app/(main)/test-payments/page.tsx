"use client";

import { useMemo, useState } from "react";
import {
  getCashAppDeepLink,
  getCashAppLink,
  getVenmoAccountWebLink,
  getVenmoDeepLink,
  getVenmoWebLink,
} from "@/lib/payment-links";

type LinkOption = {
  label: string;
  url: string;
};

export default function TestPaymentsPage() {
  const [handle, setHandle] = useState("@john");
  const [amount, setAmount] = useState("25.00");
  const [note, setNote] = useState("Poker Night");
  const dollarAmount = Number(amount) || 0;

  const linkGroups = useMemo<{ name: string; links: LinkOption[] }[]>(
    () => [
      {
        name: "Venmo",
        links: [
          {
            label: "Venmo app deep link",
            url: getVenmoDeepLink(handle, dollarAmount, note || undefined),
          },
          {
            label: "venmo.com web link",
            url: getVenmoWebLink(handle, dollarAmount, note || undefined),
          },
          {
            label: "account.venmo.com web link",
            url: getVenmoAccountWebLink(
              handle,
              dollarAmount,
              note || undefined,
            ),
          },
        ],
      },
      {
        name: "Cash App",
        links: [
          {
            label: "cash.app web link",
            url: getCashAppLink(handle, dollarAmount),
          },
          {
            label: "Cash App deep link",
            url: getCashAppDeepLink(handle, dollarAmount),
          },
        ],
      },
    ],
    [dollarAmount, handle, note],
  );

  return (
    <section className="pb-10">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
          Dev tool
        </p>
        <h1 className="mt-1 text-[30px] font-bold tracking-tight text-ink">
          Payment deep links
        </h1>
        <p className="mt-2 text-[14px] leading-6 text-ink-2">
          Try these links on a mobile device with Venmo or Cash App installed.
        </p>
      </header>

      <div className="mt-6 space-y-4 rounded-3xl bg-surface p-5">
        <label className="block">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            Recipient handle
          </span>
          <input
            className="h-12 w-full rounded-2xl bg-surface-2 px-4 text-[16px] text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-white/15"
            onChange={(event) => setHandle(event.target.value)}
            placeholder="@john or $john"
            type="text"
            value={handle}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            Amount (dollars)
          </span>
          <input
            className="h-12 w-full rounded-2xl bg-surface-2 px-4 text-[16px] tabular-nums text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-white/15"
            inputMode="decimal"
            min="0"
            onChange={(event) => setAmount(event.target.value)}
            step="0.01"
            type="number"
            value={amount}
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.1em] text-ink-3">
            Note (optional)
          </span>
          <input
            className="h-12 w-full rounded-2xl bg-surface-2 px-4 text-[16px] text-ink outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-white/15"
            onChange={(event) => setNote(event.target.value)}
            placeholder="Payment description"
            type="text"
            value={note}
          />
        </label>
      </div>

      <div className="mt-8 space-y-8">
        {linkGroups.map((group) => (
          <section key={group.name}>
            <h2 className="text-[18px] font-semibold text-ink">{group.name}</h2>
            <div className="mt-3 space-y-3">
              {group.links.map((link) => (
                <article className="rounded-3xl bg-surface p-4" key={link.label}>
                  <h3 className="text-[14px] font-semibold text-ink">
                    {link.label}
                  </h3>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <a
                      className="flex h-11 items-center justify-center rounded-full bg-accent px-3 text-center text-[13px] font-semibold text-accent-ink transition active:scale-[0.98]"
                      href={link.url}
                    >
                      Open with link
                    </a>
                    <button
                      className="h-11 rounded-full bg-surface-2 px-3 text-[13px] font-semibold text-ink transition active:scale-[0.98]"
                      onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
                      type="button"
                    >
                      window.open()
                    </button>
                  </div>
                  <code className="mt-3 block break-all rounded-2xl bg-bg p-3 text-[11px] leading-5 text-ink-2">
                    {link.url}
                  </code>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
