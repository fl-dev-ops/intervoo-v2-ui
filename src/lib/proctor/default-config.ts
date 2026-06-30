import type { ProctorConfig } from "@/lib/proctor/types";

export const PROCTOR_TEST_CONTAINER_ID = "test-container";

export const DEFAULT_PROCTORING_CONFIG: ProctorConfig = {
  trackingOptions: {
    audio: true,
    numHumans: true,
    tabSwitch: true,
    photosAtRandom: true,
    detectMultipleScreens: false,
    forceFullScreen: true,
    auxiliaryDevice: false,
    recordSession: false,
  },
  showHowToVideo: false,
  testContainerId: PROCTOR_TEST_CONTAINER_ID,
};
