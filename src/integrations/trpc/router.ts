import { createTRPCRouter, publicProcedure } from "./init";
import {
  completePreScreenSessionInputSchema,
  getOrCreatePreScreenDraftInputSchema,
  savePreScreenAnswerInputSchema,
  savePreScreenStepInputSchema,
  startPreScreenSessionInputSchema,
} from "#/diagnostic/validators";
import {
  completePreScreenSession,
  getOrCreatePreScreenDraft,
  savePreScreenAnswer,
  savePreScreenStep,
  startPreScreenSession,
} from "#/diagnostic/service";

import type { TRPCRouterRecord } from "@trpc/server";

const preScreenRouter = {
  getOrCreateDraft: publicProcedure
    .input(getOrCreatePreScreenDraftInputSchema)
    .mutation(({ input }) => getOrCreatePreScreenDraft(input.draftId)),
  saveAnswer: publicProcedure
    .input(savePreScreenAnswerInputSchema)
    .mutation(({ input }) => savePreScreenAnswer(input)),
  saveStep: publicProcedure
    .input(savePreScreenStepInputSchema)
    .mutation(({ input }) => savePreScreenStep(input)),
  startSession: publicProcedure
    .input(startPreScreenSessionInputSchema)
    .mutation(({ input }) => startPreScreenSession(input)),
  completeSession: publicProcedure
    .input(completePreScreenSessionInputSchema)
    .mutation(({ input }) => completePreScreenSession(input)),
} satisfies TRPCRouterRecord;

export const trpcRouter = createTRPCRouter({
  preScreen: preScreenRouter,
});
export type TRPCRouter = typeof trpcRouter;
