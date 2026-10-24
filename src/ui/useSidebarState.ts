import { useEffect, useState } from "react";

const KEY = "mu-m-drawer";
const NARROW = "(max-width: 767.98px)";

const read = () => {
  try { return localStorage.getItem(KEY); } catch { return null; }
};
const write = (v: string) => {
  try { localStorage.setItem(KEY, v); } catch { /* 保存できなくても動く */ }
};
const isNarrow = () => typeof matchMedia === "function" && matchMedia(NARROW).matches;

/** 幅で狭い画面かを判定し、開閉を持つ。広い画面の開閉だけ保存し、狭い画面は閉じて始める。 */
export function useSidebarState() {
  const [narrow, setNarrow] = useState(isNarrow);
  const [open, setOpen] = useState(() => !isNarrow() && read() !== "closed");

  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const mq = matchMedia(NARROW);
    const on = () => {
      setNarrow(mq.matches);
      setOpen(!mq.matches && read() !== "closed");
    };
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);

  const change = (o: boolean) => {
    setOpen(o);
    if (!narrow) write(o ? "open" : "closed");
  };
  return { narrow, open, change };
}
