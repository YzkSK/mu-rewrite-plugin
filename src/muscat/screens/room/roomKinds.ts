/** 予約の種類(元の画面の zone class)ごとの色。ここに無い種類は灰色 */
const COLORS: Record<string, { bg: string; fg: string }> = {
  jugyo: { bg: "#fbd6ee", fg: "#8a2a6b" },
  hokou: { bg: "#f6b9d9", fg: "#7a1f55" },
  resOther: { bg: "#cfd0f7", fg: "#3d3f9a" },
  preResOther: { bg: "#cfe4fb", fg: "#1f5a99" },
};
export const kindColor = (kind: string) => COLORS[kind] ?? { bg: "#e5e7eb", fg: "#374151" };

/** 分 → "8:00" */
export const hhmm = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;

export const HOUR_PX = 96;
export const NAME_PX = 200;
