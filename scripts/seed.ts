import { seedDemo } from "../src/db/seed";
import { connection } from "../src/db/client";
await seedDemo();
console.log(
  "12 unverified demonstration drafts seeded. No instructional content published.",
);
await (await connection()).close();
