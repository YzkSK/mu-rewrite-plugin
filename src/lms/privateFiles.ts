import { ajax } from "./api";
import { listDraft, type DraftFile, type FileArea } from "./draftFiles";

/** 下書きを本物の置き場に保存する。files.php の form は dynamic form で、/user/files.php への POST では保存されない(実機で確認) */
export async function savePrivateFiles(form: HTMLFormElement, itemid: number): Promise<void> {
  const fd = new FormData(form);
  fd.set("files_filemanager", String(itemid));
  const body = new URLSearchParams([...fd].map(([k, v]) => [k, String(v)] as [string, string])).toString();
  const r = await ajax<{ submitted: boolean }>("core_form_dynamic_form", { form: "core_user\\form\\private_files", formdata: body });
  // 入力の誤り(容量超えなど)のときは submitted が false で、form の HTML が返る
  if (!r.submitted) throw new Error("保存できませんでした");
}

export type Tree = Record<string, DraftFile[]>;

const KINDS: Record<string, string> = {
  pdf: "PDF", doc: "Word", docx: "Word", xls: "Excel", xlsx: "Excel", ppt: "PowerPoint", pptx: "PowerPoint",
  png: "画像", jpg: "画像", jpeg: "画像", gif: "画像", webp: "画像", svg: "画像", zip: "圧縮", txt: "テキスト", csv: "CSV",
  mp4: "動画", mov: "動画", mp3: "音声", wav: "音声",
};

/** 種類のタグの文字。拡張子から */
export function fileKind(name: string, folder = false): string {
  if (folder) return "フォルダ";
  const ext = /\.([^.]+)$/.exec(name)?.[1]?.toLowerCase();
  return ext ? KINDS[ext] ?? ext.toUpperCase() : "ファイル";
}

/** "/a/b/" → "/a/"。"/a/" → "/" */
export const parentOf = (p: string): string => p.replace(/[^/]+\/$/, "") || "/";

/** パンくず(ルートを除く)。"/a/b/" → [a, b] */
export function crumbs(p: string): { name: string; path: string }[] {
  const names = p.split("/").filter(Boolean);
  return names.map((name, i) => ({ name, path: `/${names.slice(0, i + 1).join("/")}/` }));
}

/** 全フォルダの一覧(容量の合計を出すため、下まで辿る) */
export async function listTree(a: FileArea): Promise<Tree> {
  const out: Tree = {};
  const walk = async (p: string): Promise<void> => {
    const l = await listDraft(a, p);
    out[p] = l;
    for (const f of l) if (f.folder && f.filepath && !(f.filepath in out)) await walk(f.filepath);
  };
  await walk("/");
  return out;
}

export const usedBytes = (t: Tree): number => Object.values(t).flat().reduce((n, f) => n + (f.folder ? 0 : f.size ?? 0), 0);

export const fileCount = (t: Tree): number => Object.values(t).flat().filter((f) => !f.folder).length;

const p2 = (n: number): string => String(n).padStart(2, "0");
export function formatTime(ms: number | null | undefined): string {
  if (ms == null) return "";
  const d = new Date(ms);
  return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${p2(d.getHours())}:${p2(d.getMinutes())}`;
}
