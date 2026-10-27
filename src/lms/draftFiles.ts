/** 課題のファイル欄(Moodle の下書き置き場)。提出画面の HTML から読み、同じ通信で一覧・追加・削除する */
export type FileArea = {
  itemid: number;
  clientId: string;
  ctxId: number;
  author: string;
  /** 0 以下は上限なし */
  maxbytes: number;
  maxfiles: number;
  license: string;
  repoId: number;
  sesskey: string;
};
export type DraftFile = { filename: string; size: number | null };
export type UploadResult = { ok: true; file: DraftFile } | { ok: false; error: string };

const INIT = "M.form_filemanager.init(";

/** 提出画面のインライン script からファイル欄の設定を読む。無ければ null */
export function readFileArea(doc: Document): FileArea | null {
  const all = [...doc.scripts].map((s) => s.textContent ?? "").join("\n");
  const at = all.indexOf(INIT);
  if (at < 0) return null;
  const init = all.slice(at);
  const num = (re: RegExp): number | null => { const m = re.exec(init); return m ? Number(m[1]) : null; };
  const str = (re: RegExp): string | null => { const m = re.exec(init); if (!m) return null; try { return JSON.parse(`"${m[1]}"`) as string; } catch { return m[1]!; } };
  const itemid = num(/"itemid":"?(\d+)/);
  const clientId = str(/"client_id":"((?:[^"\\]|\\.)*)"/);
  const ctxId = num(/"context":\{[^}]*?"id":"?(\d+)/);
  const sesskey = /"sesskey":"([^"]+)"/.exec(all)?.[1];
  if (itemid === null || clientId === null || ctxId === null || !sesskey) return null;
  const repo = /"id":"?(\d+)"?[^{}]*"type":"upload"|"type":"upload"[^{}]*"id":"?(\d+)"?/.exec(all);
  return {
    itemid, clientId, ctxId, sesskey,
    author: str(/"author":"((?:[^"\\]|\\.)*)"/) ?? "",
    maxbytes: num(/"maxbytes":"?(-?\d+)/) ?? -1,
    maxfiles: num(/"maxfiles":"?(-?\d+)/) ?? -1,
    license: str(/"defaultlicense":"((?:[^"\\]|\\.)*)"/) ?? "allrightsreserved",
    repoId: Number(repo?.[1] ?? repo?.[2] ?? 3),
  };
}

const mb = (n: number): string => (n >= 1048576 ? `${Math.round(n / 104857.6) / 10} MB` : n >= 1024 ? `${Math.round(n / 102.4) / 10} KB` : `${n} バイト`); // 1KB 未満を「0 KB」と出さない
export const formatSize = mb;

/** 画面に出す上限の文字 */
export function limitText(a: FileArea): string {
  return [a.maxbytes > 0 ? `1 つ ${mb(a.maxbytes)} まで` : "", a.maxfiles > 0 ? `${a.maxfiles} 個まで` : ""].filter(Boolean).join("・");
}

async function draftPost(action: string, a: FileArea, extra: Record<string, string>): Promise<Record<string, unknown>> {
  const r = await fetch(`/repository/draftfiles_ajax.php?action=${action}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ sesskey: a.sesskey, client_id: a.clientId, filepath: "/", itemid: String(a.itemid), ...extra }),
  });
  const j = (await r.json()) as Record<string, unknown>;
  if (!r.ok || j.error) throw new Error(String(j.error ?? "通信に失敗しました"));
  return j;
}

export async function listDraft(a: FileArea): Promise<DraftFile[]> {
  const j = await draftPost("list", a, {});
  const list = (Array.isArray(j.list) ? j.list : []) as Record<string, unknown>[];
  return list.filter((f) => typeof f.filename === "string" && f.filename !== ".").map((f) => {
    const s = Number(f.filesize ?? f.size);
    return { filename: f.filename as string, size: Number.isFinite(s) ? s : null };
  });
}

export async function deleteDraft(a: FileArea, filename: string): Promise<void> {
  await draftPost("delete", a, { filename });
}

/** count は今の置き場にあるファイルの数(個数の上限の判定に使う)。上限を超えるものは送らない */
export function uploadDraft(a: FileArea, file: File, onProgress: (pct: number) => void, count = 0): Promise<UploadResult> {
  if (a.maxbytes > 0 && file.size > a.maxbytes) return Promise.resolve({ ok: false, error: `大きすぎます(${mb(file.size)}。1 つ ${mb(a.maxbytes)} まで)` });
  if (a.maxfiles > 0 && count >= a.maxfiles) return Promise.resolve({ ok: false, error: `${a.maxfiles} 個までです` });
  const fd = new FormData();
  fd.append("repo_upload_file", file);
  const set = { sesskey: a.sesskey, repo_id: String(a.repoId), itemid: String(a.itemid), author: a.author, savepath: "/", title: file.name, overwrite: "1", ctx_id: String(a.ctxId), license: a.license, maxbytes: String(a.maxbytes), areamaxbytes: "-1", client_id: a.clientId, env: "filemanager" };
  for (const [k, v] of Object.entries(set)) fd.append(k, v);
  fd.append("accepted_types[]", "*");
  return new Promise((resolve) => {
    const x = new XMLHttpRequest();
    const fail = (error: string) => resolve({ ok: false, error });
    x.open("POST", "/repository/repository_ajax.php?action=upload");
    x.withCredentials = true;
    x.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    x.onerror = () => fail("通信に失敗しました");
    x.onload = () => {
      try {
        const j = JSON.parse(x.responseText) as Record<string, unknown>;
        if (x.status >= 400 || j.error) fail(String(j.error ?? "アップロードできませんでした"));
        else resolve({ ok: true, file: { filename: file.name, size: file.size } });
      } catch { fail("アップロードできませんでした"); }
    };
    x.send(fd);
  });
}
