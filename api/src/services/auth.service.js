const CorCrud = require("../utils/CorCrud");
const { get, set, del, CACHE_CONFIG } = require("../utils/redis");
const { createToken } = require("../utils/jwt");
const { buildSignMessage } = require("../utils/siwe");
const { verifySignatureForChain } = require("../utils/verifySignature");
const authTTL = CACHE_CONFIG.ttlByType.auth;
const keyPrefix = CACHE_CONFIG.keyPrefixes.auth;
const userModel = new CorCrud("Users");

const createNonce = async ({ address, chain }) => {
  const id = await crypto.randomUUID();
  const key = `${keyPrefix}:${id}`;
  const value = { address, chain };
  await set(key, value, authTTL);

  return {
    status: 200,
    json: { nonce: id, message: buildSignMessage({ address, chain, nonce: id }) },
  };
};

const verifyNonce = async ({ nonce, signature }) => {
  const key = `${keyPrefix}:${nonce}`;
  const data = await get(key);

  if (!data?.address || !data?.chain)
    return {
      json: { message: "Session may expire or not created" },
      status: 401,
    };

  const { address, chain } = data;
  const message = buildSignMessage({ address, chain, nonce });

  if (!verifySignatureForChain(chain, { message, signature, address }))
    return { json: { message: "Invalid signature" }, status: 401 };

  await del(key);

  const accessToken = createToken({ address, chain });
  const refreshToken = createToken({ address, chain }, "1Y");

  const userData = await userModel.upsert(
    { walletAddress: address },
    { walletAddress: address, chain, verifyToken: accessToken },
    { chain, verifyToken: accessToken },
  );

  return {
    status: 200,
    json: {
      message: `Wallet "${userData.walletAddress}" authenticated`,
      accessToken,
      refreshToken,
      user: { walletAddress: userData.walletAddress, chain: userData.chain },
    },
  };
};

const getMe = async ({ address }) => {
  const userData = await userModel.findOne({ walletAddress: address });

  if (!userData) return { json: { message: "User not found" }, status: 404 };

  return {
    status: 200,
    json: { user: { walletAddress: userData.walletAddress, chain: userData.chain } },
  };
};

module.exports = { createNonce, verifyNonce, getMe };
