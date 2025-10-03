import {
  GetExecutionStatusResponse,
  OneClickService,
  ApiError,
} from "@defuse-protocol/one-click-sdk-typescript";
import assert from "assert";

function logOneClickApiError(error, context) {
  if (error instanceof ApiError) {
    console.error(`${context}: HTTP ${error.status} - ${error.message}`);
  } else if (error instanceof Error) {
    console.error(`${context}: ${error.message}`);
  } else {
    console.error(`${context}: ${JSON.stringify(error)}`);
  }
}

export async function waitUntilQuoteExecutionCompletes(quote, onStatus) {
  let attempts = 20;
  const SUCCESS_STATUS =
    GetExecutionStatusResponse?.status?.SUCCESS ?? "SUCCESS";

  while (attempts > 0) {
    try {
      const result = await OneClickService.getExecutionStatus(quote.depositAddress);

      if (onStatus) onStatus(result.status); // push update to UI

      if (result.status === SUCCESS_STATUS) return result;
    } catch (error) {
      if (onStatus) onStatus("error");
    } finally {
      await new Promise((res) => setTimeout(res, 3_000));
      attempts -= 1;
    }
  }

  throw new Error(`Quote hasn't been settled after 60 seconds`);
}


async function safeGetQuote(requestBody) {
  try {
    console.log(requestBody);
    
    const { quote } = await OneClickService.getQuote(requestBody);
    return quote;
  } catch (error) {
    logOneClickApiError(error, `Failed to get a quote`);
    return undefined;
  }
}

export async function getQuote(requestBody) {
  console.log("Querying a quote from 1Click API");

  const quote = await safeGetQuote(requestBody);

  if (!quote) {
    throw new Error(`No quote received!`);
  }

  if (!quote.depositAddress) {
    throw new Error(
      `Quote missing 'depositAddress' field. If this wasn't intended, ensure the 'dry' parameter is set to false when requesting a quote.`
    );
  }

  console.log(
    `[>] Sending: ${quote.amountInFormatted} of ${requestBody.originAsset}`
  );
  console.log(
    `[<] Receiving: ${quote.amountOutFormatted} of ${requestBody.destinationAsset}`
  );

  return quote;
}

async function safeGetSupportedTokens() {
  try {
    return await OneClickService.getTokens();
  } catch (error) {
    logOneClickApiError(error, `Failed to get supported tokens`);
    return [];
  }
}

export async function getSupportedTokens() {
  const tokens = await safeGetSupportedTokens();

  if (tokens.length === 0) {
    throw new Error(`No tokens found!`);
  }

  return tokens;
}
