import { actionCreators } from "@near-js/transactions";
import { NEAR } from "@near-js/tokens";
import { INTENTS_CONTRACT_ID } from "./constants";

const TGas = BigInt(1_000_000_000_000);


export async function getAccountBalanceOfMultiToken(account, token) {
  const amount = await account.provider.callFunction(
    INTENTS_CONTRACT_ID,
    "mt_balance_of",
    {
      token_id: token,
      account_id: account.accountId,
    }
  );

  return BigInt(amount);
}

export async function depositNearAsMultiToken(account, amount) {
  console.log(`Creating and sending a transaction to deposit NEAR as multi-token`);

  const { transaction } = await account.signAndSendTransaction({
    receiverId: "wrap.near",
    actions: [
      actionCreators.functionCall(
        "near_deposit",
        {},
        10n * TGas,
        amount + NEAR.toUnits("0.00125")
      ),
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

  await account.provider.viewTransactionStatus(
    transaction.hash,
    account.accountId,
    "INCLUDED_FINAL"
  );

  console.log(`Successfully deposited NEAR as multi-token`);
}

export async function transferMultiTokenForQuote(account, quote, token) {
  if (!quote.depositAddress) {
    throw new Error(`Missing required field 'depositAddress'`);
  }

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
          receiver_id: quote.depositAddress,
          amount: quote.amountIn,
        },
        30n * TGas,
        1n
      ),
    ],
    waitUntil: "INCLUDED_FINAL",
  });

  console.log(`Tx: https://nearblocks.io/txns/${transaction.hash}`);

  await account.provider.viewTransactionStatus(
    transaction.hash,
    account.accountId,
    "INCLUDED_FINAL"
  );

  console.log(`Successfully transferred ${token} to ${quote.depositAddress}`);
}
