import type { DiagnosticQuestion } from "./diagnostic-activity";

const THINKING_RUBRIC_TEXT = `
THINKING RUBRIC (T1-T5)
Framework note: Holistic across 4 dimensions. No single dimension creates or breaks the level. Pattern across all four defines it. Score what is visible in the transcript only — do not infer upward. Unclear is a valid outcome.
Sub-dimensions: Relevance, Specificity, Reasoning, Job Competency

T1 (Not Shown)
- Relevance: Does not address the question. Talks about the topic in general terms only. Response could be an answer to any question.
- Specificity: No concrete detail. No named situation, numbers, task, tools, or people. Response is hollow and unverifiable.
- Reasoning: No visible why/how. States what happened or would happen with no explanation. Pure assertion or description.
- Job Competency: Competency is not demonstrated. Claim without evidence. Interviewer cannot assess anything real.

T2 (Minimal)
- Relevance: Grasps what is being asked but does not fully engage. Safe and surface-level. Stays at the level of general intention without connecting to a real or specific experience.
- Specificity: Mentions a context but too broadly to be meaningful. No names, numbers, or specific task. Generic enough to be unverifiable.
- Reasoning: Basic cause-and-effect only. One because or so statement present. No deeper explanation of how they thought through it. Thin but present.
- Job Competency: Understands why the competency matters and can articulate its importance. Does not demonstrate or construct the actual behaviour. Knowledge without application.

T3 (Developing)
- Relevance: Directly addresses the question and connects it to a real or constructed experience. On topic throughout with no drift into general claims.
- Specificity: Names a real or hypothetical context. Names a person or role. Describes a specific task or scenario. Basic but credible detail present.
- Reasoning: Describes what they did or would do and begins to explain why. Cause and effect is visible. Does not yet weigh options or fully explain the thinking behind their choice.
- Job Competency: Behaviour actually happened in a real situation or is constructed with enough credibility to be believable. Right instinct clearly present. Execution is basic but genuine.

T4 (Competent)
- Relevance: Deliberately evaluates which experience or scenario best fits the question. Selects the strongest most relevant example rather than the first one that comes to mind. Answer is sharply on point with no drift.
- Specificity: Breaks the situation into its parts. Names exact steps, amounts, dates, documents, systems, or people. Detail is precise enough to be recreated. Professional vocabulary present.
- Reasoning: Considers more than one option and explains why they chose their approach over alternatives. Cause, consequence, and professional judgment all visible. Thinking is structured not instinctive.
- Job Competency: Makes or constructs a deliberate and informed professional choice. Did not act on instinct alone. Consequence is understood and owned. Awareness of professional norms and accountability is visible.

T5 (Strong)
- Relevance: Goes beyond the question and connects the specific experience or scenario to a broader professional principle. Answer is sophisticated and shows genuine professional maturity.
- Specificity: All of T4 plus something new — a prevention system, follow-up action, process change, or learning not present in the original question. Detail is verifiable and the experience is fully internalised.
- Reasoning: Generates a new insight from the experience. Reflection is present and specific. States what they learned and what they changed as a result. Thinking is not just structured — it is generative.
- Job Competency: Behaviour fully demonstrated with complete ownership and no deflection. Impact is quantified or named. Something new was built from the experience — a system, habit, or process change that goes beyond the single instance.
`.trim();

const CONFIDENCE_RUBRIC_TEXT = `
CONFIDENCE RUBRIC (VCP 1-4)
Framework note: Holistic listener impression across 4 audio signals. Not a checklist. Score by overall pattern.
Sub-dimensions: Volume, Pace, Pause, Latency

VCP1 (Absent, score range 0-24)
- Volume: Frequently too low to hear clearly; words are lost.
- Pace: No controlled rhythm; blur or long dead spaces; no recovery.
- Pause: Either long freeze pauses or anxious unbroken rush.
- Latency: Often over 6s before speaking, or panic-level near-zero starts.

VCP2 (Inconsistent, score range 25-49)
- Volume: Audible on easy prompts, drops on harder prompts.
- Pace: Followable on familiar content; breaks under cognitive load.
- Pause: Natural on easy prompts; long/frequent on hard prompts; fillers may dominate.
- Latency: Usually 2-4s early, then spikes higher on hard/situational prompts.

VCP3 (Emerging, score range 50-74)
- Volume: Mostly clear and audible; slight drops on hardest prompts with recovery.
- Pace: Generally controlled; mild drift under load with correction.
- Pause: Mostly purposeful; occasional longer pauses with quick recovery.
- Latency: Mostly 2-4s; sometimes 4-5s on situational prompts without becoming a pattern.

VCP4 (Confident, score range 75-100)
- Volume: Clear and steady across easy and hard prompts.
- Pace: Controlled and stable throughout; slowing on hard prompts is deliberate.
- Pause: Intentional, well-placed pauses read as control.
- Latency: Consistent 2-4s without difficulty-driven spikes.
`.trim();

