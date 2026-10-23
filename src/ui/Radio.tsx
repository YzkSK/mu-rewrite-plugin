type Props = { label: string; name: string; checked: boolean; onChange: () => void; disabled?: boolean };

/** 素の radio にラベルを付けただけの薄い部品 */
export function Radio({ label, name, checked, onChange, disabled }: Props) {
  return (
    <label className="flex items-center gap-1 text-sm">
      <input type="radio" name={name} checked={checked} disabled={disabled} onChange={onChange} />
      {label}
    </label>
  );
}
