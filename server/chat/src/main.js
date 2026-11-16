import { loadConfig } from "./config.js";
import { createGateway } from "./gateway.js";

const gateway = createGateway(loadConfig(process.env));
await gateway.listen();

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await gateway.close();
    process.exit(0);
  });
}
