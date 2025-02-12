const RPC_URL = "https://solver-relay-v2.chaindefuser.com/rpc";

export async function fetchQuote(
  assetInput: string,
  amountInput: string,
  assetOutput: string
): Promise<any | undefined> {
  const body = {
    id: "dontcare",
    jsonrpc: "2.0",
    method: "quote",
    params: [
      {
        defuse_asset_identifier_in: assetInput,
        defuse_asset_identifier_out: assetOutput,
        exact_amount_in: String(amountInput),
      },
    ],
  };

  const response = await fetch(RPC_URL, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const json: any = await response.json();

  if (!response.ok) {
    throw new Error(
      `Request failed ${response.status} ${
        response.statusText
      } - ${JSON.stringify(json)}`
    );
  }

  const result = json.result;

  if (result === null) return undefined;

  return result.at(0);
}

export async function publishIntent(
  quoteHash: string,
  signedData: any
): Promise<any | undefined> {
  const body = {
    id: "dontcare",
    jsonrpc: "2.0",
    method: "publish_intent",
    params: [
      {
        quote_hashes: [quoteHash],
        signed_data: signedData,
      },
    ],
  };

  const response = await fetch(RPC_URL, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const json: any = await response.json();

  if (!response.ok) {
    throw new Error(
      `Request failed ${response.status} ${
        response.statusText
      } - ${JSON.stringify(json)}`
    );
  }

  const result = json.result;

  return result || undefined;
}

export async function fetchIntentStatus(
  intentHash: string
): Promise<any | undefined> {
  const body = {
    id: "dontcare",
    jsonrpc: "2.0",
    method: "get_status",
    params: [
      {
        intent_hash: intentHash,
      },
    ],
  };

  const response = await fetch(RPC_URL, {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
    },
  });

  const json: any = await response.json();

  if (!response.ok) {
    throw new Error(
      `Request failed ${response.status} ${
        response.statusText
      } - ${JSON.stringify(json)}`
    );
  }

  const result = json.result;

  return result || undefined;
}
