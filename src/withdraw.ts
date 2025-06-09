import {
  GetExecutionStatusResponse,
  OneClickService,
  QuoteRequest,
} from "@defuse-protocol/one-click-sdk-typescript";

import { Account } from "@near-js/accounts";
import { JsonRpcProvider } from "@near-js/providers";
import { KeyPairSigner } from "@near-js/signers";
import {
  ACCOUNT_ID,
  ACCOUNT_PRIVATE_KEY,
  INTENTS_CONTRACT_ID,
} from "./constants";

async function withdraw(
  inputToken: string,
  outputToken: string,
  inputAmount: bigint
): Promise<void> {
  const provider = new JsonRpcProvider({
    url: "https://rpc.mainnet.fastnear.com",
  });

  const signer = KeyPairSigner.fromSecretKey(ACCOUNT_PRIVATE_KEY);

  const account = new Account(ACCOUNT_ID, provider, signer);

  const balance = BigInt(
    (await provider.callFunction(INTENTS_CONTRACT_ID, "mt_balance_of", {
      token_id: inputToken,
      account_id: account.accountId,
    })) as string
  );

  if (balance < inputAmount) {
    console.error(`Insufficient balance of ${inputToken} for swapping`);
    process.exit(1);
  }

  const deadline = new Date();
  deadline.setMinutes(deadline.getMinutes() + 5);

  // To-Do: handle errors
  const { quote } = await OneClickService.getQuote({
    dry: false,
    swapType: QuoteRequest.swapType.EXACT_INPUT,
    slippageTolerance: 100, // 1%
    depositType: QuoteRequest.depositType.INTENTS,
    originAsset: inputToken,
    destinationAsset: outputToken,
    amount: inputAmount.toString(),
    refundTo: account.accountId,
    refundType: QuoteRequest.refundType.INTENTS,
    recipient: "0x427F9620Be0fe8Db2d840E2b6145D1CF2975bcaD",
    recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
    deadline: deadline.toISOString(),
  });

  if (!quote.depositAddress) {
    console.error(
      `The invalid quote was returned from API, "depositAddress" is missing!`
    );
    process.exit(1);
  }

  console.log(`Fetched a swap quote from 1Click API`, quote);

  await account.callFunction({
    contractId: INTENTS_CONTRACT_ID,
    methodName: "mt_transfer",
    args: {
      token_id: inputToken,
      receiver_id: quote.depositAddress!,
      amount: quote.amountIn,
    },
    deposit: 1,
  });

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

withdraw(
  "nep141:eth.omft.near", // inputs as Ethereum
  "nep141:arb.omft.near", // outputs as Ethereum
  BigInt(1_000_000_000_000) // 1 000 000 000 000 wETH
);
