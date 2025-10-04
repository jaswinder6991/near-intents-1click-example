"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { NEAR } from "@near-js/tokens";
import { actionCreators } from "@near-js/transactions";
import app from "@/styles/app.module.css";
import styles from "@/styles/deposit.module.css";
import { useWalletSelector } from "@near-wallet-selector/react-hook";

const TGas = BigInt(1_000_000_000_000);

// Configure your Intents contract
const INTENTS_CONTRACT_ID = process.env.NEXT_PUBLIC_INTENTS_CONTRACT || "intents.near";

export default function DepositPage() {
    const { signedAccountId, getBalance, signAndSendTransactions } = useWalletSelector();

    const [balanceYocto, setBalanceYocto] = useState(0n);
    const [input, setInput] = useState("0.1"); // NEAR
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState(null);
    const [txOutcome, setTxOutcome] = useState(null);

    const isLoggedIn = !!signedAccountId;

    // Show balance as human-readable NEAR
    const balancePretty = useMemo(() => {
        try {
            return NEAR.toDecimal(balanceYocto);
        } catch {
            return "0";
        }
    }, [balanceYocto]);

    // Load balance using near.js helper
    useEffect(() => {
        if (!signedAccountId) {
            setBalanceYocto(0n);
            return;
        }

        (async () => {
            try {
                setStatus({ type: "info", text: "Fetching NEAR balance…" });
                console.log(signedAccountId);

                const amt = await getBalance(signedAccountId);

                setBalanceYocto(amt);
                setStatus(null);
            } catch (e) {
                console.error(e);
                setStatus({ type: "err", text: e?.message || "Failed to fetch balance" });
            }
        })();
    }, [signedAccountId]);

    const onMax = () => {
        try {
            const headroom = NEAR.toUnits("0.02");
            const spendable = balanceYocto > headroom ? balanceYocto - headroom : 0n;
            setInput(NEAR.toDecimal(spendable));
        } catch {
            // ignore
        }
    };

    const onDeposit = async () => {
        if (!isLoggedIn) {
            setStatus({ type: "err", text: "Please log in first." });
            return;
        }

        let yocto;
        try {
            yocto = NEAR.toUnits(input || "0"); // ✅ convert string → BigInt
        } catch {
            setStatus({ type: "err", text: "Invalid amount" });
            return;
        }

        if (yocto <= 0n) {
            setStatus({ type: "err", text: "Amount must be greater than 0" });
            return;
        }
        if (yocto >= balanceYocto) {
            setStatus({
                type: "err",
                text: `Insufficient balance. Your balance is ${balancePretty} N.`,
            });
            return;
        }

        setBusy(true);
        setStatus({ type: "info", text: "Preparing deposit transaction…" });

        try {
            const res = await signAndSendTransactions({
                transactions: [
                    {
                        signerId: signedAccountId, // optional, auto-filled if logged in
                        receiverId: "wrap.near",
                        actions: [
                            actionCreators.functionCall(
                                "near_deposit",
                                {},
                                10n * TGas,
                                yocto + NEAR.toUnits("0.00125") // ✅ BigInt math with yocto
                            ),
                            actionCreators.functionCall(
                                "ft_transfer_call",
                                {
                                    receiver_id: INTENTS_CONTRACT_ID,
                                    amount: yocto.toString(), // ✅ args must be string
                                    msg: signedAccountId,
                                },
                                50n * TGas,
                                1n
                            ),
                        ],
                    },
                ],
            });

            console.log("Tx result:", res);
            setStatus({ type: "ok", text: "Deposit transaction submitted!" });
        } catch (e) {
            console.error(e);
            setStatus({
                type: "err",
                text: e?.message || "Failed to submit deposit",
            });
        } finally {
            setBusy(false);
        }

    };

    return (
        <main className={app.main}>
            <div className={app.container}>
                <header className={styles.headerRow}>
                    <h1 className={styles.title}>Deposit NEAR → Intents (Multi-Token)</h1>
                    <div className={styles.rightHeader}>
                        <Link className="btn btn-outline-secondary btn-sm" href="/examples/tokens">
                            View Tokens
                        </Link>
                        <Link className="btn btn-outline-secondary btn-sm ms-2" href="/">
                            ← Back
                        </Link>
                    </div>
                </header>

                <section className={`${app.card} ${styles.card}`}>
                    <div className={styles.row}>
                        <div className={styles.label}>Connected Account</div>
                        <div className={styles.value}>
                            {isLoggedIn ? signedAccountId : <span className={styles.muted}>Not connected</span>}
                        </div>
                    </div>

                    <div className={styles.row}>
                        <div className={styles.label}>Network</div>
                        <div className={styles.value}>Mainnet</div>
                    </div>

                    <div className={styles.row}>
                        <div className={styles.label}>NEAR Balance</div>
                        <div className={styles.value}>
                            {isLoggedIn ? `${balancePretty} N` : <span className={styles.muted}>—</span>}
                            <button
                                type="button"
                                className="btn btn-link btn-sm ms-2 p-0 align-baseline"
                                onClick={onMax}
                                disabled={!isLoggedIn || balanceYocto === 0n}
                            >
                                Max
                            </button>
                        </div>
                    </div>

                    <div className={styles.formRow}>
                        <label className={styles.inputLabel} htmlFor="amount">
                            Amount to deposit (NEAR)
                        </label>
                        <div className={styles.inputGroup}>
                            <input
                                id="amount"
                                className={styles.input}
                                type="number"
                                step="0.0001"
                                min="0"
                                placeholder="0.10"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                disabled={!isLoggedIn || busy}
                            />
                            <button
                                type="button"
                                className={`btn btn-primary ${styles.actionBtn}`}
                                onClick={onDeposit}
                                disabled={!isLoggedIn || busy}
                            >
                                {busy ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" /> Depositing…
                                    </>
                                ) : (
                                    "Deposit"
                                )}
                            </button>
                        </div>
                        <div className={styles.hint}>
                            This sends native NEAR to <code>{INTENTS_CONTRACT_ID}</code> and mints the cross-chain asset.
                        </div>
                    </div>

                    {status && (
                        <div
                            className={
                                status.type === "ok"
                                    ? styles.noteOk
                                    : status.type === "err"
                                        ? styles.noteErr
                                        : styles.noteInfo
                            }
                        >
                            {status.text}
                        </div>
                    )}

                    {txOutcome && (
                        <details className={styles.txBox}>
                            <summary>Transaction Result</summary>
                            <pre className={styles.pre}>{JSON.stringify(txOutcome, null, 2)}</pre>
                        </details>
                    )}
                </section>
            </div>
        </main>
    );
}
