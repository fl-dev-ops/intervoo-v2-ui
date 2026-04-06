import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircle } from "lucide-react";

export const Route = createFileRoute("/prediagnostics/report")({
  component: PreDiagnosticsReportPage,
});

function PreDiagnosticsReportPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-[#F5F3F7]">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-[0_20px_40px_rgba(112,88,186,0.12)]">
        <div className="mx-auto flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#5a42cc]/10">
            <LoaderCircle className="h-8 w-8 animate-spin text-[#5a42cc]" />
          </div>

          <h1 className="text-xl font-semibold text-[#2b2233]">Your report is being generated</h1>

          <p className="text-sm leading-6 text-[#7f768f]">
            We're analyzing your conversation. This usually takes a few minutes.
          </p>

          <div className="mt-4 w-full space-y-3">
            <div className="h-2.5 rounded-full bg-[#e5e0ed]" />
            <div className="h-2.5 w-3/4 rounded-full bg-[#e5e0ed]" />
            <div className="h-2.5 w-1/2 rounded-full bg-[#e5e0ed]" />
          </div>
        </div>
      </div>
    </div>
  );
}
