// リンクにできる URL。javascript: などは入れない
const HTTP_URL = /^https?:\/\/\S/i;

type LinkValue = { text: string; href: string };

/** リンクの小ウィンドウ。URL の検証を通ったときだけ onApply を呼ぶ */
export function LinkDialog({ value, onChange, onClose, onApply }: { value: LinkValue; onChange: (v: LinkValue) => void; onClose: () => void; onApply: (href: string, text: string) => void }) {
  return (
    <form
      role="dialog"
      aria-label="リンクを付ける"
      className="absolute left-0 top-full z-40 mt-1 flex w-[min(26rem,100%)] flex-col gap-2 rounded-[4px] border border-border bg-card p-3 shadow-md"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
      onSubmit={(e) => {
        e.preventDefault();
        const href = value.href.trim();
        const text = value.text || href;
        if (!HTTP_URL.test(href)) return;
        onApply(href, text);
      }}
    >
      {[["表示する文字", "text", "リンクの文字"], ["URL", "href", "https://"]].map(([label, key, ph]) => (
        <label key={key} className="flex flex-col gap-1 text-[12px] text-muted-foreground">
          {label}
          <input
            autoFocus={key === (value.text ? "href" : "text")}
            type={key === "href" ? "url" : "text"}
            placeholder={ph}
            value={value[key as "text" | "href"]}
            onChange={(e) => onChange({ ...value, [key!]: e.target.value })}
            className="h-8 w-full rounded-[4px] border border-input bg-card px-2.5 py-1 text-sm text-foreground max-[767px]:h-10 max-[767px]:text-[16px]"
          />
        </label>
      ))}
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onClose} className="h-8 rounded-[4px] px-3 text-sm text-muted-foreground hover:bg-muted">やめる</button>
        <button type="submit" disabled={!HTTP_URL.test(value.href.trim())} className="h-8 rounded-[4px] bg-primary px-3 text-sm text-primary-foreground disabled:opacity-50">リンクにする</button>
      </div>
    </form>
  );
}
