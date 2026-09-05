import { z } from "zod";

// Consistent error envelope, per docs/api-contracts.md. Never expose stack
// traces or internal error details through this shape.
export const apiErrorSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

export type ApiError = z.infer<typeof apiErrorSchema>;
