import { redirect } from "next/navigation";

export default async function DiagnosticsRoundCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id: sessionId } = await searchParams;

  if (!sessionId) {
    redirect("/jobs");
  }

  redirect(`/sessions/completed?session_id=${sessionId}`);
}
