// Contracts store their AI analysis in a separate `analyze` table (see
// prisma/schema.prisma), but the frontend's ApiContract type still expects
// `analysis`/`analyzedAt` flattened directly onto the contract object — this
// keeps that response shape stable regardless of storage layout.
function serializeContract({ analyze, ...contract }) {
  return {
    ...contract,
    analysis: analyze?.analysis ?? null,
    analyzedAt: analyze?.analyzedAt ?? null,
  };
}

module.exports = { serializeContract };
