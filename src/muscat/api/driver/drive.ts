import type { Ref } from "./locator";

/** click の ajax: 画面側の目印(通信を待つ必要があるか)。仮想の操作(virtual/vdrive)は要素の onclick / onchange から通信を決めるので使わない */
export type DriveStep =
  | { kind: "set"; ref: Ref; value: string; ajax?: boolean }
  | { kind: "check"; ref: Ref; checked: boolean }
  | { kind: "click"; ref: Ref; ajax?: boolean };
