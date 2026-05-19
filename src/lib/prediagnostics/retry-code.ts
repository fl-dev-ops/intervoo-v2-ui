const RETRY_CODE_LENGTH = 7;
const RETRY_CODE_MARKER = "n";
const RETRY_CODE_MARKER_INDEX = 3;
const RETRY_CODE_ALPHABET = "abcdefghijklmopqrstuvwxyz0123456789";
const RETRY_CODE_PATTERN = /^[a-z0-9]{7}$/;

export function createPrediagnosticRetryCode() {
  const characters = Array.from({ length: RETRY_CODE_LENGTH }, (_, index) =>
    index === RETRY_CODE_MARKER_INDEX ? RETRY_CODE_MARKER : randomCharacter(),
  );

  return characters.join("");
}

export function isValidPrediagnosticRetryCode(value: unknown) {
  if (typeof value !== "string") return false;

  const code = value.trim().toLowerCase();
  return (
    code.length === RETRY_CODE_LENGTH &&
    RETRY_CODE_PATTERN.test(code) &&
    code[RETRY_CODE_MARKER_INDEX] === RETRY_CODE_MARKER
  );
}

function randomCharacter() {
  const index = getRandomIndex(RETRY_CODE_ALPHABET.length);
  return RETRY_CODE_ALPHABET[index];
}

function getRandomIndex(max: number) {
  const cryptoApi = globalThis.crypto;
  if (cryptoApi?.getRandomValues) {
    const values = new Uint32Array(1);
    cryptoApi.getRandomValues(values);
    return values[0] % max;
  }

  return Math.floor(Math.random() * max);
}
