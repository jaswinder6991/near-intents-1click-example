import { TokenResponse } from "@defuse-protocol/one-click-sdk-typescript";
import { getSupportedTokens } from "./intents";

async function tokens(): Promise<void> {
  const supportedTokens = await getSupportedTokens();

  const grouppedBySymbol = new Map<string, TokenResponse[]>();

  for (const token of supportedTokens) {
    const tokensBySymbol = grouppedBySymbol.get(token.symbol) || [];

    tokensBySymbol.push(token);

    grouppedBySymbol.set(token.symbol, tokensBySymbol);
  }

  for (const [symbol, tokensGroup] of grouppedBySymbol.entries()) {
    console.log(`Token: ${symbol}`);
    console.table(tokensGroup, ["assetId", "blockchain"]);
    console.log(
      "================================================================"
    );
  }
}

tokens().catch((error: unknown) => {
  const { styleText } = require("node:util");

  if (error instanceof Error) {
    console.error(styleText("red", error.message));
  } else {
    console.error(styleText("red", JSON.stringify(error)));
  }
});