const LANGUAGE_RUBRIC_TEXT = `
CEFR LANGUAGE RUBRIC (L1–L5)
Framework note: Scored across 5 dimensions. Each dimension is scored independently. Source varies per dimension — Fluency and Interaction require audio signals; Grammar, Coherence, and Range are transcript-primary. Indian accent, Indian English vocabulary, and code-mixing are never penalised. All audio scoring is relative to the candidate's own baseline, not an external norm.
Sub-dimensions: Fluency, Grammar, Coherence, Range, Interaction

L1 (Pre-A1 / A1)
- Fluency: Speech rate consistently below 80 WPM. Mid-sentence pauses regularly exceeding 3 seconds. Majority of turns are single words or fragments. No self-repair — candidate simply stops. Filler words absent — output too minimal to contain them. (** Use audio file attached **)
- Grammar: No functional sentence structure — words and fragments only. Zero subject-verb agreement. No tense marking — verbs used in base form only. Error rate renders meaning unclear. No self-correction present.
- Coherence: No connectives present — words and phrases unlinked. No logical sequence detectable. Each word or phrase stands alone with no building of meaning. Topic maintenance impossible to assess — output too minimal. Line of thought cannot be followed.
- Range: Vocabulary limited to isolated common words only. Same words repeated across every answer. No topic-specific vocabulary. Type-token ratio extremely low. No phrases or collocations — single words only.
- Interaction: Responses do not match the question — semantic mismatch frequent. Single word or gesture responses only. No spontaneous elaboration. Clarification requests absent. Register awareness absent. Turn-taking fully dependent on interviewer prompting.

L2 (A2)
- Fluency: Speech rate between 80 and 100 WPM. Frequent false starts — candidate restarts the same sentence 2 or more times per answer. Mid-sentence pauses of 2 to 3 seconds appear regularly. Basic repair present but does not resolve the breakdown. Filler words frequent — more than 3 per answer. Meaning survives but effortfulness is audible.
- Grammar: Simple subject-verb-object structures attempted but inconsistently correct. Systematic tense mixing — past and present confusion across every answer. Agreement errors frequent. Sentences are short and formulaic — memorised chunks rather than generated grammar. Error rate high but meaning usually survives. No complex structures attempted.
- Coherence: Only basic additive connectives present — and, then, also. Ideas listed rather than developed. Topic maintained on familiar questions only. No counter-argument or qualification attempted. Discourse markers absent or misused. Response reads as a list of facts not a coherent answer.
- Range: Basic everyday vocabulary present. Topic vocabulary limited to memorised single words. No collocations — words used in isolation not in natural phrases. Repetition frequent. Circumlocution absent — candidate stops when a word is unavailable rather than working around it. Type-token ratio low.
- Interaction: Responses match the question on familiar topics only. Answers the minimum and stops immediately. No spontaneous elaboration. Clarification absent — candidate guesses rather than asks. Register undifferentiated across all questions. Turn-taking mechanical — waits for prompting before every contribution. Interaction breaks down completely on unfamiliar questions.

L3 (B1)
- Fluency: Speech rate between 100 and 120 WPM. False starts present but candidate recovers within the same sentence. Mid-sentence pauses under 2 seconds — occasional not patterned. Repair strategies present and functional. Filler words present but not dominant — under 3 per answer on familiar questions. Fluency drops noticeably on harder questions but recovers before the next question.
- Grammar: Simple structures mostly correct. Errors appear on complex structures — relative clauses, conditionals, passive voice. Tense mixing present but not systematic — appears under pressure or on complex content. Some subordination attempted with partial success. Meaning never lost — occasional ambiguity only. Self-correction present — candidate catches and fixes errors mid-answer.
- Coherence: Causal and temporal connectives present — because, when, after, so. Clear linear sequence detectable — beginning, middle, end. Topic maintained across most of the answer. Simple counter-argument attempted. Discourse markers present and mostly appropriate. Ideas connect but development is thin — one layer deep only. Coherence breaks down on opinion and evaluative questions.
- Range: Adequate vocabulary for familiar topics. Some topic-specific vocabulary used correctly. Circumlocution present — candidate works around gaps rather than stopping. Basic collocations present. Repetition present but not dominant. Vocabulary gaps cause hesitation but not breakdown. No idiomatic language. Range drops noticeably on unfamiliar topics.
- Interaction: Responses relevant across most questions including moderately hard ones. Some spontaneous elaboration on familiar questions — candidate adds one layer beyond minimum. Basic repair present. Register beginning to differentiate — slightly more formal on professional questions. Turn-taking natural on familiar ground — loses naturalness on hard questions. Interaction quality visibly drops on opinion and evaluative questions.

L4 (B2)
- Fluency: Speech rate between 120 and 150 WPM. False starts rare — appear on complex questions only. Pauses are between sentences not within them — purposeful not disruptive. Repair is smooth and barely noticeable. Filler words rare — under 2 per answer across most questions. Fluency holds across familiar and harder questions with only minor wobble.
- Grammar: Simple and moderately complex structures controlled. Errors rare — appear on most complex structures only. Tense handling accurate across answers including perfect tenses. Passive voice, conditionals, and relative clauses used correctly. Self-correction smooth and quick. Error rate low — listener would not notice most errors. Grammatical control holds across easy and hard questions.
- Coherence: Wide range of connectives used accurately — concession, contrast, result, condition. Ideas developed across multiple layers — claim, evidence, implication. Topic maintained across entire answer including under pressure. Counter-arguments introduced and addressed not just mentioned. Discourse markers varied and appropriate. Response has clear architecture — listener can follow the logic. Coherence holds on both factual and opinion questions.
- Range: Good range across familiar and moderately unfamiliar topics. Topic-specific vocabulary used accurately and naturally. Strong collocations present. Circumlocution smooth — gaps covered without drawing attention. Some idiomatic expressions present and used correctly. Repetition rare — candidate finds alternative expressions. Type-token ratio high. Range holds across most question types.
- Interaction: Responses consistently relevant across all question types. Spontaneous elaboration present across familiar and harder questions. Repair and clarification used appropriately and naturally. Register clearly differentiated — candidate adjusts to question formality. Turn-taking natural and sustained across the session. Candidate pushes back or qualifies when appropriate. Interaction holds across session with minor wobble only on hardest questions.

L5 (C1 / C2)
- Fluency: Speech rate 140 to 160 WPM — owned and controlled, not rushed. False starts absent or rhetorically deployed — restarts for emphasis not confusion. Pauses are deliberate — used for effect, thinking, or emphasis. No repair needed or repair is so smooth it reads as a stylistic choice. Filler words absent. Fluency is indistinguishable across easy and hard questions — no observable drop under pressure.
- Grammar: Full range of complex structures used accurately and naturally. Errors extremely rare — when present they are slips not gaps. Advanced structures present — inversion, cleft sentences, mixed conditionals. Grammar serves the meaning precisely — structures chosen for effect not just correctness. Self-correction absent or invisible. Grammatical accuracy maintained even on hardest questions under maximum pressure.
- Coherence: Full repertoire of cohesive devices used precisely and flexibly. Ideas developed with sophistication — nuance, qualification, and implication all present. Argument structure is seamless — no visible joins between ideas. Counter-arguments fully integrated into the response not bolted on. Discourse markers deployed for rhetorical effect not just connection. Response could be transcribed as a coherent paragraph without editing. Coherence is indistinguishable across all question types.
- Range: Broad lexical repertoire across all topics including abstract and technical. Idiomatic and colloquial language used naturally and appropriately. Precise word choice — candidate selects words for exact shade of meaning. Collocations are native-like — phrases sound natural not constructed. Circumlocution deployed stylistically not as a gap-filler. Zero avoidance — no topics where vocabulary runs dry. Type-token ratio very high. Range consistent and rich across the entire session.
- Interaction: Responses precisely targeted — candidate answers the actual question not a version of it. Elaboration rich and spontaneous — candidate develops ideas beyond what was asked. Repair invisible — candidate navigates around difficulty without signalling it. Register nuanced — adjusted not just for formality but for tone and relationship. Turn-taking completely natural — conversation feels bilateral not interrogative. Candidate shapes the conversation — introduces emphasis, redirects, qualifies. Interaction quality indistinguishable across the entire session.
`.trim();

