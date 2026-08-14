function formatDollarAmount(amount: number): string {
  return amount.toFixed(2);
}

function getVenmoQuery(handle: string, amount: number, note?: string): string {
  const noteParam = note ? `&note=${encodeURIComponent(note)}` : "";

  return `recipients=${encodeURIComponent(handle.trim())}&amount=${formatDollarAmount(amount)}${noteParam}`;
}

export function getVenmoDeepLink(
  handle: string,
  amount: number,
  note?: string,
): string {
  return `venmo://paycharge?txn=pay&${getVenmoQuery(handle, amount, note)}`;
}

export function getVenmoWebLink(
  handle: string,
  amount: number,
  note?: string,
): string {
  return `https://venmo.com/pay?${getVenmoQuery(handle, amount, note)}`;
}

export function getVenmoAccountWebLink(
  handle: string,
  amount: number,
  note?: string,
): string {
  return `https://account.venmo.com/pay?${getVenmoQuery(handle, amount, note)}`;
}

function getCashAppPath(handle: string, amount: number): string {
  const cashtag = handle.trim().replace(/^\$/, "");

  return `$${encodeURIComponent(cashtag)}/${formatDollarAmount(amount)}`;
}

export function getCashAppLink(handle: string, amount: number): string {
  return `https://cash.app/${getCashAppPath(handle, amount)}`;
}

export function getCashAppDeepLink(handle: string, amount: number): string {
  return `cashapp://cash.app/${getCashAppPath(handle, amount)}`;
}

export function generatePaymentLink(
  method: "venmo" | "cashapp" | "zelle" | "cash",
  recipientHandle: string | null,
  amountInCents: number,
): string | null {
  const handle = recipientHandle?.trim();

  if (!handle) {
    return null;
  }

  const dollars = amountInCents / 100;

  if (method === "venmo") {
    return getVenmoDeepLink(handle, dollars, "Poker Night");
  }

  if (method === "cashapp") {
    return getCashAppLink(handle, dollars);
  }

  return null;
}
