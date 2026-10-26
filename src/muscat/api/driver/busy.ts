/** 操作の結果。仮想の操作は、通信を送れば "done"、何も送らなければ "none"(timeout は使わない) */
export type WaitResult = "done" | "none" | "timeout";
