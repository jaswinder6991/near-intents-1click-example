import { getAccount } from "./near";
import { arbitrum } from "viem/chains";
import {
  getAccountBalanceOfEthereum,
  getEvmAccount,
  transferEthereumForQuote,
} from "./evm";
import { getQuote, waitUntilQuoteExecutionCompletes } from "./intents";
import { QuoteRequest } from "@defuse-protocol/one-click-sdk-typescript";

// Loading environment variables
require("dotenv").config({ path: ".env" });

interface DepositOptions {
  inputToken: string;
  outputToken: string;
  inputAmount: bigint;
  slippageTolerance: number;
}

const CHAIN = arbitrum;

async function deposit({
  inputToken,
  outputToken,
  inputAmount,
  slippageTolerance,
}: DepositOptions): Promise<void> {
  console.log(
    `You are about to deposit ETH from Arbitrum to a cross-chain asset ${outputToken} on Near`
  );

  const account = getAccount();
  const arbitrumAccount = getEvmAccount();

  console.log(
    `Checking the balance of ETH for the account ${arbitrumAccount.address}`
  );
  const balance = await getAccountBalanceOfEthereum(arbitrumAccount, CHAIN);

  if (balance < inputAmount) {
    throw new Error(
      `Insufficient balance of ETH for depositing (required: ${inputAmount}, your: ${balance})`
    );
  }

  const deadline = new Date();
  deadline.setMinutes(deadline.getMinutes() + 5);

  const quote = await getQuote({
    dry: false,
    swapType: QuoteRequest.swapType.EXACT_INPUT,
    slippageTolerance: slippageTolerance,
    depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
    originAsset: inputToken,
    destinationAsset: outputToken,
    amount: inputAmount.toString(),
    refundTo: account.accountId,
    refundType: QuoteRequest.refundType.INTENTS,
    recipient: account.accountId,
    recipientType: QuoteRequest.recipientType.INTENTS,
    deadline: deadline.toISOString(),
  });

  transferEthereumForQuote(arbitrumAccount, quote, CHAIN);

  await waitUntilQuoteExecutionCompletes(quote);

  console.log(`Arbitrum deposit was settled successfully!`);
}

deposit({
  inputToken: "nep141:arb.omft.near",
  outputToken: "nep141:eth.omft.near",
  inputAmount: BigInt(1_000_000_502_520_392),
  slippageTolerance: 10, // 0.1%
}).catch((error: unknown) => {
  const { styleText } = require("node:util");

  if (error instanceof Error) {
    console.error(styleText("red", error.message));
  } else {
    console.error(styleText("red", JSON.stringify(error)));
  }
});
