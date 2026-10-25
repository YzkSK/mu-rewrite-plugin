import { useId } from "react";
import { RadioGroup as StarwindRadioGroup, RadioGroupItem } from "@/components/starwind/radio-group";

type Props = { label: string; options: { value: string; label: string }[]; value: string; onChange: (value: string) => void; disabled?: boolean };

/** Starwind の RadioGroup(横並び・小さめ・主の色)。選択肢の文字を押しても選べるよう id を付ける */
export function RadioGroup({ label, options, value, onChange, disabled }: Props) {
  const id = useId();
  return (
    <StarwindRadioGroup legend={label} orientation="horizontal" size="sm" value={value} disabled={disabled} onValueChange={(v) => onChange(String(v))}>
      {options.map((o, i) => (
        <label key={o.value} htmlFor={`${id}-${i}`} className="flex cursor-pointer items-center gap-1.5 text-sm">
          <RadioGroupItem id={`${id}-${i}`} value={o.value} variant="primary" />
          {o.label}
        </label>
      ))}
    </StarwindRadioGroup>
  );
}
