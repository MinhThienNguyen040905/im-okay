import { z } from "zod";

export const locationShareInputSchema = z.object({
  accuracyMeters: z.number().finite().positive().max(50_000),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

export type LocationShareInput = z.infer<typeof locationShareInputSchema>;
