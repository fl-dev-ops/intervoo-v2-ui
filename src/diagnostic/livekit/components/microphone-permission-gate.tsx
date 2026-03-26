import { useCallback, useEffect, useState, type ReactNode } from "react";
import { LoaderCircle, Mic, MicOff } from "lucide-react";

type MicrophonePermissionState = "checking" | "granted" | "denied";

function getPermissionHelpText() {
  if (typeof navigator === "undefined") {
    return "Allow microphone access in your browser settings to continue.";
  }

  const userAgent = navigator.userAgent;

  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return "Open iPhone or iPad Settings, find your browser, and allow microphone access.";
  }

  if (userAgent.includes("Android")) {
    return "Use the lock icon in your browser address bar and allow microphone access.";
  }

  return "Use the lock icon in your browser address bar and allow microphone access.";
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

            if (cancelled) return;

            if (result.state === "granted") {
              setPermissionState("granted");
              return;
            }

            if (result.state === "denied") {
              setPermissionState("denied");
              return;
            }
          } catch {
            // Fall back to a direct media request path below.
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
    <div className="flex min-h-[420px] items-center justify-center rounded-[28px] border border-slate-200 bg-slate-50/80 p-6">
      <div className="max-w-md text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white shadow-sm">
          {permissionState === "checking" ? (
            <LoaderCircle className="h-8 w-8 animate-spin text-slate-600" />
          ) : hasRequestedPermission ? (
            <MicOff className="h-8 w-8 text-red-500" />
          ) : (
            <Mic className="h-8 w-8 text-slate-900" />
          )}
        </div>

        <h3 className="mt-5 text-2xl font-semibold text-slate-950">
          {permissionState === "checking"
            ? "Checking microphone access"
            : hasRequestedPermission
              ? "Microphone access is blocked"
              : "Microphone access is required"}
        </h3>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          {permissionState === "checking"
            ? "Please wait while we check your browser settings."
            : hasRequestedPermission
              ? getPermissionHelpText()
              : "We need microphone access so you can speak during the interview."}
        </p>

        {permissionState !== "checking" ? (
          <button
            type="button"
            onClick={() => void requestPermission()}
            className="mt-6 rounded-full bg-slate-950 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            {hasRequestedPermission ? "Try again" : "Enable microphone"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
