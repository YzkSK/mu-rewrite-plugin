// 表示の大きさ。値は src/muscat/shell/zoom.ts の ZOOMS と揃える
const KEY = "mu-zoom";
chrome.storage.sync.get(KEY).then((r) => {
  const v = String(r[KEY] ?? 100);
  const el = document.querySelector(`input[name=zoom][value="${v}"]`) ?? document.querySelector('input[name=zoom][value="100"]');
  el.checked = true;
});
document.getElementById("zoom").addEventListener("change", (e) => {
  chrome.storage.sync.set({ [KEY]: Number(e.target.value) });
});

document.getElementById("version").textContent = `v${chrome.runtime.getManifest().version}`;

// 更新。background の確認が終わってから、保存された新版の有無で表示する
const update = document.getElementById("update");
async function showUpdate() {
  const u = (await chrome.storage.local.get("mu-update"))["mu-update"];
  update.textContent = `v${chrome.runtime.getManifest().version} / `;
  if (!u) return update.append("最新です");
  const a = document.createElement("a");
  a.href = u.url;
  a.target = "_blank";
  a.textContent = `新しい版 v${u.version} をダウンロード`;
  update.append(a, "。展開して今のフォルダに上書きし、chrome://extensions で再読み込みしてください");
}
showUpdate();
chrome.runtime.sendMessage({ type: "mu-check-update" }).then(showUpdate, () => {});
