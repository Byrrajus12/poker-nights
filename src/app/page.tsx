import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-semibold">Poker Nights</h1>
      <Link href="/login" className="underline">
        Log in
      </Link>
    </div>
  );
}
