const CorCrud = require("../utils/CorCrud");
const { get, set, CACHE_CONFIG } = require("../utils/redis");
const { createToken } = require("../utils/jwt");
const authTTL = CACHE_CONFIG.ttlByType.auth;
const keyPrefix = CACHE_CONFIG.keyPrefixes.auth;
const userModel = new CorCrud("Users");

const createNonce = async ({ address, chain }) => {
  const id = await crypto.randomUUID();
  const key = `${keyPrefix}:${id}`;
  const value = { address, chain };
  set(key, value, authTTL);

  return { status: 200, json: { nonce: id } };
};

const verifyNonce = async ({ nonce }) => {
  const data = await get(`${keyPrefix}:${nonce}`);

  if (!data?.address || !data?.chain)
    return {
      json: { message: "Session may expire or not created" },
      status: 401,
    };
  const { address, chain } = data;

  const verifyToken = createToken({ address, chain });
  const refreshToken = createToken({ address, chain }, "1Y");

  const userData = await userModel.create({
    walletAddress: address,
    chain,
    verifyToken,
  });

  return {
    json: { message: `Wallet "${userData.walletAddress ?? ""}" authenticated` },
    status: 200,
  };
};

module.exports = { createNonce, verifyNonce };
