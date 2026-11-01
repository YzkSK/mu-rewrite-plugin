import { afterEach, expect, test } from "bun:test";
import { deleteDirDraft, deleteDraft, downloadDirDraft, limitText, listDraft, mkdirDraft, readFileArea, toDraftFiles, updateDirDraft, updateFileDraft, uploadDraft, type FileArea } from "./draftFiles";

const realFetch = globalThis.fetch;
const realXhr = globalThis.XMLHttpRequest;
afterEach(() => { globalThis.fetch = realFetch; globalThis.XMLHttpRequest = realXhr; });

const area: FileArea = { itemid: 88, clientId: "c1", ctxId: 66161, author: "山田 太郎", maxbytes: 100, maxfiles: 2, license: "allrightsreserved", repoId: 3, sesskey: "sk" };

test("readFileArea: 実機の形のインライン script から読む / 無ければ null", () => {
  document.body.innerHTML = `<script>var x={"repositories":[{"id":"1","type":"recent"},{"id":"3","type":"upload"}],"sesskey":"abc"};</script>
  <script>M.form_filemanager.init(Y, {"itemid":88,"client_id":"69f1","maxbytes":"52428800","maxfiles":"20","context":{"id":66161,"x":1},"author":"山田 \\"太郎\\"","defaultlicense":"allrightsreserved"});</script>`;
  expect(readFileArea(document)).toEqual({ itemid: 88, clientId: "69f1", ctxId: 66161, author: '山田 "太郎"', maxbytes: 52428800, maxfiles: 20, license: "allrightsreserved", repoId: 3, sesskey: "abc" });
  document.body.innerHTML = "<script>var a=1</script>";
  expect(readFileArea(document)).toBeNull();
});

test("readFileArea: 欄の名前を指定すると、その init を読む(target / areamaxbytes)", () => {
  document.body.innerHTML = `<script>var x={"sesskey":"abc","repositories":[{"id":"3","type":"upload"}]};
  M.form_filemanager.init(Y, {"itemid":1,"client_id":"d","maxbytes":"-1","maxfiles":"-1","target":"id_description_editor","context":{"id":9}});
  M.form_filemanager.init(Y, {"itemid":2,"client_id":"i","maxbytes":"10485760","areamaxbytes":"10485760","maxfiles":1,"target":"id_imagefile","context":{"id":9}});</script>`;
  expect(readFileArea(document)!.itemid).toBe(1);
  expect(readFileArea(document, "imagefile")).toMatchObject({ itemid: 2, clientId: "i", maxbytes: 10485760, areamaxbytes: 10485760, maxfiles: 1 });
  expect(readFileArea(document, "nothing")).toBeNull();
});

test("readFileArea: target の後ろのランダムな文字列(実機の files.php)", () => {
  document.body.innerHTML = `<script>var x={"sesskey":"abc"};
  M.form_filemanager.init(Y, {"itemid":3,"client_id":"f","maxbytes":"10485760","target":"id_files_filemanager_Okvue5UR3toNn6O","context":{"id":9}});</script>`;
  expect(readFileArea(document, "files_filemanager")!.itemid).toBe(3);
  expect(readFileArea(document, "files")).toBeNull();
});

test("toDraftFiles: フォルダ(filename \".\")・ファイル・自分自身を除く", () => {
  const list = [
    { filename: ".", filepath: "/mu-test/", fullname: "mu-test", type: "folder", datemodified: 100 },
    { filename: "a.pdf", filepath: "/", size: 2048, filesize: "2KB", datemodified: 200, type: "file", url: "https://x/a.pdf" },
    { filename: ".", filepath: "/", type: "folder" },
  ];
  expect(toDraftFiles(list, "/")).toEqual([
    { filename: "mu-test", size: null, folder: true, filepath: "/mu-test/", time: 100000 },
    { filename: "a.pdf", size: 2048, filepath: "/", time: 200000, url: "https://x/a.pdf" },
  ]);
});

test("フォルダの操作の本文", async () => {
  const calls: { url: string; body: string }[] = [];
  globalThis.fetch = (async (u: string, init: RequestInit) => { calls.push({ url: u, body: String(init.body) }); return Response.json({ fileurl: "https://x/z.zip" }); }) as unknown as typeof fetch;
  await mkdirDraft(area, "d", "/");
  await updateDirDraft(area, "/a/", "b", "/");
  await updateFileDraft(area, "/", "x", "/a/", "x");
  await deleteDirDraft(area, "/a/");
  expect(await downloadDirDraft(area, "/a/")).toBe("https://x/z.zip");
  const q = (i: number) => Object.fromEntries(new URLSearchParams(calls[i]!.body));
  expect(calls.map((c) => c.url.split("=")[1])).toEqual(["mkdir", "updatedir", "updatefile", "delete", "downloaddir"]);
  expect(q(0)).toMatchObject({ newdirname: "d", filepath: "/" });
  expect(q(1)).toMatchObject({ filepath: "/a/", newdirname: "b", newfilepath: "/" });
  expect(q(2)).toMatchObject({ filepath: "/", filename: "x", newfilepath: "/a/", newfilename: "x" });
  expect(q(3)).toMatchObject({ filepath: "/a/", filename: "." });
  expect(q(4).filepath).toBe("/a/");
});

