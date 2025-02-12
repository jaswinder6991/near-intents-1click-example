import { fetchIntentStatus, fetchQuote, publishIntent } from "./rpc";
import {
  generateNonce,
  serializeIntent,
  signMessage,
  storePublicKeyForSigVerification,
} from "./intent";
import { ACCOUNT_ID, INTENTS_CONTRACT_ID } from "./constants";
import bs58 from "bs58";

async function main(): Promise<void> {
  const input = "nep141:wrap.near"; // NEAR tokens
  const amount = BigInt(1_000_000_000_000_000_000_000); // 0.001 NEAR
  const output = "nep141:sol.omft.near"; // SOLANA tokens

  try {
    await storePublicKeyForSigVerification();

    const quote = await fetchQuote(input, amount.toString(), output);

    if (!quote) throw new Error(`Quote wasn't found`);

    console.log(`Fetched quote for a swap`);

    const standard = "nep413";
    const message = {
      signer_id: ACCOUNT_ID,
      deadline: quote["expiration_time"],
      intents: [
        {
          intent: "token_diff",
          diff: {
            [quote["defuse_asset_identifier_in"]]: `-${quote["amount_in"]}`,
            [quote["defuse_asset_identifier_out"]]: `${quote["amount_out"]}`,
          },
        },
      ],
    };

    const messageStr = JSON.stringify(message);
    const nonce = await generateNonce();
    const recipient = INTENTS_CONTRACT_ID;
    const intent = serializeIntent(messageStr, recipient, nonce, standard);
    const { signature, publicKey } = signMessage(intent);

    console.log(`Signed payload of intent`);

    const signedData = {
      standard,
      payload: {
        message: messageStr,
        nonce,
        recipient,
      },
      signature: `ed25519:${bs58.encode(signature)}`,
      public_key: publicKey.toString(),
    };

    const result = await publishIntent(quote["quote_hash"], signedData);

    if (!result) throw new Error(`Failed to broadcast intent`);

    console.log(`Broadcasted intent for execution`);

    if (result["status"] === "FAILED")
      throw new Error(`Intent wasn't executed - ${result["reason"]}`);

    const intentHash = result["intent_hash"];

    if (!intentHash) throw new Error(`No intent hash received`);

    let attempts = 15;
    let lastResult;
    while (attempts > 0) {
      const result = await fetchIntentStatus(intentHash);
      lastResult = result;

      if (result.status === "SETTLED") {
        console.log(`Intent was settled successfully!`);
        process.exit(0);
        break;
      }

      // wait one second
      await new Promise((res) => setTimeout(res, 1_000));
      attempts -= 1;
    }

    throw new Error(
      `Intent hasn't been settled after 15 seconds - ${JSON.stringify(
        lastResult
      )}`
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message);
    } else {
      console.error(`Unexpected error - ${JSON.stringify(error)}`);
    }

    process.exit(1);
  }
}

main();
