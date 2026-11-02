import { useState, type ReactNode } from "react";
import { ErrorNotice } from "@/ui/ErrorNotice";
import { PageLoading } from "@/ui/PageLoading";
import { errText } from "./api";
import { deleteDraft, uploadDraft } from "./draftFiles";
import { FilesTab } from "./FilesTab";
import { Box, Note } from "./parts";
import {
  loadBlockNonContacts, loadEdit, loadForumPrefs, loadNotify, saveBlockNonContacts, saveForm, saveNotify, saveStopAll, splitNotify, textToDescription,
  type EditForm, type ForumPrefs, type NotifyGroup, type NotifyPage, type NotifyRow, type Select, type Tab,
} from "./settings";
import { useLoad } from "./useLoad";

const NAV: { tab: Tab; title: string; href: string }[] = [
  { tab: "profile", title: "プロファイル", href: "/user/edit.php" },
  { tab: "prefs", title: "フォーラム・メッセージ", href: "/user/forum.php" },
  { tab: "notify", title: "通知", href: "/message/notificationpreferences.php" },
  { tab: "files", title: "プライベートファイル", href: "/user/files.php" },
];
const INPUT = "h-9 w-full rounded-[4px] border border-input bg-card px-2.5 text-[13.5px]";
const BTN = "h-9 cursor-pointer rounded-[4px] bg-primary px-5 text-[13.5px] text-primary-foreground hover:opacity-90 disabled:cursor-default disabled:opacity-50";
const BTN2 = "h-9 cursor-pointer rounded-[4px] border border-border bg-card px-4 text-[13.5px] hover:bg-muted disabled:cursor-default disabled:opacity-50";

/** 左に設定の目次、右に中身。800px 未満は目次が上の 1 列 */
export function SettingsScreen({ tab }: { tab: Tab }) {
  return (
    <div className="mx-auto grid w-full max-w-[1000px] items-start gap-4 p-4 min-[800px]:grid-cols-[200px_minmax(0,1fr)]">
      <nav aria-label="設定の目次" className="overflow-hidden rounded-[4px] border border-border bg-card">
        <ul className="m-0 list-none p-0">
          {NAV.map((n) => (
            <li key={n.tab} className="border-b border-border last:border-b-0">
              <a
                href={n.href}
                aria-current={n.tab === tab ? "page" : undefined}
                className={`block px-4 py-2.5 text-[13.5px] ${n.tab === tab ? "bg-sidebar-accent font-bold text-primary" : "text-foreground hover:bg-muted"}`}
              >{n.title}</a>
            </li>
          ))}
        </ul>
      </nav>
      <div className="flex min-w-0 flex-col gap-4">
        {tab === "profile" ? <ProfileTab /> : tab === "prefs" ? <PrefsTab /> : tab === "notify" ? <NotifyTab /> : <FilesTab />}
      </div>
    </div>
  );
}

const Field = ({ label, htmlFor, children, note }: { label: string; htmlFor?: string; children: ReactNode; note?: string }) => (
  <div className="flex flex-col gap-1 border-b border-border px-4 py-3 text-[13.5px] last:border-b-0 min-[600px]:flex-row min-[600px]:gap-3">
    <label htmlFor={htmlFor} className="w-40 flex-none pt-2 text-[13px] text-muted-foreground">{label}</label>
    <div className="flex min-w-0 flex-1 flex-col gap-1">
      {children}
      {note ? <span className="text-[12px] text-muted-foreground">{note}</span> : null}
    </div>
  </div>
);

