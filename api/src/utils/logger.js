const path = require("path");
const winston = require("winston");

const logsDir = path.join(__dirname, "../logs");

const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
        const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
        return `${timestamp} ${level.toUpperCase()} ${message}${extra}`;
    }),
);

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: logFormat,
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: path.join(logsDir, "bot.log"), maxsize: 10 * 1024 * 1024, maxFiles: 5 }),
    ],
});

module.exports = logger;
