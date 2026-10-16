import { z } from "zod";

export const extratoSchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid("Cursor inválido").optional(),
});

export type ExtratoInput = z.infer<typeof extratoSchema>;
