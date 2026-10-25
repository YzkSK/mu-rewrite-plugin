type Props = {
  value: string;
  onChange: (value: string) => void;
  /** 入力を終えたとき(フォーカスが外れた / Enter)。元の画面の change に当たる */
  onCommit?: () => void;
  label: string;
  disabled?: boolean;
  multiline?: boolean;
  placeholder?: string;
};

// ほかの欄(選択欄・日付)とそろえて白地・角 4px。1 行の欄は高さ 32px
const CLASS = "w-full rounded-[4px] border border-input bg-card px-2.5 py-1 text-sm";

/** 素の input / textarea を包んだだけの薄い部品 */
export function TextInput({ value, onChange, onCommit, label, disabled, multiline, placeholder }: Props) {
  if (multiline) {
    return <textarea aria-label={label} className={CLASS} rows={3} placeholder={placeholder} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} onBlur={onCommit} />;
  }
  return (
    <input
      type="text"
      aria-label={label}
      className={`${CLASS} h-8`}
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => e.key === "Enter" && onCommit?.()}
    />
  );
}
