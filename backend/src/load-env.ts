// Loads .env into process.env. Import it first, before anything that reads
// process.env at import time (composition-root.ts does). quiet: dotenv 17+
// otherwise prints a tip line every time it loads.
import { config } from "dotenv";

config({ quiet: true });
