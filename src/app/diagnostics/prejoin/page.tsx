import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { CustomPreJoin } from "@/components/prediagnostics/custom-prejoin";
import { auth } from "@/lib/auth";
import { getRoundConfig } from "@/lib/diagnostics/rounds-config";

export default async function DiagnosticsPrejoinPage({
  searchParams,
}: {
  searchParams: Promise<{ round?: string }>;
}) {
  const { round: roundId } = await searchParams;

  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (!roundId || !getRoundConfig(roundId)) {
    redirect("/diagnostics/rounds");
  }

  return <CustomPreJoin flow="diagnostics" roundId={roundId} type="video" />;
}
