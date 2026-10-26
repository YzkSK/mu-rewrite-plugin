import { useId } from "react";
import { Checkbox as StarwindCheckbox } from "@/components/starwind/checkbox";

type Props = { label: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean };

/** Starwind の Checkbox(主の色・小さめ)。ラベルを押しても切り替わるよう id を付ける */
export function Checkbox({ label, checked, onChange, disabled }: Props) {
  const id = useId();
  return <StarwindCheckbox id={id} label={label} size="sm" variant="primary" checked={checked} disabled={disabled} onCheckedChange={(c) => onChange(c)} />;
}
