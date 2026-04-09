export const FIXED_COUNTRY_CODE = "+91";
const FIXED_COUNTRY_CODE_DIGITS = FIXED_COUNTRY_CODE.replace(/\D/g, "");
const LOCAL_PHONE_LENGTH = 10;

export function normalizeLocalPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "");

  if (!digits) {
    return "";
  }

  if (digits.length > LOCAL_PHONE_LENGTH && digits.startsWith(FIXED_COUNTRY_CODE_DIGITS)) {
    return digits.slice(FIXED_COUNTRY_CODE_DIGITS.length).slice(0, LOCAL_PHONE_LENGTH);
  }

  return digits.slice(0, LOCAL_PHONE_LENGTH);
}

export function toE164PhoneNumber(value: string) {
  return `${FIXED_COUNTRY_CODE}${normalizeLocalPhoneNumber(value)}`;
}

export function formatPhoneNumberForDisplay(value: string) {
  const localNumber = normalizeLocalPhoneNumber(value);
  return localNumber ? `${FIXED_COUNTRY_CODE} ${localNumber}` : FIXED_COUNTRY_CODE;
}

export function isLocalPhoneNumberComplete(value: string) {
  return normalizeLocalPhoneNumber(value).length === LOCAL_PHONE_LENGTH;
}
