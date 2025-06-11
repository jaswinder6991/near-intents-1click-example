import { QuoteRequest } from "@defuse-protocol/one-click-sdk-typescript";

import {
  getAccount,
  getAccountBalanceOfMultiToken,
  transferMultiTokenForQuote,
} from "./account";
import { getQuote, waitUntilQuoteExecutionCompletes } from "./intents";
import { NEAR } from "@near-js/tokens";

// Loading environment variables
require("dotenv").config({ path: ".env" });

interface SwapOptions {
  inputToken: string;
  outputToken: string;
  inputAmount: bigint;
  slippageTolerance: number;
}

async function swap({
  inputToken,
  outputToken,
  inputAmount,
  slippageTolerance,
}: SwapOptions): Promise<void> {
  console.log(
    `You are about to exchange ${inputToken} tokens for ${outputToken}`
  );

  const account = getAccount();

  console.log(
    `Checking the balance of ${inputToken} for the account ${account.accountId}`
  );
  const balance = await getAccountBalanceOfMultiToken(account, inputToken);

  if (balance < inputAmount) {
    throw new Error(
      `Insufficient balance of ${inputToken} for swapping (required: ${inputAmount}, your: ${balance})`
    );
  }

  const deadline = new Date();
  deadline.setMinutes(deadline.getMinutes() + 5);

  const quote = await getQuote({
    dry: false,
    swapType: QuoteRequest.swapType.EXACT_INPUT,
    slippageTolerance: slippageTolerance,
    depositType: QuoteRequest.depositType.INTENTS,
    originAsset: inputToken,
    destinationAsset: outputToken,
    amount: inputAmount.toString(),
    refundTo: account.accountId,
    refundType: QuoteRequest.refundType.INTENTS,
    recipient: account.accountId,
    recipientType: QuoteRequest.recipientType.INTENTS,
    deadline: deadline.toISOString(),
  });

  await transferMultiTokenForQuote(account, quote, inputToken);

  await waitUntilQuoteExecutionCompletes(quote);

  console.log(`Swap was settled successfully!`);
}

swap({
  inputToken: "nep141:wrap.near",
  outputToken: "nep141:eth.omft.near",
  inputAmount: NEAR.toUnits("0.1"),
  slippageTolerance: 10, // 0.1%
}).catch((error: unknown) => {
  const { styleText } = require("node:util");

  if (error instanceof Error) {
    console.error(styleText("red", error.message));
  } else {
    console.error(styleText("red", JSON.stringify(error)));
  }
});
