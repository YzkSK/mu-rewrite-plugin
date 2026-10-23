type Props = {
  value: string;
  onChange: (value: string) => void;
  /** 入力を終えたとき(フォーカスが外れた / Enter)。元の画面の change に当たる */
  onCommit?: () => void;
  label: string;
  disabled?: boolean;
  multiline?: boolean;
};

const CLASS = "w-full rounded-md border border-input bg-background px-2 py-1 text-sm";

/** 素の input / textarea を包んだだけの薄い部品 */
export function TextInput({ value, onChange, onCommit, label, disabled, multiline }: Props) {
  if (multiline) {
    return <textarea aria-label={label} className={CLASS} rows={3} value={value} disabled={disabled} onChange={(e) => onChange(e.target.value)} onBlur={onCommit} />;
  }
  return (
    <input
      type="text"
      aria-label={label}
      className={CLASS}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => e.key === "Enter" && onCommit?.()}
    />
  );
}
