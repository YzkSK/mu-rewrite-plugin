import { expect, test } from "bun:test";
import { splitBarTitle } from "./RoomDialog";

test("splitBarTitle: 予約は時刻・予約番号・予約者・利用目的に分ける(名前の中は全角空白)", () => {
  expect(splitBarTitle("00:00～24:00 予約番号：7762 TOEIC試験 堀　美紀")).toEqual({
    time: "00:00〜24:00",
    fields: [{ label: "予約番号", value: "7762" }, { label: "予約者", value: "堀　美紀" }, { label: "利用目的", value: "TOEIC試験" }],
  });
});

test("splitBarTitle: 授業は時刻・時限・授業コード・授業・教員に分ける", () => {
  expect(splitBarTitle("13:10～14:50 月3 0010040201 英語基礎C [Ma-1] 榊原　かをり")).toEqual({
    time: "13:10〜14:50",
    fields: [{ label: "時限", value: "月3" }, { label: "授業コード", value: "0010040201" }, { label: "授業", value: "英語基礎C [Ma-1]" }, { label: "教員", value: "榊原　かをり" }],
  });
});

test("splitBarTitle: 形が違えば時刻以外をそのまま内容にする", () => {
  expect(splitBarTitle("TOEIC試験")).toEqual({ time: "", fields: [{ label: "内容", value: "TOEIC試験" }] });
});
