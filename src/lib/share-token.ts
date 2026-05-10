const TOKEN_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const TOKEN_LENGTH = 7;

export function generateShareToken(): string {
  let token = "";
  for (let i = 0; i < TOKEN_LENGTH; i++) {
    token += TOKEN_ALPHABET.charAt(
      Math.floor(Math.random() * TOKEN_ALPHABET.length),
    );
  }
  return token;
}

export function buildPublicReportUrl(
  baseUrl: string,
  token: string,
  type: "pre" | "diag",
): string {
  const cleanBase = baseUrl.replace(/\/$/, "");
  const prefix = type === "pre" ? "p" : "d";
  return `${cleanBase}/${prefix}/${token}`;
}
