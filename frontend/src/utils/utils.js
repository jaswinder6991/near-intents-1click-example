import { NEAR } from "@near-js/tokens";

// parse a human amount (e.g. "0.001") to smallest units given decimals
export function parseUnits(amountStr, decimals) {
  const s = String(amountStr).trim();
  if (!/^\d*(\.\d*)?$/.test(s)) throw new Error("Invalid numeric amount");

  let [intPart = "0", fracPart = ""] = s.split(".");
  if (fracPart.length > decimals) {
    // too many decimal places for this token
    throw new Error(`Amount has more than ${decimals} decimals`);
  }
  // pad/truncate fractional part to exactly 'decimals'
  const frac = (fracPart + "0".repeat(decimals)).slice(0, decimals);

  // combine and remove leading zeros
  const combined = (intPart + frac).replace(/^0+(?=\d)/, "") || "0";
  return BigInt(combined);
}

// map a few known tokens to their decimals (adjust/extend as needed)
export  const TOKEN_DECIMALS = {
  "nep141:wrap.near": 24,      // NEAR
  "nep141:eth.omft.near": 18,  // wETH style
  "nep141:arb.omft.near": 18,  // example
  // ...add others from metadata
};

// your converter
export  function toAmountUnits(assetId, amountStr) {
  // Use NEAR SDK for NEAR (already handles 24 decimals)
  if (assetId === "nep141:wrap.near") {
    return NEAR.toUnits(amountStr);
  }
  const decimals = TOKEN_DECIMALS[assetId] ?? 18; // sensible default
  return parseUnits(amountStr, decimals);
}
