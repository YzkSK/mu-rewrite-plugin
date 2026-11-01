/** 課題のファイル欄(Moodle の下書き置き場)。提出画面の HTML から読み、同じ通信で一覧・追加・削除する */
export type FileArea = {
  itemid: number;
  clientId: string;
  ctxId: number;
  author: string;
  /** 0 以下は上限なし */
  maxbytes: number;
  maxfiles: number;
  /** 置き場全体の上限(init にあるときだけ)。0 以下は上限なし */
  areamaxbytes?: number;
  license: string;
  repoId: number;
  sesskey: string;
};
/** folder のとき filename はフォルダ名、filepath はそのフォルダ自身("/a/")。ファイルの filepath は置いてあるフォルダ */
export type DraftFile = { filename: string; size: number | null; folder?: boolean; filepath?: string; /** 更新日時(ミリ秒) */ time?: number | null; url?: string };
export type UploadResult = { ok: true; file: DraftFile } | { ok: false; error: string };

const INIT = "M.form_filemanager.init(";

/** インライン script からファイル欄の設定を読む。欄が複数あるときは name(form の要素名)のものを選ぶ(無指定は最初)。無ければ null */
export function readFileArea(doc: Document, name?: string): FileArea | null {
  const all = [...doc.scripts].map((s) => s.textContent ?? "").join("\n");
  const inits = all.split(INIT).slice(1);
  // 欄の見分けは target("id_<名前>"。後ろに "_<ランダム>" が付く版がある)。elementname がある版もある
  const target = new RegExp(`"target":"id_${name}(?:_[A-Za-z0-9]+)?"`);
  const init = name === undefined ? inits[0] : inits.find((s) => target.test(s) || s.includes(`"elementname":"${name}"`));
  if (init === undefined) return null;
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
    ...(num(/"areamaxbytes":"?(-?\d+)/) === null ? {} : { areamaxbytes: num(/"areamaxbytes":"?(-?\d+)/)! }),
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

export async function draftPost(action: string, a: FileArea, extra: Record<string, string>): Promise<Record<string, unknown>> {
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

/** list の応答の list を DraftFile にする。フォルダは filename "." で filepath がそのフォルダ(fullname が名前)。dir 自身は除く */
export function toDraftFiles(list: Record<string, unknown>[], dir = "/"): DraftFile[] {
  const out: DraftFile[] = [];
  for (const f of list) {
    if (typeof f.filename !== "string") continue;
    const s = Number(f.filesize ?? f.size);
    const t = Number(f.datemodified);
    const extra = { ...(typeof f.filepath === "string" ? { filepath: f.filepath } : {}), ...(Number.isFinite(t) && f.datemodified != null ? { time: t * 1000 } : {}), ...(typeof f.url === "string" ? { url: f.url } : {}) };
    if (f.type === "folder" || f.filename === ".") {
      const path = typeof f.filepath === "string" ? f.filepath : "";
      if (!path || path === "/" || path === dir) continue;
      const name = typeof f.fullname === "string" && f.fullname ? f.fullname : path.split("/").filter(Boolean).pop() ?? "";
      out.push({ ...extra, filename: name, size: null, folder: true });
    } else out.push({ ...extra, filename: f.filename, size: Number.isFinite(s) ? s : null });
  }
  return out;
}

export async function listDraft(a: FileArea, filepath = "/"): Promise<DraftFile[]> {
  const j = await draftPost("list", a, { filepath });
  return toDraftFiles((Array.isArray(j.list) ? j.list : []) as Record<string, unknown>[], filepath);
}

export async function deleteDraft(a: FileArea, filename: string, filepath = "/"): Promise<void> {
  await draftPost("delete", a, { filename, filepath });
}

export async function mkdirDraft(a: FileArea, newdirname: string, filepath = "/"): Promise<void> {
  await draftPost("mkdir", a, { newdirname, filepath });
}

/** ファイルの名前変更・移動 */
export async function updateFileDraft(a: FileArea, filepath: string, filename: string, newfilepath: string, newfilename: string): Promise<void> {
  await draftPost("updatefile", a, { filepath, filename, newfilepath, newfilename });
}

/** フォルダの名前変更・移動(filepath はそのフォルダ自身、newfilepath は新しい親。どちらも必須) */
export async function updateDirDraft(a: FileArea, filepath: string, newdirname: string, newfilepath: string): Promise<void> {
  await draftPost("updatedir", a, { filepath, newdirname, newfilepath });
}

/** フォルダを消す(filename は "." にする) */
export const deleteDirDraft = (a: FileArea, filepath: string): Promise<void> => deleteDraft(a, ".", filepath);

/** filepath 以下を zip にして、その URL を返す */
export async function downloadDirDraft(a: FileArea, filepath = "/"): Promise<string> {
  const j = await draftPost("downloaddir", a, { filepath });
  if (typeof j.fileurl !== "string") throw new Error("ダウンロードの用意ができませんでした");
  return j.fileurl;
}

/** count は今の置き場にあるファイルの数(個数の上限の判定に使う)。上限を超えるものは送らない */
export function uploadDraft(a: FileArea, file: File, onProgress: (pct: number) => void, count = 0, savepath = "/"): Promise<UploadResult> {
  if (a.maxbytes > 0 && file.size > a.maxbytes) return Promise.resolve({ ok: false, error: `大きすぎます(${mb(file.size)}。1 つ ${mb(a.maxbytes)} まで)` });
  if (a.maxfiles > 0 && count >= a.maxfiles) return Promise.resolve({ ok: false, error: `${a.maxfiles} 個までです` });
  const fd = new FormData();
  fd.append("repo_upload_file", file);
  const set = { sesskey: a.sesskey, repo_id: String(a.repoId), itemid: String(a.itemid), author: a.author, savepath, title: file.name, overwrite: "1", ctx_id: String(a.ctxId), license: a.license, maxbytes: String(a.maxbytes), areamaxbytes: String(a.areamaxbytes ?? -1), client_id: a.clientId, env: "filemanager" };
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
