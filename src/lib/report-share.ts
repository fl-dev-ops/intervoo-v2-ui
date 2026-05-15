import { prisma } from "@/lib/db";
import { generateShareToken } from "@/lib/share-token";

export async function createUniquePublicReportToken() {
  const maxAttempts = 8;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateShareToken();
    const [report, diagnostic] = await Promise.all([
      prisma.report.findUnique({
        where: { shareToken: candidate },
        select: { id: true },
      }),
      prisma.diagnostic.findUnique({
        where: { finalReportShareToken: candidate },
        select: { id: true },
      }),
    ]);

    if (!report && !diagnostic) {
      return candidate;
    }
  }

  throw new Error("Failed to generate unique public report token");
}
