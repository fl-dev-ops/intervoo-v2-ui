import { describe, expect, test } from "vitest";
import {
  formatPhoneNumberForDisplay,
  isLocalPhoneNumberComplete,
  normalizeLocalPhoneNumber,
  toE164PhoneNumber,
} from "#/lib/phone";

describe("phone helpers", () => {
  test("keeps local numbers that begin with 91 intact", () => {
    expect(normalizeLocalPhoneNumber("9150817289")).toBe("9150817289");
    expect(isLocalPhoneNumberComplete("9150817289")).toBe(true);
    expect(toE164PhoneNumber("9150817289")).toBe("+919150817289");
  });

  test("normalizes pasted numbers that include the country code", () => {
    expect(normalizeLocalPhoneNumber("+91 9150817289")).toBe("9150817289");
    expect(formatPhoneNumberForDisplay("+91 9150817289")).toBe("+91 9150817289");
  });
});
