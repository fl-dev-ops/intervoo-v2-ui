import { redirect } from "next/navigation";

export default function PrediagnosticsSessionPage() {
  // Prediagnostics is temporarily skipped; send users straight to diagnostics.
  redirect("/diagnostics");
}
