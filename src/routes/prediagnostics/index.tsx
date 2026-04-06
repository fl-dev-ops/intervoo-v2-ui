import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { LoaderCircle, Mic, MicOff } from "lucide-react";

type MicPermissionState = "checking" | "prompt" | "granted" | "denied";

export const Route = createFileRoute("/prediagnostics/")({
  component: PreDiagnosticsPage,
});

function PreDiagnosticsPage() {
  const [permissionState, setPermissionState] = useState<MicPermissionState>("checking");
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function checkPermission() {
      try {
        if (navigator.permissions) {
          try {
            const result = await navigator.permissions.query({
              name: "microphone" as PermissionName,
            });

            if (cancelled) return;

            if (result.state === "granted") {
              setPermissionState("granted");
              return;
            }

            if (result.state === "denied") {
              setPermissionState("denied");
              return;
            }

            setPermissionState("prompt");
            return;
          } catch {
            // permissions.query not supported, fall through
          }
        }

        if (cancelled) return;

        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          stream.getTracks().forEach((track) => track.stop());
          if (!cancelled) {
            setPermissionState("granted");
          }
        } catch {
          if (!cancelled) {
            setPermissionState("denied");
          }
        }
      } catch {
        if (!cancelled) {
          setPermissionState("denied");
        }
      }
    }

    void checkPermission();

    return () => {
      cancelled = true;
    };
  }, []);

  const requestPermission = useCallback(async () => {
    setHasRequestedPermission(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      stream.getTracks().forEach((track) => track.stop());
      setPermissionState("granted");
    } catch {
      setPermissionState("denied");
    }
  }, []);

  const handleStartSession = async () => {
    setIsStarting(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      window.location.href = "/prediagnostics/session";
    } catch {
      setPermissionState("denied");
      setIsStarting(false);
    }
  };

  if (permissionState === "checking") {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F5F3F7]">
        <div className="flex flex-col items-center gap-3">
          <LoaderCircle className="h-8 w-8 animate-spin text-[#5a42cc]" />
          <p className="text-sm text-[#7f768f]">Checking microphone access...</p>
        </div>
      </div>
    );
  }

  if (permissionState !== "granted") {
    return (
      <div className="grid min-h-screen place-items-center bg-[#F5F3F7]">
        <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-[0_20px_40px_rgba(112,88,186,0.12)]">
          <div className="mx-auto flex flex-col items-center gap-3">
            {permissionState === "denied" && hasRequestedPermission ? (
              <MicOff className="h-10 w-10 text-[#7f768f]" />
            ) : (
              <Mic className="h-10 w-10 text-[#5a42cc]" />
            )}

            <h3 className="text-lg font-semibold text-[#2b2233]">
              {permissionState === "denied" && hasRequestedPermission
                ? "Microphone access is blocked"
                : "Microphone access is required"}
            </h3>

            <p className="text-sm leading-6 text-[#7f768f]">
              {permissionState === "denied" && hasRequestedPermission
                ? "Please allow microphone access in your browser settings and try again."
                : "Sana needs your microphone so you can answer by voice."}
            </p>

            <button
              className="mt-2 w-full rounded-full bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)] px-8 py-4 text-sm font-medium text-white shadow-[0_14px_28px_rgba(93,72,220,0.25)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isStarting}
              type="button"
              onClick={() => void requestPermission()}
            >
              {hasRequestedPermission ? "Try again" : "Enable microphone"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-[#F5F3F7]">
      <div className="w-full max-w-sm rounded-3xl bg-white p-8 text-center shadow-[0_20px_40px_rgba(112,88,186,0.12)]">
        <div className="mx-auto flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)]">
            <Mic className="h-8 w-8 text-white" />
          </div>

          <h1 className="text-xl font-semibold text-[#2b2233]">Ready for Pre-Diagnostic?</h1>

          <p className="text-sm leading-6 text-[#7f768f]">
            Make sure your microphone is working before starting the session.
          </p>

          <button
            className="mt-2 w-full rounded-full bg-[linear-gradient(90deg,#4F33A3_0%,#6A4DF5_100%)] px-8 py-4 text-sm font-medium text-white shadow-[0_14px_28px_rgba(93,72,220,0.25)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isStarting}
            type="button"
            onClick={() => void handleStartSession()}
          >
            {isStarting ? (
              <LoaderCircle className="mx-auto h-5 w-5 animate-spin" />
            ) : (
              "Start session"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
