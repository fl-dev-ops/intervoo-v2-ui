export function getLogoText(companyName: string) {
  const words = companyName.split(/\s+/).filter(Boolean);
  if (!words.length) return "JOB";
  if (words.length === 1) return words[0].slice(0, 6);
  return words
    .slice(0, 2)
    .map((word) => word[0])
    .join("");
}
