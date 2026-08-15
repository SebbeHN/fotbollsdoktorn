interface SavingIndicatorProps {
  status: "idle" | "saving" | "saved" | "error";
}

const LABELS: Record<SavingIndicatorProps["status"], string> = {
  idle: "",
  saving: "Sparar...",
  saved: "Sparat",
  error: "Fel vid sparning",
};

const COLORS: Record<SavingIndicatorProps["status"], string> = {
  idle: "text-transparent",
  saving: "text-amber-400",
  saved: "text-emerald-400",
  error: "text-red-400",
};

export function SavingIndicator({ status }: SavingIndicatorProps) {
  if (status === "idle") return null;
  return <span className={`text-xs font-medium ${COLORS[status]}`}>{LABELS[status]}</span>;
}
