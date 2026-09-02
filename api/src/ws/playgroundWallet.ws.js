const { WebSocketServer } = require("ws");
const { ethers } = require("ethers");
const { verifyToken } = require("../utils/jwt");
const { CHAIN_RPC_URLS } = require("../constants/chains");
const { derivePlaygroundWallet } = require("../utils/playgroundWallet");
const CorCrud = require("../utils/CorCrud");
const logger = require("../utils/logger");

const contractModel = new CorCrud("contracts");
const projectModel = new CorCrud("projects");

const WS_PATH = "/v1/ws/playground-wallet";

// One JsonRpcProvider (and one "block" listener) per chain, shared across
// every connected client, rather than opening a node connection per browser
// tab. A hardhat node mines a block on every tx, so "new block" is exactly
// "a wallet's balance may have changed" — cheaper and more accurate than
// polling on a timer.
const providersByChain = new Map();
// chain -> Map<lowercased wallet address, Set<ws>>
const subscribersByChain = new Map();
// chain -> Map<lowercased wallet address, last balance string sent>
const lastBalanceByChain = new Map();

function getProvider(chain) {
  let provider = providersByChain.get(chain);
  if (provider) return provider;

  provider = new ethers.JsonRpcProvider(CHAIN_RPC_URLS[chain]);
  provider.on("block", () => {
    onBlock(chain).catch((error) => {
      logger.error("Playground wallet block watcher failed", { error: error.message, chain });
    });
  });
  providersByChain.set(chain, provider);
  return provider;
}

async function onBlock(chain) {
  const subscribers = subscribersByChain.get(chain);
  if (!subscribers || subscribers.size === 0) return;

  const provider = providersByChain.get(chain);
  const lastBalances = lastBalanceByChain.get(chain);

  await Promise.all(
    [...subscribers.entries()].map(async ([address, sockets]) => {
      const balance = ethers.formatEther(await provider.getBalance(address));
      if (lastBalances.get(address) === balance) return;
      lastBalances.set(address, balance);

      const payload = JSON.stringify({ type: "balance", address, balance });
      sockets.forEach((ws) => {
        if (ws.readyState === ws.OPEN) ws.send(payload);
      });
    }),
  );
}

function subscribe(chain, address, ws) {
  const lower = address.toLowerCase();
  if (!subscribersByChain.has(chain)) subscribersByChain.set(chain, new Map());
  if (!lastBalanceByChain.has(chain)) lastBalanceByChain.set(chain, new Map());

  const subscribers = subscribersByChain.get(chain);
  if (!subscribers.has(lower)) subscribers.set(lower, new Set());
  subscribers.get(lower).add(ws);
}

function unsubscribe(chain, address, ws) {
  const lower = address.toLowerCase();
  const subscribers = subscribersByChain.get(chain);
  const sockets = subscribers?.get(lower);
  if (!sockets) return;

  sockets.delete(ws);
  if (sockets.size === 0) {
    subscribers.delete(lower);
    lastBalanceByChain.get(chain)?.delete(lower);
  }
}

// Re-derives the same (contract -> project -> chain -> wallet) chain the
// REST endpoints use, so a socket can only ever watch the caller's own
// playground wallet for a contract they own.
async function resolvePlaygroundWallet(contractId, ownerAddress) {
  const contract = await contractModel.findOne({ id: contractId });
  if (!contract || contract.ownerAddress !== ownerAddress) return null;

  const project = await projectModel.findOne({ id: contract.projectId });
  if (!project || !CHAIN_RPC_URLS[project.chain]) return null;

  return { chain: project.chain, address: derivePlaygroundWallet(ownerAddress, project.chain).address };
}

// Attaches a WebSocket upgrade handler to the shared http.Server. The
// browser WebSocket API can't set an Authorization header, so the access
// token travels as a query param instead, same as the contract/wallet it
// wants to watch.
function attachPlaygroundWalletWs(server) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url, "http://localhost");
    if (url.pathname !== WS_PATH) {
      socket.destroy();
      return;
    }

    let ownerAddress;
    try {
      ({ address: ownerAddress } = verifyToken(url.searchParams.get("token")));
    } catch {
      socket.destroy();
      return;
    }

    const contractId = url.searchParams.get("contractId");
    if (!contractId) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, { ownerAddress, contractId });
    });
  });

  wss.on("connection", async (ws, { ownerAddress, contractId }) => {
    const resolved = await resolvePlaygroundWallet(contractId, ownerAddress).catch((error) => {
      logger.error("Failed to resolve playground wallet for ws", { error: error.message, contractId });
      return null;
    });
    if (!resolved) {
      ws.close(4004, "Contract not found or not deployed");
      return;
    }

    const { chain, address } = resolved;
    getProvider(chain);
    subscribe(chain, address, ws);

    ws.on("close", () => unsubscribe(chain, address, ws));
    ws.on("error", () => unsubscribe(chain, address, ws));
  });

  return wss;
}

module.exports = { attachPlaygroundWalletWs };
