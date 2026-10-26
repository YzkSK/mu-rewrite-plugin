import type { MuscatClient } from "@/muscat/api/client";
import { ErrorCard } from "@/ui/ErrorCard";
import { PageLoading } from "@/ui/PageLoading";
import { GenericSections } from "./GenericSections";
import { useLivePage, type LiveState } from "./useLivePage";

/** 構造が分からない画面を、生きたページを読んで最低限使える形で出す */
export function GenericScreen({ client, initial }: { client: MuscatClient; doc?: Document; initial?: LiveState }) {
  const { status, page, error, run } = useLivePage(client, initial);
  return (
    // 左寄せで、横いっぱいには広げない(入力欄や項目名と値が、離れて見えないように)
    <div className="flex w-full max-w-4xl flex-col gap-3 p-4">
      {status === "error" && <ErrorCard>{error}</ErrorCard>}
      {status === "loading" && <PageLoading />}
      {page && <GenericSections blocks={page.blocks} run={(steps) => void run(steps)} />}
    </div>
  );
}
