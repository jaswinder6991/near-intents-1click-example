import {
  GetExecutionStatusResponse,
  OneClickService,
  QuoteRequest,
} from "@defuse-protocol/one-click-sdk-typescript";

import { Account } from "@near-js/accounts";
import { JsonRpcProvider } from "@near-js/providers";
import { KeyPairSigner } from "@near-js/signers";
import { ACCOUNT_ID, ACCOUNT_PRIVATE_KEY } from "./constants";
import { NEAR } from "@near-js/tokens";

async function deposit(
  inputToken: string,
  outputToken: string,
  inputAmount: bigint
): Promise<void> {
  const provider = new JsonRpcProvider({
    url: "https://rpc.mainnet.fastnear.com",
  });

  const signer = KeyPairSigner.fromSecretKey(ACCOUNT_PRIVATE_KEY);

  const account = new Account(ACCOUNT_ID, provider, signer);

  const balance = await account.getBalance(NEAR);

  if (balance <= inputAmount) {
    console.error(
      `Insufficient balance of NEAR for depositing (must be greater than ${NEAR.toDecimal(
        inputAmount
      )}N)`
    );
    process.exit(1);
  }

  const deadline = new Date();
  deadline.setMinutes(deadline.getMinutes() + 5);

  const { quote } = await OneClickService.getQuote({
    dry: false,
    swapType: QuoteRequest.swapType.EXACT_INPUT,
    slippageTolerance: 50, // 0.5%
    depositType: QuoteRequest.depositType.ORIGIN_CHAIN,
    originAsset: inputToken,
    destinationAsset: outputToken,
    amount: inputAmount.toString(),
    refundTo: account.accountId,
    refundType: QuoteRequest.refundType.ORIGIN_CHAIN,
    recipient: account.accountId,
    recipientType: QuoteRequest.recipientType.INTENTS,
    deadline: deadline.toISOString(),
  });

  if (!quote.depositAddress) {
    console.error(
      `The invalid quote was returned from API, "depositAddress" is missing!`
    );
    process.exit(1);
  }

  console.log(`Fetched a swap quote from 1Click API`, quote);

  const { transaction } = await account.transfer({
    receiverId: quote.depositAddress!,
    amount: quote.amountIn,
    token: NEAR,
  });

  console.log("tx", transaction);

  await provider.viewTransactionStatus(
    transaction.hash,
    account.accountId,
    "FINAL"
  );

  const { status } = await OneClickService.submitDepositTx({
    depositAddress: quote.depositAddress!,
    txHash: transaction.hash,
  });

  console.log(`Submitted deposit transaction with status ${status}`);

  let attempts = 20;
  let lastResult;
  while (attempts > 0) {
    const result = await OneClickService.getExecutionStatus(
      quote.depositAddress!
    );

    lastResult = result;

    if (result.status === GetExecutionStatusResponse.status.SUCCESS) {
      console.log(`Intent was settled successfully!`);
      process.exit(0);
    }

    console.log(`Current status is ${result.status}`);

    // wait three second
    await new Promise((res) => setTimeout(res, 3_000));
    attempts -= 1;
  }

  throw new Error(
    `Intent hasn't been settled after 15 seconds - ${JSON.stringify(
      lastResult
    )}`
  );
}

deposit(
  "nep141:wrap.near", // inputs as Near
  "nep141:btc.omft.near", // outputs as Bitcoin
  NEAR.toUnits("0.001") // 0.001 NEAR
);
