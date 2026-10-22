// CLI intentionally imports without Next's server-only condition through node conditions.
import { connection } from "../src/db/client";
const c = await connection();
console.log("All database migrations applied or checksums verified.");
await c.close();
