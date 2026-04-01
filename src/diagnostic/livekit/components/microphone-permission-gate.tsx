import { useCallback, useEffect, useState, type ReactNode } from "react";
import { LoaderCircle, Mic, MicOff } from "lucide-react";

type MicrophonePermissionState = "checking" | "granted" | "denied";

function getPermissionHelpText() {
  if (typeof navigator === "undefined") {
    return "Allow microphone access in your browser settings to continue.";
  }

  const userAgent = navigator.userAgent;

  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return "Open Settings for your browser and allow microphone access, then try again.";
  }

  if (userAgent.includes("Android")) {
    return "Use the browser lock icon and allow microphone access.";
  }

  return "Use the browser lock icon in the address bar and allow microphone access.";
}

export function MicrophonePermissionGate({ children }: { children: ReactNode }) {
  const [permissionState, setPermissionState] = useState<MicrophonePermissionState>("checking");
  const [hasRequestedPermission, setHasRequestedPermission] = useState(false);

  const requestPermission = useCallback(async () => {
    setHasRequestedPermission(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setPermissionState("granted");
    } catch {
      setPermissionState("denied");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function checkPermission() {
      try {
        if (navigator.permissions) {
          try {
            const result = await navigator.permissions.query({
              name: "microphone" as PermissionName,
            });

            if (cancelled) {
              return;
            }

            if (result.state === "granted") {
              setPermissionState("granted");
              return;
            }

            if (result.state === "denied") {
              setPermissionState("denied");
              return;
            }
          } catch {
            setPermissionState("denied");
            return;
          }
        }

        setPermissionState("denied");
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

  if (permissionState === "granted") {
    return <>{children}</>;
  }

  return (
    <div className="grid min-h-[55dvh] place-items-center">
      <div className="w-full rounded-3xl border border-slate-700/90 bg-slate-950/85 p-6 text-center shadow-[0_28px_60px_rgba(2,6,23,0.55)]">
        <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full border border-slate-700 bg-slate-900 text-slate-100">
          {permissionState === "checking" ? (
            <LoaderCircle className="h-8 w-8 animate-spin" />
          ) : hasRequestedPermission ? (
            <MicOff className="h-8 w-8" />
          ) : (
            <Mic className="h-8 w-8" />
          )}
        </div>

        <h3 className="text-lg font-semibold text-slate-50">
          {permissionState === "checking"
            ? "Checking microphone access"
            : hasRequestedPermission
              ? "Microphone access is blocked"
              : "Microphone access is required"}
        </h3>

        <p className="mt-3 text-sm leading-6 text-slate-300">
          {permissionState === "checking"
            ? "Please wait while we check your browser permissions."
            : hasRequestedPermission
              ? getPermissionHelpText()
              : "Sana needs your microphone so you can answer by voice."}
        </p>

        {permissionState !== "checking" ? (
          <button
            className="mt-5 inline-flex h-12 w-full items-center justify-center rounded-full border border-amber-300/50 bg-amber-400 px-4 text-sm font-semibold text-slate-950 transition hover:bg-amber-300"
            type="button"
            onClick={() => void requestPermission()}
          >
            {hasRequestedPermission ? "Try again" : "Enable microphone"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
