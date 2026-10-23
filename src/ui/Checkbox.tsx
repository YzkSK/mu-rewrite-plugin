type Props = { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean };

/** 素の checkbox にラベルを付けただけの薄い部品 */
export function Checkbox({ label, checked, onChange, disabled }: Props) {
  return (
    <label className="flex items-center gap-1 text-sm">
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
