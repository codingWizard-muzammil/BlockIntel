// solc reports "infinite" for evm.gasEstimates.creation.totalCost when the
// creation cost can't be statically bounded (e.g. loops/dynamic data in the
// constructor) — Number("infinite") is NaN, so without this that string
// silently becomes the literal text "NaN" wherever it's displayed.
function formatGasEstimate(raw) {
  if (!raw) return null;
  if (String(raw).toLowerCase() === "infinite") return "Unbounded";
  const num = Number(raw);
  return Number.isFinite(num) ? num.toLocaleString() : String(raw);
}

module.exports = { formatGasEstimate };
