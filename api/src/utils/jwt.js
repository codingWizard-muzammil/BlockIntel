// src/utils/jwt.js
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

const createToken = (payload, expiresIn = "7D", options = {}) => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn,
    ...options,
  });
};

const verifyToken = (token) => {
  return jwt.verify(token, JWT_SECRET);
};

module.exports = {
  createToken,
  verifyToken,
};
