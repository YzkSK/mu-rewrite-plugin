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
