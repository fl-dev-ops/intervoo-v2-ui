import { headers } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { parseResume } from "@/lib/resume-client";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Please upload a PDF, DOC, or DOCX file." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
        { status: 400 },
      );
    }

    const result = await parseResume(file);

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    if (!result.data?.profile) {
      return NextResponse.json(
        { error: "Failed to extract profile data from resume" },
        { status: 422 },
      );
    }

    const profile = result.data.profile;

    // Normalize the parser output into our resume format
    const resume = {
      name: profile.name || "",
      email: profile.email || "",
      phoneNumber: profile.phoneNumber || "",
      role: profile.roleHint || "",
      experienceYears: profile.experienceYears ?? null,
      education: Array.isArray(profile.education)
        ? profile.education
        : [
            {
              degree: profile.education.degree || "",
              stream: profile.education.major || "",
              institution: profile.education.institution || "",
              graduationYear: profile.education.years || "",
              score: profile.scores?.cgpa || "",
            },
          ],
      skills: profile.skills || [],
      experience: (profile.work_experience || []).map((exp) => ({
        title: exp.role || "",
        company: exp.company || "",
        startDate: exp.start_date || "",
        endDate: exp.end_date || "",
        description: "",
      })),
      projects: (profile.projects || []).map((proj) => {
        const [title, description] = splitResumePair(proj);
        return { title, description };
      }),
      // Rich matching fields — carried through untouched (not edited in the UI),
      // index-aligned with skills/projects/experience above.
      skillGlosses: profile.skillGlosses || {},
      projectKeywords: profile.projectKeywords || [],
      projectCapabilities: profile.projectCapabilities || [],
      workInitiatives: profile.workInitiatives || [],
    };

    return NextResponse.json({ resume });
  } catch (error) {
    console.error("Resume parse error:", error);

    return NextResponse.json(
      { error: "Failed to parse resume" },
      { status: 500 },
    );
  }
}

function splitResumePair(value: string) {
  const parts = value
    .split(/\s+[·-]\s+|:\s+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) return [value, ""] as const;
  return [parts[0], parts.slice(1).join(" - ")] as const;
}
