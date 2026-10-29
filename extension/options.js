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

// ストアから入れると manifest に update_url が付く。channel.txt はリリースの zip にだけ入る
const manifest = chrome.runtime.getManifest();
const versionEl = document.getElementById("version");
versionEl.textContent = `v${manifest.version}`; // 種類が分からなくても版は先に出す
const channel = "update_url" in manifest ? Promise.resolve("ストア版") : fetch("channel.txt").then((r) => (r.ok ? "GitHub 版" : "開発版"), () => "開発版");
channel.then((c) => {
  versionEl.textContent = `v${manifest.version}(${c})`;
  if (c !== "GitHub 版") return;
  document.getElementById("update-section").hidden = false;
  showUpdate();
  chrome.runtime.sendMessage({ type: "mu-check-update" }).then(showUpdate, () => {});
});

// 更新(GitHub 版だけ)。background の確認が終わってから、保存された新版の有無で表示する
const update = document.getElementById("update");
async function showUpdate() {
  const u = (await chrome.storage.local.get("mu-update"))["mu-update"];
  update.textContent = `v${manifest.version} / `;
  if (!u) return update.append("最新です");
  const a = document.createElement("a");
  a.href = u.url;
  a.target = "_blank";
  a.textContent = `新しい版 v${u.version} をダウンロード`;
  update.append(a, "。展開して今のフォルダに上書きし、chrome://extensions で再読み込みしてください");
}
