import { Quote } from "@defuse-protocol/one-click-sdk-typescript";
import assert from "assert";
import {
  Address,
  Chain,
  createPublicClient,
  createWalletClient,
  Hex,
  http,
  PrivateKeyAccount,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";

export function getEvmAccount(): PrivateKeyAccount {
  const privateKey = process.env.EVM_PRIVATE_KEY;
  if (!privateKey) throw new Error(`EVM_PRIVATE_KEY is missing in .env`);

  return privateKeyToAccount(privateKey as Hex);
}

export async function getAccountBalanceOfEthereum(
  account: PrivateKeyAccount,
  chain: Chain
): Promise<bigint> {
  const client = createPublicClient({
    chain: chain,
    transport: http(),
  });

  return client.getBalance(account);
}

export async function transferEthereumForQuote(
  account: PrivateKeyAccount,
  quote: Quote,
  chain: Chain
): Promise<void> {
  assert(quote.depositAddress, `Missing required field 'depositAddress'`);

  console.log(
    `Creating and sending a transaction to transfer ETH to ${quote.depositAddress}`
  );

  const client = createWalletClient({
    chain: chain,
    transport: http(),
  });

  const hash = await client.sendTransaction({
    account,
    to: quote.depositAddress as Address,
    value: BigInt(quote.amountIn),
  });

  if (chain.blockExplorers) {
    console.log(`Tx: ${chain.blockExplorers.default.url}/tx/${hash}`);
  } else {
    console.log(`Tx Hash: ${hash}`);
  }
}
