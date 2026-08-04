import { createPublicApiRouter } from "../_shared/public-api-router.ts";

Deno.serve(createPublicApiRouter());
