import { Progress } from "@/components/starwind/progress";

/** 上の段の下の細い帯。busy の間だけ流れる(領域は常に確保して、出入りで本文が動かないようにする) */
export function TopProgress({ busy }: { busy: boolean }) {
  return (
    <Progress
      aria-label="読み込み中"
      aria-busy={busy}
      aria-hidden={!busy}
      variant="primary"
      className={`pointer-events-none absolute top-(--bar-h) right-0 left-0 z-30 h-[3px] rounded-none bg-transparent transition-opacity [&_[data-slot=progress-indicator]]:w-[35%] [&_[data-slot=progress-indicator]]:animate-[mu-slide_1.1s_ease-in-out_infinite] ${busy ? "opacity-100" : "opacity-0"}`}
    />
  );
}
