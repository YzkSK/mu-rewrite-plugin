import type { MuscatClient } from "@/muscat/api/client";
import { ErrorCard } from "@/ui/ErrorCard";
import { PageLoading } from "@/ui/PageLoading";
import { useInfoPage, type InfoState } from "../info/useInfoPage";
import { HealthView } from "./HealthView";

export function HealthInfoScreen({ client, initial }: { client: MuscatClient; initial?: InfoState }) {
  const { status, page, error } = useInfoPage(() => client.getHealthInfo(), initial);
  return (
    <div className="flex flex-col gap-3 p-4">
      {status === "error" && <ErrorCard>{error}</ErrorCard>}
      {status === "loading" && <PageLoading />}
      {page && <HealthView page={page} />}
    </div>
  );
}
