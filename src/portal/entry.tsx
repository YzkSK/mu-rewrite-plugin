import { installPreHide, preEpoch, releasePreHide } from "@/muscat/shell/pre";
import { loadTop, type PortalData } from "./data";
import { mountPortal, unmountPortal } from "./host";
import { isTargetPath, isTopPath } from "./route";

const FAIL_SAFE_MS = 20_000;

// document_start で動く。トップページ以外は元のポータルに任せる(他のページは後続の PR)
if (window === window.top && isTargetPath(location.pathname)) {
  type State = "off" | "loading" | "on" | "failed";
  let state: State = "off";
  let token = 0; // 古い非同期処理を無効化する
  let data: PortalData | null = null; // 一度取ったものを使い回す(戻ってきたときの再取得を避ける)

  const cover = () => {
    installPreHide(document);
    const at = preEpoch();
    setTimeout(() => { if (preEpoch() === at) releasePreHide(document); }, FAIL_SAFE_MS); // 失敗しても元の画面を見せる
  };

  // 書体は届くまで文字を描かない設定なので、定義(link の CSS)が届く前だけ待つ(最大 300ms)
  const release = () => {
    const at = preEpoch();
    const link = document.getElementById("mu-react-font") as HTMLLinkElement | null;
    const sheet = !link || link.sheet ? Promise.resolve() : new Promise((r) => { link.addEventListener("load", r, { once: true }); link.addEventListener("error", r, { once: true }); });
    void Promise.race([sheet, new Promise((r) => setTimeout(r, 300))]).then(() => { if (preEpoch() === at) releasePreHide(document); });
  };

  const show = async () => {
    const my = ++token;
    state = "loading";
    cover();
    try {
      data ??= await loadTop();
      if (my !== token) return;
      mountPortal(data);
      state = "on";
      release();
    } catch (e) {
      if (my !== token) return;
      console.error("[mu-portal]", e);
      unmountPortal();
      state = "failed"; // 元のUIのまま。トップページを離れるまで再試行しない
      releasePreHide(document);
    }
  };

  const hide = () => {
    token++;
    unmountPortal();
    state = "off";
    releasePreHide(document);
  };

  // 元のポータルは SPA で、隠れたまま動き続ける。URL が変わったら出し入れする
  const check = () => {
    const top = isTopPath(location.pathname);
    if (top && state === "off") void show();
    else if (!top && state !== "off") hide();
  };

  if (isTopPath(location.pathname)) cover();
  const run = () => {
    check();
    window.addEventListener("popstate", check);
    setInterval(check, 500);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", run, { once: true });
  else run();
}
