require("dotenv").config();
const http = require("node:http");
const app = require("./src/app");
const { connectDB } = require("./src/utils/db");
const { initRedis } = require("./src/utils/redis");
const { attachPlaygroundWalletWs } = require("./src/ws/playgroundWallet.ws");

const PORT = process.env.PORT || 3000;

async function main() {
  await initRedis();
  await connectDB();

  const server = http.createServer(app);
  attachPlaygroundWalletWs(server);

  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
main().catch((e) => {
  console.error(e);
  throw new Error(e);
  process.exit(1);
});
