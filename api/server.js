require("dotenv").config();
const app = require("./src/app");
const { connectDB } = require("./src/utils/db");
const { initRedis } = require("./src/utils/redis");

const PORT = process.env.PORT || 3000;

async function main() {
  await initRedis();
  await connectDB();

  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}
main().catch((e) => {
  console.error(e);
  throw new Error(e);
  process.exit(1);
});
