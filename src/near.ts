import { Account } from "@near-js/accounts";
import { JsonRpcProvider } from "@near-js/providers";
import { actionCreators } from "@near-js/transactions";
import { KeyPairString } from "@near-js/crypto";
import { KeyPairSigner } from "@near-js/signers";
import { NEAR } from "@near-js/tokens";
import { Quote } from "@defuse-protocol/one-click-sdk-typescript";
import { INTENTS_CONTRACT_ID } from "./constants";
import { assert } from "console";

const TGas = BigInt(1_000_000_000_000);

export function getAccount() {
  const provider = new JsonRpcProvider({
    url: "https://rpc.mainnet.fastnear.com",
  });

  const privateKey = process.env.ACCOUNT_PRIVATE_KEY;
  if (!privateKey) throw new Error(`ACCOUNT_PRIVATE_KEY is missing in .env`);

  const signer = KeyPairSigner.fromSecretKey(privateKey as KeyPairString);

  const accountId = process.env.ACCOUNT_ID;
  if (!accountId) throw new Error(`ACCOUNT_ID is missing in .env`);

  return new Account(accountId, provider, signer);
}

export async function getAccountBalanceOfNear(
  account: Account
): Promise<bigint> {
  return await account.getBalance(NEAR);
}

export async function getAccountBalanceOfMultiToken(
  account: Account,
  token: string
): Promise<bigint> {
  const amount = await account.provider.callFunction(
    INTENTS_CONTRACT_ID,
    "mt_balance_of",
    {
      token_id: token,
      account_id: account.accountId,
    }
  );

  return BigInt(amount as string);
}

export async function depositNearAsMultiToken(
  account: Account,
  amount: bigint
): Promise<void> {
  console.log(
    `Creating and sending a transaction to deposit NEAR as multi-token`
  );

  const { transaction } = await account.signAndSendTransaction({
    receiverId: "wrap.near",
    actions: [
      actionCreators.functionCall("near_deposit", {}, 10n * TGas, amount + NEAR.toUnits("0.00125")),
      actionCreators.functionCall(
        "ft_transfer_call",
        {
          receiver_id: INTENTS_CONTRACT_ID,
          amount: amount.toString(),
          msg: account.accountId,
        },
        50n * TGas,
        1n
      ),
    ],
    waitUntil: "EXECUTED_OPTIMISTIC",
  });

  console.log(`Tx: https://nearblocks.io/txns/${transaction.hash}`);

  // wait until the transaction is included into finalized block
  await account.provider.viewTransactionStatus(
    transaction.hash,
    account.accountId,
    "INCLUDED_FINAL"
  );

  console.log(`Successfully deposited NEAR as multi-token`);
}

export async function transferMultiTokenForQuote(
  account: Account,
  quote: Quote,
  token: string
): Promise<void> {
  assert(quote.depositAddress, `Missing required field 'depositAddress'`);

  console.log(
    `Creating and sending a transaction to transfer ${token} to ${quote.depositAddress}`
  );

  const { transaction } = await account.signAndSendTransaction({
    receiverId: INTENTS_CONTRACT_ID,
    actions: [
      actionCreators.functionCall(
        "mt_transfer",
        {
          token_id: token,
          receiver_id: quote.depositAddress!,
          amount: quote.amountIn,
        },
        30n * TGas,
        1n
      ),
    ],
    waitUntil: "INCLUDED_FINAL",
  });

  console.log(`Tx: https://nearblocks.io/txns/${transaction.hash}`);

  // wait until the transaction is included into finalized block
  await account.provider.viewTransactionStatus(
    transaction.hash,
    account.accountId,
    "INCLUDED_FINAL"
  );

  console.log(`Successfully transferred ${token} to ${quote.depositAddress}`);
}
