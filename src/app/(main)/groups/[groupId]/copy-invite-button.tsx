"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function CopyInviteButton({ inviteCode }: { inviteCode: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <button
      aria-label="Copy invite code"
      className="inline-flex h-8 items-center gap-1.5 rounded-full bg-surface-2 px-3 text-[13px] font-semibold text-ink-2 tabular-nums"
      onClick={handleCopy}
      type="button"
    >
      {copied ? (
        <>
          <Check className="text-positive" size={16} />
          <span className="text-positive">Copied</span>
        </>
      ) : (
        <>
          {inviteCode}
          <Copy className="text-ink-2" size={16} />
        </>
      )}
    </button>
  );
}
