const { PrismaClient } = require("@prisma/client");
const { PrismaPg } = require("@prisma/adapter-pg");
const logger = require("./logger");

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for the database client");
}

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const connectDB = async () => {
  prisma
    .$connect()
    .then(() => logger.info("Database connected"))
    .catch((error) => {
      logger.error("Failed to connect to database", { error: error.message });
    });
};

module.exports = { prisma, connectDB };
