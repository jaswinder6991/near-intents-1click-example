import { BorshSchema, borshSerialize } from "borsher";
import { createHash, randomBytes } from "crypto";
import {
  Account,
  providers,
  Connection,
  InMemorySigner,
  KeyPair,
} from "near-api-js";
import { InMemoryKeyStore } from "near-api-js/lib/key_stores";
import {
  ACCOUNT_ID,
  ACCOUNT_PRIVATE_KEY,
  INTENTS_CONTRACT_ID,
} from "./constants";

const provider = new providers.JsonRpcProvider({
  url: "https://rpc.mainnet.near.org",
});

const keyPair = KeyPair.fromString(ACCOUNT_PRIVATE_KEY);

async function getAccount(): Promise<Account> {
  const keyStore = new InMemoryKeyStore();
  await keyStore.setKey("mainnet", ACCOUNT_ID, keyPair);

  const signer = new InMemorySigner(keyStore);

  const connection = new Connection("mainnet", provider, signer, "");

  return new Account(connection, ACCOUNT_ID);
}

async function isNonceUsed(nonce: string): Promise<boolean> {
  const account = await getAccount();

  return await account.viewFunction({
    contractId: INTENTS_CONTRACT_ID,
    methodName: "is_nonce_used",
    args: {
      account_id: account.accountId,
      nonce,
    },
  });
}

export async function generateNonce(): Promise<string> {
  const randomArray = randomBytes(32);

  const nonceString = randomArray.toString("base64");

  if (await isNonceUsed(nonceString)) {
    //this step can be skipped but if nonce is already used quote wont be taken into account
    return generateNonce();
  } else {
    return nonceString;
  }
}

export async function storePublicKeyForSigVerification(): Promise<void> {
  const account = await getAccount();
  const publicKey = await account.connection.signer.getPublicKey(
    account.accountId,
    "mainnet"
  );

  const hasPublicKey = await account.viewFunction({
    contractId: INTENTS_CONTRACT_ID,
    methodName: "has_public_key",
    args: {
      account_id: account.accountId,
      public_key: publicKey.toString(),
    },
  });

  if (hasPublicKey === true) return;

  console.warn(
    `Registering public key ${publicKey.toString()} of account ${
      account.accountId
    } for signature verification`
  );

  await account.functionCall({
    contractId: INTENTS_CONTRACT_ID,
    methodName: "add_public_key",
    args: {
      public_key: publicKey.toString(),
    },
    attachedDeposit: 1n,
  });
}

export function signMessage(message: Uint8Array) {
  return keyPair.sign(message);
}

const standardNumber = {
  ["nep413"]: 413,
};

const Nep413PayloadSchema = BorshSchema.Struct({
  message: BorshSchema.String,
  nonce: BorshSchema.Array(BorshSchema.u8, 32),
  recipient: BorshSchema.String,
  callback_url: BorshSchema.Option(BorshSchema.String),
});

export function serializeIntent(
  intentMessage: any,
  recipient: string,
  nonce: string,
  standard: "nep413"
): Buffer {
  const payload = {
    message: intentMessage,
    nonce: base64ToUint8Array(nonce),
    recipient,
  };
  const payloadSerialized = borshSerialize(Nep413PayloadSchema, payload);
  const baseInt = 2 ** 31 + standardNumber[standard];
  const baseIntSerialized = borshSerialize(BorshSchema.u32, baseInt);
  const combinedData = Buffer.concat([baseIntSerialized, payloadSerialized]);
  return createHash("sha256").update(combinedData).digest();
}

const base64ToUint8Array = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};