export function buildDiagnosticReportPrompt(input: {
  participantName: string;
  transcriptPromptText: string;
  questions: DiagnosticQuestion[];
}) {
  const questions = input.questions;
  const askedQuestions = questions
    .map(
      (question, index) =>
        `${index + 1}. ${question.id} [${question.question_type.join(", ")}] ${question.text}`,
    )
    .join("\n");
  const allowedQuestionIds = questions
    .map((question) => question.id)
    .join(", ");

  return `You are generating a structured diagnostic interview report for a learner.

Important rules:
- Evaluate the USER only. Ignore the AGENT content except as question context.
- Use both the transcript and the attached audio recording. Use the transcript as the primary source for what was said, and use the audio recording for delivery signals such as volume, pace, pauses, latency, fluency, and pronunciation.
- Return ONLY valid JSON.
- Do not include markdown, commentary, or code fences.
- Keep strengths and improvement_areas concise and actionable.
- Keep education_summary factual and short.
- question_responses should use only these confirmed asked question IDs: ${allowedQuestionIds}.
- assessment_result.question_responses MUST contain at least 1 item.
- strengths MUST contain at least 1 item.
- improvement_areas MUST contain at least 1 item.
- Never return empty arrays for required fields.
- For language_levels, return ONLY exact CEFR labels: Pre-A1, A1, A2, B1, B2, C1, or C2.
- Never return rubric labels such as L1, L2, L3, L4, L5, or mixed labels like "L3 (B1)".
- For each question_response, include ONLY criteria and reasons that match that question's types from "Confirmed asked questions".
- Omit non-applicable fields entirely (do not send null or empty placeholders).
- Include concise reasons for every included criterion label.

Diagnostic conversation goal:
- Understand the learner's background
- Understand the role they are aiming for
- Understand how clearly they think and communicate about their goals

Confirmed asked questions:
${askedQuestions}

Scoring framework:
- question_type can include one or more of: Language, Thinking, Confidence
- thinking_level (when Thinking applies): TF1 to TF5
- confidence_level (when Confidence applies): VCP1 to VCP4
- language_levels per dimension (when Language applies): Fluency, Grammar, Range, Coherence, Interaction using Pre-A1, A1, A2, B1, B2, C1, or C2
- Return labels/tags only; do not return numeric scores or salary fields.

CRITICAL — Field inclusion rules per question:
- Check each question's types in "Confirmed asked questions" above.
- If "Thinking" is listed: include thinking_level and reasoning.thinking (a plain string summary).
- If "Confidence" is listed: include confidence_level and reasoning.confidence (a plain string summary).
- If "Language" is listed: include language_levels (object with dimension keys) and reasoning.language (object with matching dimension keys).
- If a question has MULTIPLE types (e.g., [Thinking, Language]), include fields for ALL listed types and omit fields for unlisted types.
- Do NOT include fields for types that are NOT listed for that question.

Use this rubric to assign thinking_level:
${THINKING_RUBRIC_TEXT}

Use this rubric to assign confidence_level:
${CONFIDENCE_RUBRIC_TEXT}

Use this rubric to assign language_levels (Fluency/Grammar/Range/Coherence/Interaction independently):
${LANGUAGE_RUBRIC_TEXT}

- The response schema is enforced separately. Follow it exactly and do not add extra keys.

Learner name: ${input.participantName}

Transcript:
${input.transcriptPromptText}`;
}
