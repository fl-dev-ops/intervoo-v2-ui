import { useCallback } from "react";
import {
  type TrackReference,
  useLocalParticipantPermissions,
  usePersistentUserChoices,
  useSessionContext,
  useTrackToggle,
} from "@livekit/components-react";
import { Track } from "livekit-client";

const trackSourceToProtocol = (source: Track.Source) => {
  switch (source) {
    case Track.Source.Camera:
      return 1;
    case Track.Source.Microphone:
      return 2;
    case Track.Source.ScreenShare:
      return 3;
    default:
      return 0;
  }
};

export interface PublishPermissions {
  camera: boolean;
  microphone: boolean;
  screenShare: boolean;
  data: boolean;
}

export function usePublishPermissions(): PublishPermissions {
  const localPermissions = useLocalParticipantPermissions();

  const canPublishSource = (source: Track.Source) =>
    !!localPermissions?.canPublish &&
    (localPermissions.canPublishSources.length === 0 ||
      localPermissions.canPublishSources.includes(trackSourceToProtocol(source)));

  return {
    camera: canPublishSource(Track.Source.Camera),
    microphone: canPublishSource(Track.Source.Microphone),
    screenShare: canPublishSource(Track.Source.ScreenShare),
    data: localPermissions?.canPublishData ?? false,
  };
}

export interface UseInputControlsProps {
  saveUserChoices?: boolean;
  onDisconnect?: () => void;
  onDeviceError?: (error: { source: Track.Source; error: Error }) => void;
}

export interface UseInputControlsReturn {
  microphoneTrack?: TrackReference;
  microphoneToggle: ReturnType<typeof useTrackToggle<Track.Source.Microphone>>;
  cameraToggle: ReturnType<typeof useTrackToggle<Track.Source.Camera>>;
  screenShareToggle: ReturnType<typeof useTrackToggle<Track.Source.ScreenShare>>;
  handleAudioDeviceChange: (deviceId: string) => void;
  handleVideoDeviceChange: (deviceId: string) => void;
  handleMicrophoneDeviceSelectError: (error: Error) => void;
  handleCameraDeviceSelectError: (error: Error) => void;
}

export function useInputControls({
  saveUserChoices = true,
  onDeviceError,
}: UseInputControlsProps = {}): UseInputControlsReturn {
  const {
    local: { microphoneTrack },
  } = useSessionContext();

  const microphoneToggle = useTrackToggle({
    source: Track.Source.Microphone,
    onDeviceError: (error) => onDeviceError?.({ source: Track.Source.Microphone, error }),
  });

  const cameraToggle = useTrackToggle({
    source: Track.Source.Camera,
    onDeviceError: (error) => onDeviceError?.({ source: Track.Source.Camera, error }),
  });

  const screenShareToggle = useTrackToggle({
    source: Track.Source.ScreenShare,
    onDeviceError: (error) => onDeviceError?.({ source: Track.Source.ScreenShare, error }),
  });

  const {
    saveAudioInputDeviceId,
    saveAudioInputEnabled,
    saveVideoInputDeviceId,
    saveVideoInputEnabled,
  } = usePersistentUserChoices({ preventSave: !saveUserChoices });

  const handleAudioDeviceChange = useCallback(
    (deviceId: string) => {
      saveAudioInputDeviceId(deviceId ?? "default");
    },
    [saveAudioInputDeviceId],
  );

  const handleVideoDeviceChange = useCallback(
    (deviceId: string) => {
      saveVideoInputDeviceId(deviceId ?? "default");
    },
    [saveVideoInputDeviceId],
  );

  const handleToggleCamera = useCallback(
    async (enabled?: boolean) => {
      if (screenShareToggle.enabled) {
        void screenShareToggle.toggle(false);
      }
      await cameraToggle.toggle(enabled);
      saveVideoInputEnabled(!cameraToggle.enabled);
    },
    [cameraToggle, saveVideoInputEnabled, screenShareToggle],
  );

  const handleToggleMicrophone = useCallback(
    async (enabled?: boolean) => {
      await microphoneToggle.toggle(enabled);
      saveAudioInputEnabled(!microphoneToggle.enabled);
    },
    [microphoneToggle, saveAudioInputEnabled],
  );

  const handleToggleScreenShare = useCallback(
    async (enabled?: boolean) => {
      if (cameraToggle.enabled) {
        void cameraToggle.toggle(false);
      }
      await screenShareToggle.toggle(enabled);
    },
    [cameraToggle, screenShareToggle],
  );

  const handleMicrophoneDeviceSelectError = useCallback(
    (error: Error) => onDeviceError?.({ source: Track.Source.Microphone, error }),
    [onDeviceError],
  );

  const handleCameraDeviceSelectError = useCallback(
    (error: Error) => onDeviceError?.({ source: Track.Source.Camera, error }),
    [onDeviceError],
  );

  return {
    microphoneTrack,
    cameraToggle: {
      ...cameraToggle,
      toggle: handleToggleCamera,
    },
    microphoneToggle: {
      ...microphoneToggle,
      toggle: handleToggleMicrophone,
    },
    screenShareToggle: {
      ...screenShareToggle,
      toggle: handleToggleScreenShare,
    },
    handleAudioDeviceChange,
    handleVideoDeviceChange,
    handleMicrophoneDeviceSelectError,
    handleCameraDeviceSelectError,
  };
}
