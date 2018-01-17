console.log(`Running on node ${process.version}`);
require("./bin/webhook.js").default().catch(console.error);
