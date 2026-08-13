type PlayerAvatarProps = {
  name: string;
  size?: "sm" | "md" | "lg";
  ring?: boolean;
  className?: string;
};

const sizes = {
  sm: "h-8 w-8 text-xs font-semibold",
  md: "h-10 w-10 text-sm font-semibold",
  lg: "h-14 w-14 text-lg font-semibold",
};

function hueFromName(name: string) {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export function PlayerAvatar({ name, size = "md", ring = false, className = "" }: PlayerAvatarProps) {
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const hue = hueFromName(name);

  const avatar = (
    <span
      aria-label={name}
      className={`inline-flex shrink-0 items-center justify-center rounded-[35%] border border-white/10 ${sizes[size]} ${ring ? "" : className}`}
      style={{
        background: `linear-gradient(180deg, oklch(0.35 0.06 ${hue}), oklch(0.28 0.05 ${hue}))`,
        color: `oklch(0.90 0.03 ${hue})`,
      }}
      title={name}
    >
      {initial}
    </span>
  );

  if (!ring) return avatar;

  return (
    <span className={`presence-ring relative inline-flex shrink-0 ${className}`} data-ring-size={size}>
      {avatar}
    </span>
  );
}
