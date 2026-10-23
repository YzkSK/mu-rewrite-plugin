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
export function GenericControl({ control: c, run, bare }: { control: GControl; run: Run; bare?: boolean }) {
  const [text, setText] = useLocal(c.kind === "text" || c.kind === "textarea" || c.kind === "select" ? c.value : "");
  const [checked, setChecked] = useLocal(c.kind === "checkbox" || c.kind === "radio" ? c.checked : false);
  const commit = (value: string) => value !== (c as { value: string }).value && run([{ kind: "set", ref: c.ref, value }]);
  const field = (node: React.ReactNode) =>
    bare || !("label" in c) || !c.label ? node : (
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-xs text-muted-foreground">{c.label}</span>
        {node}
      </label>
    );
  switch (c.kind) {
    case "text":
    case "textarea":
      return field(<TextInput label={c.label} value={text} multiline={c.kind === "textarea"} disabled={c.disabled} onChange={setText} onCommit={() => commit(text)} />);
    case "select":
      return field(
        <Select
          label={c.label}
          value={text}
          options={c.options}
          disabled={c.disabled}
          onChange={(v) => {
            setText(v);
            commit(v);
          }}
        />,
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
      return (
        <Button disabled={c.disabled} onClick={() => run([{ kind: "click", ref: c.ref }])}>
          {c.label || "実行"}
        </Button>
      );
  }
}
