import type { ComponentProps } from "react";
import type { PreScreenQuestionnaireDraftDto, StartPreScreenSessionResponseDto } from "../dto";
import { PreScreenLiveKitSession } from "../livekit/components/pre-screen-livekit-session";

export function PreScreenSessionPanel({
  draft,
  livekit,
  pending,
  onComplete,
  onRestart,
}: {
  draft: PreScreenQuestionnaireDraftDto;
  livekit: StartPreScreenSessionResponseDto["livekit"] | null;
  pending: boolean;
  onComplete: PreScreenLiveKitSessionProps["onFinish"];
  onRestart: () => Promise<void>;
}) {
  if (livekit) {
    return (
      <PreScreenLiveKitSession
        connection={livekit}
        studentName={draft.latestAgentContext?.studentName ?? null}
        roleFocus={draft.latestAgentContext?.targetRoles.aiming ?? null}
        pending={pending}
        onFinish={onComplete}
        onRestart={onRestart}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Pre-screen</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
          Your pre-screen setup needs to be refreshed
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
          This interview token is only available right after the session starts. Restart the setup
          to get a fresh connection and rejoin the interview.
        </p>
      </div>

      <div className="rounded-[24px] border border-slate-200 bg-slate-50 p-5">
        <button
          type="button"
          onClick={() => void onRestart()}
          disabled={pending}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Restarting..." : "Restart pre-screen setup"}
        </button>
      </div>
    </div>
  );
}

type PreScreenLiveKitSessionProps = ComponentProps<typeof PreScreenLiveKitSession>;
