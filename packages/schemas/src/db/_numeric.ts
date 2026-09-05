import { z } from "zod";

/**
 * drizzle-zod maps Postgres `numeric` columns to z.string() (Drizzle stores
 * them as strings to avoid float precision loss). API/AI consumers want a
 * real number, so every numeric column is refined with this coercion.
 */
export const zNumeric = () => z.coerce.number();

/** A 0–1 confidence value — bounds are a documented security requirement, see docs/security.md. */
export const zConfidence = () => z.coerce.number().min(0).max(1);
