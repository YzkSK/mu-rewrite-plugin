import { NativeSelect, NativeSelectOption } from "@/components/starwind/native-select";

type Props = {
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
  label: string;
};

/** Starwind の NativeSelect(ブラウザの選択欄に枠と ▼ を付けたもの)。白地・高さ 32px・角 4px にそろえる。
 * 上下の余白があると高さに収まらず下の枠が欠けた(py-0)。拡張は明るい配色だけなので、dark の地は打ち消す */
export function Select({ value, options, onChange, disabled, label }: Props) {
  return (
    <NativeSelect
      aria-label={label}
      size="sm"
      className="h-8 min-w-36 cursor-pointer rounded-[4px] bg-card py-0 dark:bg-card max-[767px]:h-10 max-[767px]:min-w-0 max-[767px]:text-base"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((o) => (
        <NativeSelectOption key={o.value} value={o.value}>
          {o.label}
        </NativeSelectOption>
      ))}
    </NativeSelect>
  );
}
