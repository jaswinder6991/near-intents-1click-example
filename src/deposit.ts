import { NEAR } from "@near-js/tokens";
import {
  depositNearAsMultiToken,
  getAccount,
  getAccountBalanceOfNear,
} from "./near";

// Loading environment variables
require("dotenv").config({ path: ".env" });

interface DepositOptions {
  inputAmount: bigint;
}

async function deposit({ inputAmount }: DepositOptions): Promise<void> {
  console.log(`You are about to deposit NEAR as cross-chain asset on Near`);

  const account = getAccount();

  console.log(
    `Checking the balance of NEAR for the account ${account.accountId}`
  );
  const balance = await getAccountBalanceOfNear(account);

  if (balance <= inputAmount) {
    const minBalanceDecimal = NEAR.toDecimal(inputAmount);
    const accountBalanceDecimal = NEAR.toDecimal(balance);

    throw new Error(
      `Insufficient balance of NEAR for depositing (required: ${minBalanceDecimal}N, your: ${accountBalanceDecimal}N)`
    );
  }

  await depositNearAsMultiToken(account, inputAmount);
}

deposit({
  inputAmount: NEAR.toUnits("0.1"),
}).catch((error: unknown) => {
  const { styleText } = require("node:util");

  if (error instanceof Error) {
    console.error(styleText("red", error.message));
  } else {
    console.error(styleText("red", JSON.stringify(error)));
  }
});
