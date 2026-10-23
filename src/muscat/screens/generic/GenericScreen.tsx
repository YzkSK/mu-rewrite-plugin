import type { MuscatClient } from "@/muscat/api/client";
import { Card } from "@/ui/Card";
import { GenericSections } from "./GenericSections";
import { useLivePage, type LiveState } from "./useLivePage";

/** 構造が分からない画面を、生きたページを読んで最低限使える形で出す */
export function GenericScreen({ client, doc, initial }: { client: MuscatClient; doc: Document; initial?: LiveState }) {
  const { status, page, error, run } = useLivePage(client, doc, initial);
  return (
    <div className="flex flex-col gap-3 p-4">
      {status === "error" && <Card className="p-4 text-error">{error}</Card>}
      {status === "loading" && <Card className="p-4">読み込み中…</Card>}
      {page && <GenericSections blocks={page.blocks} run={(steps) => void run(steps)} />}
    </div>
  );
}
