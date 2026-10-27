import { shortName } from "./api";

export type ProfilePage = { name: string; /** 「メールアドレス」「国」「タイムゾーン」だけ */ items: { label: string; value: string }[] };

const squash = (s: string | null | undefined): string => (s ?? "").replace(/\s+/g, " ").trim();
const WANT = /^(メールアドレス|国|タイムゾーン)$/;

/** 今開いているプロファイルのページから、名前(<title> の「: パブリックプロファイル」より前)と dt/dd を読む */
export function readProfile(doc: Document): ProfilePage {
  const name = shortName(doc.title.replace(/\s*\|\s*MU-LMS\s*$/, "").split(/\s*[:：]\s*パブリックプロファイル/)[0] ?? "");
  const items: ProfilePage["items"] = [];
  for (const dt of doc.querySelectorAll("#region-main dt")) {
    const label = squash(dt.textContent);
    const value = squash(dt.nextElementSibling?.tagName === "DD" ? dt.nextElementSibling.textContent : "");
    if (WANT.test(label) && value && !items.some((i) => i.label === label)) items.push({ label, value });
  }
  return { name, items };
}
