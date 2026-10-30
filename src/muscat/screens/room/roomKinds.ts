/** 予約の種類(元の画面の zone class)ごとの色。ここに無い種類は灰色 */
// 色とりどりにしない(紫と灰だけ)。仮予約は点線の枠で見分ける
const COLORS: Record<string, { bg: string; fg: string; dashed?: boolean }> = {
  jugyo: { bg: "#e4d9ef", fg: "#3b1260" },
  hokou: { bg: "#541b86", fg: "#ffffff" },
  resOther: { bg: "#dddae1", fg: "#1f1a24" },
  preResOther: { bg: "#ffffff", fg: "#4e4757", dashed: true },
};
export const kindColor = (kind: string) => COLORS[kind] ?? { bg: "#dddae1", fg: "#1f1a24" };

/** 分 → "8:00" */
export const hhmm = (min: number) => `${Math.floor(min / 60)}:${String(min % 60).padStart(2, "0")}`;

export const HOUR_PX = 96;
export const NAME_PX = 200;
/** 狭い画面の教室名の列(収容人数は名前の下の 2 行目) */
export const NAME_PX_NARROW = 64;
