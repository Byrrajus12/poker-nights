"use client";

type FeltCardProps = {
  variant?: "live" | "cooled" | "unlit";
  className?: string;
  children: React.ReactNode;
};

export function FeltCard({ variant = "live", className = "", children }: FeltCardProps) {
  if (variant === "unlit") {
    return <div className={`bg-surface rounded-3xl ${className}`}>{children}</div>;
  }

  return (
    <div
      className={`relative overflow-hidden rounded-3xl bg-felt ${className}`}
      style={{
        boxShadow:
          "inset 0 1px 0 oklch(1 0 0 / 0.12), 0 24px 80px -24px oklch(0.5 0.12 170 / 0.4)",
      }}
    >
      <div className="felt-blobs" data-cooled={variant === "cooled"} aria-hidden="true">
        <div className="felt-blob felt-blob-1" />
        <div className="felt-blob felt-blob-2" />
        <div className="felt-blob felt-blob-3" />
      </div>
      <div className="relative z-[1]">{children}</div>
    </div>
  );
}
