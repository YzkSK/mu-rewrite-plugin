import type { MuscatClient } from "@/muscat/api/client";
import type { ExportKind, ExportRequest } from "@/muscat/api/exportForm";
import type { MenuLabel } from "@/muscat/api/session";

/** 元のボタンが送る POST を、新しいタブへふつうのフォーム送信で送る(ダウンロードの応答はそのタブが受ける。元の画面の script は使わない) */
export function postToNewTab(req: ExportRequest, doc: Document = document): void {
  const form = doc.createElement("form");
  form.method = "post";
  form.action = req.url;
  form.target = "_blank";
  form.style.display = "none";
  for (const [name, value] of req.fields) {
    const input = doc.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.append(input);
  }
  doc.body.append(form);
  form.submit();
  form.remove();
}

/** 出席・成績の出力。label のメニューを開いて、PDF / Excel のボタンと同じ POST を新しいタブへ送る */
export const exportFile = (client: MuscatClient, label: MenuLabel, text: ExportKind): Promise<void> => client.exportRequest(label, text).then((r) => postToNewTab(r)).catch(() => {});
