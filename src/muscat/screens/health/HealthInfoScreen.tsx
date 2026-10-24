import type { MuscatClient } from "@/muscat/api/client";
import { Card } from "@/ui/Card";
import { PageLoading } from "@/ui/PageLoading";
import { InfoSections } from "../info/InfoSections";
import { useInfoPage, type InfoState } from "../info/useInfoPage";

export function HealthInfoScreen({ client, initial }: { client: MuscatClient; initial?: InfoState }) {
  const { status, page, error } = useInfoPage(() => client.getHealthInfo(), initial);
  return (
    <div className="flex flex-col gap-3 p-4">
      {status === "error" && <Card className="p-4 text-error">{error}</Card>}
      {status === "loading" && <PageLoading />}
      {page && <InfoSections page={page} />}
    </div>
  );
}
