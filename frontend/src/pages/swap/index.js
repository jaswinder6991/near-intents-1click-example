"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { NEAR } from "@near-js/tokens";
import { actionCreators } from "@near-js/transactions";

import app from "@/styles/app.module.css";       // shared site-wide
import styles from "@/styles/swap.module.css";          // swap-only styles
import { useWalletSelector } from "@near-wallet-selector/react-hook";

import { getQuote, waitUntilQuoteExecutionCompletes } from "@/lib/intents";
import { INTENTS_CONTRACT_ID } from "@/config";
import { QuoteRequest } from "@defuse-protocol/one-click-sdk-typescript";
import { toAmountUnits } from "@/utils/utils";

const TGas = BigInt(1_000_000_000_000);

export default function SwapPage() {
    const {
        signedAccountId,
        signAndSendTransactions,
    } = useWalletSelector();

    const isLoggedIn = !!signedAccountId;

    // Form state
    const [inputToken, setInputToken] = useState("nep141:wrap.near");
    const [outputToken, setOutputToken] = useState("nep141:eth.omft.near");
    const [amountStr, setAmountStr] = useState("0.10"); // human NEAR for wrap.near
    const [slippage, setSlippage] = useState(10); // in bp (10 = 0.1%)

    // Flow state
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState(null);      // {type: 'ok'|'err'|'info', text}
    const [quote, setQuote] = useState(null);        // quote object from API
    const [txResult, setTxResult] = useState(null);  // wallet tx outcome
    const [settled, setSettled] = useState(false);

    const canQuote = useMemo(
        () => isLoggedIn && inputToken && outputToken && amountStr && Number(slippage) >= 0,
        [isLoggedIn, inputToken, outputToken, amountStr, slippage]
    );

    async function onGetQuote() {
        if (!canQuote) return;

        let amount;
        try {
            amount = toAmountUnits(inputToken, amountStr);
            if (amount <= 0n) throw new Error("Amount must be > 0");
        } catch (e) {
            console.log(e);
            
            setStatus({ type: "err", text: e?.message || "Invalid amount" });
            return;
        }

        try {
            setBusy(true);
            setStatus({ type: "info", text: "Requesting quote…" });

            const deadline = new Date();
            deadline.setMinutes(deadline.getMinutes() + 5);

            const q = await getQuote({
                dry: false,
                swapType: QuoteRequest.swapType.EXACT_INPUT,
                slippageTolerance: Number(slippage), // 10 = 0.1%
                depositType: QuoteRequest.depositType.INTENTS,
                originAsset: inputToken,
                destinationAsset: outputToken,
                amount: amount.toString(),
                refundTo: signedAccountId,
                refundType: QuoteRequest.refundType.INTENTS,          // INTENTS
                recipient: signedAccountId,
                recipientType: QuoteRequest.recipientType.INTENTS,       // INTENTS
                deadline: deadline.toISOString(),
            });

            setQuote(q);
            setStatus({ type: "ok", text: "Quote ready. Review and execute the transfer." });
            setTxResult(null);
            setSettled(false);
        } catch (e) {
            console.error(e);
            setStatus({ type: "err", text: e?.message || "Failed to fetch quote" });
            setQuote(null);
        } finally {
            setBusy(false);
        }
    }

    async function onExecuteTransfer() {
        if (!quote) return;
        if (!quote.depositAddress) {
            setStatus({ type: "err", text: "Quote is missing a deposit address." });
            return;
        }

        try {
            setBusy(true);
            setStatus({ type: "info", text: "Signing transfer (mt_transfer) to Intents…" });

            const res = await signAndSendTransactions({
                transactions: [{
                    signerId: signedAccountId, // optional, auto-filled if logged in
                    receiverId: INTENTS_CONTRACT_ID,
                    actions: [
                        actionCreators.functionCall(
                            "mt_transfer",
                            {
                                token_id: inputToken,
                                receiver_id: quote.depositAddress,
                                amount: quote.amountIn, // string from quote
                            },
                            30n * TGas, // 30 Tgas
                            1n                                // 1 yocto
                        ),
                    ],
                }]
            });

            setTxResult(res);
            setStatus({ type: "info", text: "Transfer sent. Waiting for settlement…" });

            // Poll solver status (same logic as your waitUntilQuoteExecutionCompletes)
            await waitUntilQuoteExecutionCompletes(quote, (statusStr) => {
                setStatus({ type: "info", text: `Current status: ${statusStr}` });
            });
            setSettled(true);
            setStatus({ type: "ok", text: "Swap settled successfully!" });

        } catch (e) {
            console.error(e);
            setStatus({ type: "err", text: e?.message || "Failed to execute transfer" });
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className={app.main}>
            <div className={app.container}>
                <header className={styles.headerRow}>
                    <h1 className={styles.title}>Swap on NEAR Intents</h1>
                    <div className={styles.rightHeader}>
                        <Link className="btn btn-outline-secondary btn-sm" href="/examples/tokens">
                            View Tokens
                        </Link>
                        <Link className="btn btn-outline-secondary btn-sm ms-2" href="/">
                            ← Back
                        </Link>
                    </div>
                </header>

                {/* Form Card */}
                <section className={`${app.card} ${styles.card}`}>
                    <div className={styles.grid2}>
                        {/* From */}
                        <div>
                            <label className={styles.label}>From (Intents token ID)</label>
                            <input
                                className={styles.input}
                                value={inputToken}
                                onChange={(e) => setInputToken(e.target.value)}
                                placeholder="nep141:wrap.near"
                                disabled={busy}
                            />
                        </div>

                        {/* To */}
                        <div>
                            <label className={styles.label}>To (Intents token ID)</label>
                            <input
                                className={styles.input}
                                value={outputToken}
                                onChange={(e) => setOutputToken(e.target.value)}
                                placeholder="nep141:eth.omft.near"
                                disabled={busy}
                            />
                        </div>

                        {/* Amount */}
                        <div>
                            <label className={styles.label}>Amount</label>
                            <div className={styles.inputRow}>
                                <input
                                    className={styles.input}
                                    type="text"
                                    inputMode="decimal"
                                    value={amountStr}
                                    onChange={(e) => setAmountStr(e.target.value)}
                                    disabled={busy}
                                />
                                <span className={styles.suffix}>
                                    {inputToken === "nep141:wrap.near" ? "NEAR" : "raw units"}
                                </span>
                            </div>
                            <div className={styles.hint}>
                                For <code>nep141:wrap.near</code>, the amount is in NEAR and is scaled to yocto automatically.
                            </div>
                        </div>

                        {/* Slippage */}
                        <div>
                            <label className={styles.label}>Slippage (bp)</label>
                            <input
                                className={styles.input}
                                type="number"
                                min="0"
                                value={slippage}
                                onChange={(e) => setSlippage(e.target.value)}
                                disabled={busy}
                            />
                            <div className={styles.hint}>10 bp = 0.1%</div>
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button
                            className="btn btn-secondary"
                            onClick={onGetQuote}
                            disabled={!canQuote || busy}
                        >
                            {busy ? (
                                <>
                                    <span className="spinner-border spinner-border-sm me-2" /> Getting quote…
                                </>
                            ) : (
                                "Get Quote"
                            )}
                        </button>
                    </div>
                </section>

                {/* Quote Card */}
                {quote && (
                    <section className={`${app.card} ${styles.card}`}>
                        <h2 className={styles.subTitle}>Quote</h2>
                        <div className={styles.kvGrid}>
                            <div className={styles.kv}>
                                <div className={styles.k}>Send</div>
                                <div className={styles.v}>{quote.amountInFormatted} • {inputToken}</div>
                            </div>
                            <div className={styles.kv}>
                                <div className={styles.k}>Receive</div>
                                <div className={styles.v}>{quote.amountOutFormatted} • {outputToken}</div>
                            </div>
                            <div className={styles.kv}>
                                <div className={styles.k}>Deposit Address</div>
                                <div className={styles.v}><code className={styles.code}>{quote.depositAddress}</code></div>
                            </div>
                            <div className={styles.kv}>
                                <div className={styles.k}>Expires</div>
                                <div className={styles.v}>{new Date(quote.deadline).toLocaleString()}</div>
                            </div>
                        </div>

                        <div className={styles.actions}>
                            <button
                                className="btn btn-primary"
                                onClick={onExecuteTransfer}
                                disabled={busy || !isLoggedIn}
                            >
                                {busy ? (
                                    <>
                                        <span className="spinner-border spinner-border-sm me-2" /> Executing…
                                    </>
                                ) : (
                                    "Execute Transfer"
                                )}
                            </button>
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

                        {txResult && (
                            <details className={styles.txBox}>
                                <summary>Wallet Transaction Result</summary>
                                <pre className={styles.pre}>{JSON.stringify(txResult, null, 2)}</pre>
                            </details>
                        )}

                        {settled && (
                            <div className={styles.noteOk}>
                                Swap settled successfully ✅
                            </div>
                        )}
                    </section>
                )}
            </div>
        </main>
    );
}
