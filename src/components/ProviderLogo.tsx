import type { ProviderType } from "@/lib/types";

const LOGOS: Record<ProviderType, { bg: string; text: string; label: string }> = {
  cloudflare: { bg: "bg-orange-500", text: "CF", label: "Cloudflare" },
};

export function ProviderLogo({ type, size = "sm" }: { type: ProviderType; size?: "sm" | "md" }) {
  const logo = LOGOS[type] ?? { bg: "bg-slate-400", text: "?", label: type };
  const dim = size === "md" ? "h-7 w-7 text-[10px]" : "h-5 w-5 text-[8px]";
  return (
    <span
      title={logo.label}
      className={`inline-flex ${dim} items-center justify-center rounded font-bold uppercase text-white ${logo.bg}`}
    >
      {logo.text}
    </span>
  );
}
