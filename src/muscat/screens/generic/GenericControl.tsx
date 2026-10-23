import { useEffect, useState } from "react";
import type { DriveStep } from "@/muscat/api/driver/drive";
import type { GControl } from "@/muscat/api/types";
import { Button } from "@/ui/Button";
import { Checkbox } from "@/ui/Checkbox";
import { Radio } from "@/ui/Radio";
import { Select } from "@/ui/Select";
import { TextInput } from "@/ui/TextInput";

export type Run = (steps: DriveStep[]) => void;

/** 画面の値を持ち、読み直しで元の値が変わったら追う(入力中の表示を、通信の待ちで巻き戻さない) */
function useLocal<T>(source: T) {
  const [v, setV] = useState(source);
  useEffect(() => setV(source), [source]);
  return [v, setV] as const;
}

/**
 * 元の画面と同じ動き: select / checkbox / radio は変えたらすぐ、text は入力を終えたとき(change)に、
 * 元の部品へ値を入れる。button は click。
 */
export function GenericControl({ control: c, run }: { control: GControl; run: Run }) {
  const [text, setText] = useLocal(c.kind === "text" || c.kind === "textarea" || c.kind === "select" ? c.value : "");
  const [checked, setChecked] = useLocal(c.kind === "checkbox" || c.kind === "radio" ? c.checked : false);
  const commit = (value: string) => value !== (c as { value: string }).value && run([{ kind: "set", ref: c.ref, value }]);
  // 項目名は隣の文字(line の text / fields の label)が出すので、ここでは aria-label だけ
  switch (c.kind) {
    case "text":
    case "textarea":
      return <TextInput label={c.label} value={text} multiline={c.kind === "textarea"} disabled={c.disabled} onChange={setText} onCommit={() => commit(text)} />;
    case "select":
      return (
        <Select
          label={c.label}
          value={text}
          options={c.options}
          disabled={c.disabled}
          onChange={(v) => {
            setText(v);
            commit(v);
          }}
        />
      );
    case "checkbox":
      return (
        <Checkbox
          label={c.label}
          checked={checked}
          disabled={c.disabled}
          onChange={(v) => {
            setChecked(v);
            run([{ kind: "check", ref: c.ref, checked: v }]);
          }}
        />
      );
    case "radio":
      return (
        <Radio
          label={c.label}
          name={c.name}
          checked={checked}
          disabled={c.disabled}
          onChange={() => {
            setChecked(true);
            run([{ kind: "check", ref: c.ref, checked: true }]);
          }}
        />
      );
    case "button":
      return c.as === "link" ? (
        <button type="button" disabled={c.disabled} onClick={() => run([{ kind: "click", ref: c.ref }])} className="cursor-pointer text-left text-sm text-primary underline disabled:cursor-default disabled:opacity-50">
          {c.label}
        </button>
      ) : (
        <Button variant="ghost" disabled={c.disabled} onClick={() => run([{ kind: "click", ref: c.ref }])}>
          {c.label}
        </Button>
      );
  }
}
