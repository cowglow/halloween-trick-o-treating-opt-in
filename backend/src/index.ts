import "./load-env.js";
import { createApp } from "./ports/http/app.js";
import { buildAppDeps } from "./composition-root.js";

const port = Number(process.env.PORT ?? 4000);
const app = createApp(buildAppDeps());

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
