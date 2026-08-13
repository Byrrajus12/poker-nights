export function generatePaymentLink(
  method: "venmo" | "cashapp" | "zelle" | "cash",
  recipientHandle: string | null,
  amountInCents: number,
): string | null {
  const handle = recipientHandle?.trim();

  if (!handle) {
    return null;
  }

  const dollars = (amountInCents / 100).toFixed(2);

  if (method === "venmo") {
    return `venmo://paycharge?txn=pay&recipients=${encodeURIComponent(
      handle,
    )}&amount=${dollars}&note=Poker%20Night`;
  }

  if (method === "cashapp") {
    return `https://cash.app/$${encodeURIComponent(handle.replace(/^\$/, ""))}/${dollars}`;
  }

  return null;
}
