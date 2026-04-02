import { buildParticipantName } from "#/common/user/participant-name";
import {
  buildDiagnosticParticipantIdentity,
  buildDiagnosticRoomName,
  createDiagnosticLiveKitRoom,
  createDiagnosticLiveKitToken,
  getDiagnosticLiveKitServerUrl,
  startDiagnosticRoomRecording,
} from "#/diagnostic/livekit.server";
import type { DiagnosticConnectionDetails } from "#/diagnostic/types";

type StartDiagnosticUser = {
  id: string;
  name: string;
};

export async function startDiagnosticInterviewSession(input: {
  user: StartDiagnosticUser;
}): Promise<DiagnosticConnectionDetails> {
  const roomName = buildDiagnosticRoomName(input.user.id);
  const participantIdentity = buildDiagnosticParticipantIdentity(input.user.id);
  const participantName = buildParticipantName(input.user.name);

  await createDiagnosticLiveKitRoom({
    roomName,
    metadata: {
      mode: "diagnostic_interview",
      student_id: input.user.id,
      student_name: participantName,
    },
  });

  await startDiagnosticRoomRecording({
    roomName,
    sessionId: roomName,
  });

  const participantToken = await createDiagnosticLiveKitToken({
    roomName,
    participantIdentity,
    participantName,
  });

  return {
    sessionId: roomName,
    serverUrl: getDiagnosticLiveKitServerUrl(),
    roomName,
    participantName,
    participantIdentity,
    participantToken,
  };
}
