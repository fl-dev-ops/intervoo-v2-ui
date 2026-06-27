export type ProctorTrackingOptions = {
  audio: boolean;
  numHumans: boolean;
  tabSwitch: boolean;
  photosAtRandom: boolean;
  detectMultipleScreens: boolean;
  forceFullScreen: boolean;
  auxiliaryDevice: boolean;
  recordSession: boolean;
};

export type ProctorConfig = {
  trackingOptions: ProctorTrackingOptions;
  showHowToVideo: boolean;
  testContainerId: string;
  userDetails?: {
    name?: string | null;
    email?: string | null;
  };
};

export type ProctorStatus =
  | "idle"
  | "credentials-issued"
  | "monitoring"
  | "stopped"
  | "failed";

export type ProctorMetadata = {
  config: ProctorConfig;
  status: ProctorStatus;
  startedAt?: string | null;
  stoppedAt?: string | null;
  errorCode?: number | null;
  errorDetail?: string | null;
  reportJson?: unknown;
  trustScore?: number | null;
};

export type SessionMetadataWithProctoring = Record<string, unknown> & {
  proctoring?: ProctorMetadata;
};
