import { QuoteRequest } from "@defuse-protocol/one-click-sdk-typescript";

import {
  getAccount,
  getAccountBalanceOfMultiToken,
  transferMultiTokenForQuote,
} from "./near";
import { getQuote, waitUntilQuoteExecutionCompletes } from "./intents";

// Loading environment variables
require("dotenv").config({ path: ".env" });

interface WithdrawOptions {
  inputToken: string;
  outputToken: string;
  inputAmount: bigint;
  receiverAddress: string;
  slippageTolerance: number;
}

async function withdraw({
  inputToken,
  outputToken,
  inputAmount,
  slippageTolerance,
  receiverAddress,
}: WithdrawOptions): Promise<void> {
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
      `Insufficient balance of ${inputToken} for withdrawing (required: ${inputAmount}, your: ${balance})`
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
    recipient: receiverAddress,
    recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
    deadline: deadline.toISOString(),
  });

  await transferMultiTokenForQuote(account, quote, inputToken);

  await waitUntilQuoteExecutionCompletes(quote);

  console.log(`Withdraw was settled successfully!`);
  console.log(
    `Check the updated balance at https://www.arbiscan.io/address/${receiverAddress}`
  );
}

withdraw({
  inputToken: "nep141:eth.omft.near",
  outputToken: "nep141:arb.omft.near",
  inputAmount: BigInt(3_000_000_000_000), // 3 * 10^12 wETH
  slippageTolerance: 10, // 0.1%
  receiverAddress: "0x427F9620Be0fe8Db2d840E2b6145D1CF2975bcaD",
}).catch((error: unknown) => {
  const { styleText } = require("node:util");

  if (error instanceof Error) {
    console.error(styleText("red", error.message));
  } else {
    console.error(styleText("red", JSON.stringify(error)));
  }
});