test("limitText", () => {
  expect(limitText({ ...area, maxbytes: 52428800, maxfiles: 20 })).toBe("1 つ 50 MB まで・20 個まで");
});

test("listDraft / deleteDraft の本文", async () => {
  const calls: { url: string; body: string }[] = [];
  globalThis.fetch = (async (u: string, init: RequestInit) => {
    calls.push({ url: u, body: String(init.body) });
    return Response.json(u.includes("list") ? { list: [{ filename: "a.pdf", filesize: 2048 }, { filename: "b.txt", size: "5" }] } : { filepath: "/" });
  }) as unknown as typeof fetch;
  expect(await listDraft(area)).toEqual([{ filename: "a.pdf", size: 2048 }, { filename: "b.txt", size: 5 }]);
  await deleteDraft(area, "a.pdf");
  expect(calls[0]!.url).toBe("/repository/draftfiles_ajax.php?action=list");
  expect(calls[0]!.body).toBe("sesskey=sk&client_id=c1&filepath=%2F&itemid=88");
  expect(calls[1]!.url).toBe("/repository/draftfiles_ajax.php?action=delete");
  expect(calls[1]!.body).toContain("filename=a.pdf");
});

test("deleteDraft: error 応答は例外", async () => {
  globalThis.fetch = (async () => Response.json({ error: "だめ" })) as unknown as typeof fetch;
  await expect(deleteDraft(area, "a")).rejects.toThrow("だめ");
});

class FakeXhr {
  static last: FakeXhr;
  upload: { onprogress?: (e: unknown) => void } = {};
  onload = () => {}; onerror = () => {};
  status = 200; responseText = "";
  method = ""; url = ""; body: FormData | null = null; withCredentials = false;
  constructor() { FakeXhr.last = this; }
  open(m: string, u: string) { this.method = m; this.url = u; }
  send(b: FormData) { this.body = b; }
}

test("uploadDraft: FormData の中身・進み具合・成功", async () => {
  globalThis.XMLHttpRequest = FakeXhr as unknown as typeof XMLHttpRequest;
  const pcts: number[] = [];
  const p = uploadDraft(area, new File(["hello"], "a.txt"), (n) => pcts.push(n));
  const x = FakeXhr.last;
  expect(x.url).toBe("/repository/repository_ajax.php?action=upload");
  x.upload.onprogress!({ lengthComputable: true, loaded: 1, total: 4 });
  x.responseText = JSON.stringify({ url: "u", id: 1, file: "a.txt" });
  x.onload();
  expect(await p).toEqual({ ok: true, file: { filename: "a.txt", size: 5 } });
  expect(pcts).toEqual([25]);
  const b = x.body!;
  expect((b.get("repo_upload_file") as File).name).toBe("a.txt");
  expect(Object.fromEntries([...b.entries()].filter(([, v]) => typeof v === "string"))).toEqual({
    sesskey: "sk", repo_id: "3", itemid: "88", author: "山田 太郎", savepath: "/", title: "a.txt", overwrite: "1", ctx_id: "66161",
    license: "allrightsreserved", maxbytes: "100", areamaxbytes: "-1", client_id: "c1", env: "filemanager", "accepted_types[]": "*",
  });
});

test("uploadDraft: error 応答は失敗", async () => {
  globalThis.XMLHttpRequest = FakeXhr as unknown as typeof XMLHttpRequest;
  const p = uploadDraft(area, new File(["x"], "a.txt"), () => {});
  FakeXhr.last.responseText = JSON.stringify({ error: "拡張子が違います", errorcode: "e" });
  FakeXhr.last.onload();
  expect(await p).toEqual({ ok: false, error: "拡張子が違います" });
});

test("uploadDraft: 大きさ・個数の上限超えは送らない", async () => {
  globalThis.XMLHttpRequest = FakeXhr as unknown as typeof XMLHttpRequest;
  FakeXhr.last = undefined as never;
  const big = await uploadDraft(area, new File(["x".repeat(101)], "big"), () => {});
  const many = await uploadDraft(area, new File(["x"], "c"), () => {}, 2);
  expect(big.ok).toBe(false);
  expect(many).toEqual({ ok: false, error: "2 個までです" });
  expect(FakeXhr.last).toBeUndefined();
});
