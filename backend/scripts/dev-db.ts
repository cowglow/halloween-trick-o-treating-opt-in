import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const dataDir = process.env.PGLITE_DATA_DIR ?? "./.pglite-data";
const port = Number(process.env.PGLITE_PORT ?? 5432);

const db = new PGlite(dataDir);
// Prisma 7's pg adapter opens a pool of connections; PGlite queues their
// queries on its one session.
const server = new PGLiteSocketServer({ db, port, host: "127.0.0.1", maxConnections: 20 });

await server.start();
console.log(`PGlite dev database listening on postgresql://127.0.0.1:${port}`);