const Pick = ({ id, s, value, onChange }: { id: string; s: Select; value: string; onChange: (v: string) => void }) => (
  <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={INPUT}>
    {s.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
  </select>
);

// ---- プロファイル ----

function ProfileTab() {
  const e = useLoad(loadEdit, []);
  if (e.failed) return <ErrorNotice title="読み込めませんでした" message="プロファイルを取得できませんでした。" onRetry={e.reload} />;
  if (!e.data) return <PageLoading title="プロファイル" />;
  return <ProfileForm key={e.data.id} data={e.data} onSaved={e.refresh} />;
}

type Image = { name: string; pct: number; error?: string; preview: string };

function ProfileForm({ data, onSaved }: { data: EditForm; onSaved: () => void }) {
  const [maildisplay, setMaildisplay] = useState(data.maildisplay?.value ?? "");
  const [timezone, setTimezone] = useState(data.timezone?.value ?? "");
  const [about, setAbout] = useState(data.about);
  const [others, setOthers] = useState(() => Object.fromEntries(data.others.map((o) => [o.name, o.value])));
  const [image, setImage] = useState<Image | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const area = data.image.area;
  const uploading = image !== null && image.pct < 100 && !image.error;
  const dirty = maildisplay !== (data.maildisplay?.value ?? "") || timezone !== (data.timezone?.value ?? "") || about !== data.about
    || data.others.some((o) => others[o.name] !== o.value) || (image !== null && !image.error) || removeImage;

  const pickImage = (file: File) => {
    if (!area) return;
    const prev = image;
    setRemoveImage(false);
    setDone(false);
    setImage({ name: file.name, pct: 0, preview: URL.createObjectURL(file) });
    // 画像の欄は 1 枚だけ。前に上げたものは外してから上げる
    void (prev && !prev.error ? deleteDraft(area, prev.name).catch(() => {}) : Promise.resolve()).then(() => uploadDraft(area, file, (pct) => setImage((i) => (i ? { ...i, pct: Math.min(pct, 99) } : i))))
      .then((r) => setImage((i) => (i ? (r.ok ? { ...i, pct: 100 } : { ...i, pct: 0, error: r.error }) : i)));
  };

  const reset = () => {
    // 上げた画像は下書きに残り、次の保存で一緒に送られてしまうので消す
    if (area && image && !image.error) void deleteDraft(area, image.name).catch(() => {});
    setMaildisplay(data.maildisplay?.value ?? "");
    setTimezone(data.timezone?.value ?? "");
    setAbout(data.about);
    setOthers(Object.fromEntries(data.others.map((o) => [o.name, o.value])));
    setImage(null);
    setRemoveImage(false);
    setError(null);
    setDone(false);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setDone(false);
    const set: Record<string, string> = {};
    if (data.maildisplay && maildisplay !== data.maildisplay.value) set.maildisplay = maildisplay;
    if (data.timezone && timezone !== data.timezone.value) set.timezone = timezone;
    if (about !== data.about) { set["description_editor[text]"] = textToDescription(about); set["description_editor[format]"] = "1"; }
    for (const o of data.others) if (others[o.name] !== o.value) set[o.name] = others[o.name]!;
    if (image && !image.error && area) set.imagefile = String(area.itemid);
    if (removeImage && data.image.deleteName) set[data.image.deleteName] = "1";
    try {
      await saveForm(data.form, set);
      setDone(true);
      onSaved();
    } catch (e) {
      setError(errText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Box title="プロファイル">
        <dl className="m-0 p-0">
          {data.info.map((i) => (
            <div key={i.label} className="flex gap-3 border-b border-border px-4 py-2.5 text-[13.5px]">
              <dt className="w-40 flex-none text-muted-foreground">{i.label}</dt>
              <dd className="m-0 min-w-0 flex-1 [overflow-wrap:anywhere]">{i.value}</dd>
            </div>
          ))}
        </dl>
        <p className="m-0 border-b border-border px-4 py-2 text-[12px] text-muted-foreground">名前・メール・国は大学の登録から。変えられません</p>
        {data.maildisplay ? <Field label="メールの公開" htmlFor="mu-maildisplay"><Pick id="mu-maildisplay" s={data.maildisplay} value={maildisplay} onChange={setMaildisplay} /></Field> : null}
        {data.timezone ? <Field label="タイムゾーン" htmlFor="mu-timezone"><Pick id="mu-timezone" s={data.timezone} value={timezone} onChange={setTimezone} /></Field> : null}
        <Field label="自己紹介" htmlFor="mu-about">
          <textarea id="mu-about" rows={5} value={about} onChange={(e) => setAbout(e.target.value)} className="w-full rounded-[4px] border border-input bg-card p-2 text-[13.5px]" />
        </Field>
        {area ? (
          <Field label="ユーザ画像" note={image?.error ? undefined : "画像は「保存」を押すと変わります"}>
            <div className="flex flex-wrap items-center gap-3">
              {image && !image.error ? <img src={image.preview} alt="選んだ画像" className="size-16 rounded-[4px] border border-border object-cover" />
                : data.image.url && !removeImage ? <img src={data.image.url} alt="今の画像" className="size-16 rounded-[4px] border border-border object-cover" /> : null}
              <label className={`inline-flex h-9 items-center rounded-[4px] border border-border bg-card px-4 text-[13.5px] ${uploading || saving ? "opacity-50" : "cursor-pointer hover:bg-muted"}`}>
                画像を選ぶ
                <input type="file" accept="image/*" hidden disabled={uploading || saving} onChange={(e) => { const f = e.target.files?.[0]; if (f) pickImage(f); e.target.value = ""; }} />
              </label>
              {data.image.deleteName && !image ? (
                <label className="flex items-center gap-1.5 text-[13px]"><input type="checkbox" className="accent-primary" checked={removeImage} onChange={(e) => setRemoveImage(e.target.checked)} />今の画像を削除する</label>
              ) : null}
              {uploading ? <span className="text-[12.5px] text-muted-foreground">{`上げています ${image!.pct}%`}</span> : null}
            </div>
            {image?.error ? <span className="text-[12.5px] text-error">{image.error}</span> : null}
          </Field>
        ) : null}
        {data.others.length ? (
          <details className="border-t border-border">
            <summary className="cursor-pointer px-4 py-2.5 text-[13.5px] text-primary">そのほかの項目</summary>
            {data.others.map((o) => (
              <Field key={o.name} label={o.label} htmlFor={`mu-${o.name}`}>
                <input id={`mu-${o.name}`} type="text" value={others[o.name] ?? ""} onChange={(e) => setOthers({ ...others, [o.name]: e.target.value })} className={INPUT} />
              </Field>
            ))}
          </details>
        ) : null}
      </Box>
      {error ? <p role="alert" className="m-0 text-[13px] text-error">{error}</p> : null}
      {done ? <p role="status" className="m-0 text-[13px] text-muted-foreground">保存しました</p> : null}
      <div className="flex gap-3">
        <button type="button" className={BTN} disabled={!dirty || saving || uploading} onClick={() => void save()}>{saving ? "保存しています…" : "保存"}</button>
        <button type="button" className={BTN2} disabled={saving || uploading || (!dirty && !error && !done)} onClick={reset}>元に戻す</button>
      </div>
    </>
  );
}

// ---- フォーラム・メッセージ ----

function PrefsTab() {
  return (
    <>
      <ForumBox />
      <MessageBox />
    </>
  );
}

function ForumBox() {
  const f = useLoad(loadForumPrefs, []);
  if (f.failed) return <ErrorNotice title="読み込めませんでした" message="フォーラムの設定を取得できませんでした。" onRetry={f.reload} />;
  if (!f.data) return <PageLoading title="フォーラムの設定" />;
  return <ForumForm data={f.data} />;
}

function ForumForm({ data }: { data: ForumPrefs }) {
  const [v, setV] = useState({ maildigest: data.maildigest?.value ?? "", autosubscribe: data.autosubscribe?.value ?? "" });
  const [saved, setSaved] = useState(v);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const dirty = v.maildigest !== saved.maildigest || v.autosubscribe !== saved.autosubscribe;
  const save = async () => {
    setSaving(true);
    setError(null);
    setDone(false);
    try {
      await saveForm(data.form, { ...(data.maildigest ? { maildigest: v.maildigest } : {}), ...(data.autosubscribe ? { autosubscribe: v.autosubscribe } : {}) });
      setSaved(v);
      setDone(true);
    } catch (e) {
      setError(errText(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <Box title="フォーラム">
      {data.maildigest ? <Field label="メールのまとめ方" htmlFor="mu-maildigest"><Pick id="mu-maildigest" s={data.maildigest} value={v.maildigest} onChange={(x) => setV({ ...v, maildigest: x })} /></Field> : null}
      {data.autosubscribe ? <Field label="投稿したら自動で購読" htmlFor="mu-autosubscribe"><Pick id="mu-autosubscribe" s={data.autosubscribe} value={v.autosubscribe} onChange={(x) => setV({ ...v, autosubscribe: x })} /></Field> : null}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <button type="button" className={BTN} disabled={!dirty || saving} onClick={() => void save()}>{saving ? "保存しています…" : "保存"}</button>
        {error ? <span role="alert" className="text-[13px] text-error">{error}</span> : null}
        {done && !dirty ? <span role="status" className="text-[13px] text-muted-foreground">保存しました</span> : null}
      </div>
    </Box>
  );
}

function MessageBox() {
  const b = useLoad(loadBlockNonContacts, []);
  const [value, setValue] = useState<"0" | "1" | null>(null);
  const [error, setError] = useState<string | null>(null);
  // 保存中は押せなくする(続けて押すと保存の順番が入れ替わり、画面とサーバーの値がずれる)
  const [saving, setSaving] = useState(false);
  if (b.failed) return <ErrorNotice title="読み込めませんでした" message="メッセージの設定を取得できませんでした。" onRetry={b.reload} />;
  if (!b.data) return <PageLoading title="メッセージの設定" />;
  const now = value ?? b.data;
  const pick = (v: "0" | "1") => {
    const prev = now;
    setValue(v);
    setError(null);
    setSaving(true);
    saveBlockNonContacts(v).catch(() => { setValue(prev); setError("保存できませんでした"); }).finally(() => setSaving(false));
  };
  return (
    <Box title="メッセージ">
      {/* legend は fieldset の枠の上に乗ってしまうので、見出しは p にして aria で結ぶ */}
      <div role="radiogroup" aria-labelledby="mu-msg-from" className="flex flex-col gap-2 px-4 py-3">
        <p id="mu-msg-from" className="m-0 mb-1 text-[13px] text-muted-foreground">メッセージを受け取る相手</p>
        {([["1", "コンタクトのみ"], ["0", "コンタクトと同じコースの人"]] as const).map(([k, label]) => (
          <label key={k} className="flex items-center gap-2 text-[13.5px]"><input type="radio" name="mu-blocknoncontacts" className="accent-primary" disabled={saving} checked={now === k} onChange={() => pick(k)} />{label}</label>
        ))}
        {error ? <span role="alert" className="text-[13px] text-error">{error}</span> : null}
      </div>
    </Box>
  );
}

// ---- 通知 ----

const PROCESSOR: Record<string, string> = { stream: "LMS の通知欄", popup: "LMS の通知欄", email: "メール" };

function Switch({ on, label, disabled, onChange }: { on: boolean; label: string; disabled?: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative h-5 w-9 flex-none cursor-pointer rounded-[3px] border disabled:cursor-default disabled:opacity-50 ${on ? "border-primary bg-primary" : "border-border bg-muted"}`}
    ><span className={`absolute top-0.5 size-3.5 rounded-[2px] ${on ? "left-[18px] bg-white" : "left-0.5 bg-muted-foreground"}`} /></button>
  );
}

function NotifyTab() {
  const n = useLoad(loadNotify, []);
  if (n.failed) return <ErrorNotice title="読み込めませんでした" message="通知の設定を取得できませんでした。" onRetry={n.reload} />;
  if (!n.data) return <PageLoading title="通知の設定" />;
  return <NotifyBody page={n.data} />;
}

const STOP = "\0stop-all";

function NotifyBody({ page }: { page: NotifyPage }) {
  const [groups, setGroups] = useState(page.groups);
  const [stop, setStop] = useState(page.stopAll);
  const [error, setError] = useState<string | null>(null);
  // 保存中の行(と「すべて止める」)は押せなくする。続けて押すと保存の順番が入れ替わり、画面とサーバーの値がずれる
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const mark = (key: string, on: boolean) => setPending((p) => { const s = new Set(p); if (on) s.add(key); else s.delete(key); return s; });
  const { shown, hidden } = splitNotify(groups);
  const swap = (key: string, row: NotifyRow) => setGroups((gs) => gs.map((g) => ({ ...g, rows: g.rows.map((r) => (r.key === key ? row : r)) })));

  const toggle = (row: NotifyRow, name: string) => {
    if (pending.has(row.key)) return;
    const next = { ...row, cells: row.cells.map((c) => (c.name === name ? { ...c, on: !c.on } : c)) };
    swap(row.key, next);
    setError(null);
    mark(row.key, true);
    saveNotify(next).catch(() => { swap(row.key, row); setError(`「${row.name}」を保存できませんでした`); }).finally(() => mark(row.key, false));
  };
  const toggleStop = () => {
    if (pending.has(STOP)) return;
    const v = !stop;
    setStop(v);
    setError(null);
    mark(STOP, true);
    saveStopAll(v).catch(() => { setStop(!v); setError("保存できませんでした"); }).finally(() => mark(STOP, false));
  };

  return (
    <>
      <Box title="通知">
        <label className="flex items-center gap-2 px-4 py-3 text-[13.5px]"><input type="checkbox" className="accent-primary" disabled={pending.has(STOP)} checked={stop} onChange={toggleStop} />すべての通知を止める</label>
      </Box>
      {error ? <p role="alert" className="m-0 text-[13px] text-error">{error}</p> : null}
      {shown.length ? <NotifyTable groups={shown} processors={page.processors} pending={pending} onToggle={toggle} /> : <Note>設定できる通知がありません</Note>}
      {hidden.length ? (
        <details className="rounded-[4px] border border-border bg-card">
          <summary className="cursor-pointer px-4 py-2.5 text-sm font-semibold">学生には届かない通知</summary>
          <NotifyTable groups={hidden} processors={page.processors} pending={pending} onToggle={toggle} bare />
        </details>
      ) : null}
    </>
  );
}

function NotifyTable({ groups, processors, pending, onToggle, bare }: { groups: NotifyGroup[]; processors: string[]; pending: ReadonlySet<string>; onToggle: (r: NotifyRow, name: string) => void; bare?: boolean }) {
  const table = (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-[13.5px]">
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="px-4 py-2 text-left text-[12.5px] font-semibold">届くもの</th>
            {processors.map((p) => <th key={p} scope="col" className="w-28 px-2 py-2 text-center text-[12.5px] font-semibold">{PROCESSOR[p] ?? p}</th>)}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => [
            <tr key={`h-${g.name}`}><th colSpan={processors.length + 1} scope="colgroup" className="bg-muted px-4 py-1.5 text-left text-[12.5px] font-semibold">{g.name}</th></tr>,
            ...g.rows.map((r) => (
              <tr key={r.key} className="border-b border-border last:border-b-0">
                <th scope="row" className="px-4 py-2 text-left font-normal">{r.name}</th>
                {processors.map((p) => {
                  const c = r.cells.find((x) => x.name === p);
                  return (
                    <td key={p} className="px-2 py-2 text-center">
                      {!c ? null : c.locked ? <span className="text-[12px] text-muted-foreground">固定</span>
                        : <Switch on={c.on} label={`${r.name}を${PROCESSOR[p] ?? p}で受け取る`} disabled={pending.has(r.key)} onChange={() => onToggle(r, p)} />}
                    </td>
                  );
                })}
              </tr>
            )),
          ])}
        </tbody>
      </table>
    </div>
  );
  return bare ? table : <section className="overflow-hidden rounded-[4px] border border-border bg-card">{table}</section>;
}
