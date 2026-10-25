import type { MuscatClient } from "@/muscat/api/client";
import { nativeNav } from "@/muscat/shell/nativeNav";
import { Card } from "@/ui/Card";
import { PageLoading } from "@/ui/PageLoading";
import { InfoSections } from "../info/InfoSections";
import { useInfoPage, type InfoState } from "../info/useInfoPage";

/** 学籍情報照会。節が 11 あるので左に目次を置き、健康診断情報照会へも移れる */
export function StudentInfoScreen({ client, doc, initial }: { client: MuscatClient; doc?: Document; initial?: InfoState }) {
  const { status, page, error } = useInfoPage(() => client.getStudentInfo(), initial);
  return (
    <div className="flex flex-col gap-3 p-4">
      {status === "error" && <Card className="p-4 text-error">{error}</Card>}
      {status === "loading" && <PageLoading />}
      {page && <InfoSections page={page} toc link={doc && { label: "健康診断情報照会へ", onSelect: () => void nativeNav(doc, "健康診断情報照会") }} />}
    </div>
  );
}
