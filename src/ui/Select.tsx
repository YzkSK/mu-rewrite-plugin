type Props = {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
};

/** 素の <select> を包んだだけの薄い部品 */
export function Select({ value, options, onChange, disabled, label }: Props) {
  return (
    <select
      aria-label={label}
      className="rounded-md border border-input bg-background px-2 py-1 text-sm"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
