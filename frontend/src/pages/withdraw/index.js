"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { actionCreators } from "@near-js/transactions";

import app from "@/styles/app.module.css";
import styles from "@/styles/withdraw.module.css";

import { useWalletSelector } from "@near-wallet-selector/react-hook";
import { getQuote, waitUntilQuoteExecutionCompletes } from "@/lib/intents";
import { INTENTS_CONTRACT_ID } from "@/config";
import { QuoteRequest } from "@defuse-protocol/one-click-sdk-typescript";
import { toAmountUnits } from "@/utils/utils";

const TGas = BigInt(1_000_000_000_000);


export default function WithdrawPage() {
    const { signedAccountId, signAndSendTransactions } = useWalletSelector();
    const isLoggedIn = !!signedAccountId;

    // Form state
    const [inputToken, setInputToken] = useState("nep141:eth.omft.near");
    const [outputToken, setOutputToken] = useState("nep141:arb.omft.near");
    const [amountStr, setAmountStr] = useState("0.000003"); // example
    const [receiver, setReceiver] = useState(""); // external chain address
    const [slippage, setSlippage] = useState(10); // basis points

    // Flow state
    const [busy, setBusy] = useState(false);
    const [status, setStatus] = useState(null);
    const [quote, setQuote] = useState(null);
    const [txResult, setTxResult] = useState(null);
    const [settled, setSettled] = useState(false);

    const canQuote = useMemo(
        () => isLoggedIn && inputToken && outputToken && amountStr && receiver,
        [isLoggedIn, inputToken, outputToken, amountStr, receiver]
    );

    async function onGetQuote() {
        if (!canQuote) return;


        let amount;
        try {

            amount = toAmountUnits(inputToken, amountStr);
            console.log("Get quote", amount);

            if (amount <= 0n) throw new Error("Amount must be > 0");
        } catch (e) {
            setStatus({ type: "err", text: e?.message || "Invalid amount" });
            return;
        }

        try {
            setBusy(true);
            setStatus({ type: "info", text: "Requesting withdraw quote…" });

            const deadline = new Date();
            deadline.setMinutes(deadline.getMinutes() + 5);

            const q = await getQuote({
                dry: false,
                swapType: QuoteRequest.swapType.EXACT_INPUT,
                slippageTolerance: Number(slippage),
                depositType: QuoteRequest.depositType.INTENTS,
                originAsset: inputToken,
                destinationAsset: outputToken,
                amount: amount.toString(),
                refundTo: signedAccountId,
                refundType: QuoteRequest.refundType.INTENTS,
                recipient: receiver,
                recipientType: QuoteRequest.recipientType.DESTINATION_CHAIN,
                deadline: deadline.toISOString(),
            });

            setQuote(q);
            setStatus({ type: "ok", text: "Quote ready. Review and execute withdraw." });
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

    async function onExecuteWithdraw() {
        if (!quote) return;
        if (!quote.depositAddress) {
            setStatus({ type: "err", text: "Quote missing deposit address." });
            return;
        }

        try {
            setBusy(true);
            setStatus({ type: "info", text: "Signing withdraw transfer…" });

            const res = await signAndSendTransactions({
                transactions: [{
                    signerId: signedAccountId,
                    receiverId: INTENTS_CONTRACT_ID,
                    actions: [
                        actionCreators.functionCall(
                            "mt_transfer",
                            {
                                token_id: inputToken,
                                receiver_id: quote.depositAddress,
                                amount: quote.amountIn,
                            },
                            30n * TGas,
                            1n
                        ),
                    ],
                }]
            });

            setTxResult(res);
            setStatus({ type: "info", text: "Transfer sent. Waiting for settlement…" });

            await waitUntilQuoteExecutionCompletes(quote);

            setSettled(true);
            setStatus({ type: "ok", text: "Withdraw settled successfully!" });
        } catch (e) {
            console.error(e);
            setStatus({ type: "err", text: e?.message || "Failed to withdraw" });
        } finally {
            setBusy(false);
        }
    }

    return (
        <main className={app.main}>
            <div className={app.container}>
                <header className={styles.headerRow}>
                    <h1 className={styles.title}>Withdraw from NEAR Intents</h1>
                    <div className={styles.rightHeader}>
                        <Link className="btn btn-outline-secondary btn-sm" href="/examples/tokens">View Tokens</Link>
                        <Link className="btn btn-outline-secondary btn-sm ms-2" href="/">← Back</Link>
                    </div>
                </header>

                {/* Form */}
                <section className={`${app.card} ${styles.card}`}>
                    <div className={styles.grid2}>
                        <div>
                            <label className={styles.label}>Input Token</label>
                            <input className={styles.input} value={inputToken} onChange={(e) => setInputToken(e.target.value)} />
                        </div>
                        <div>
                            <label className={styles.label}>Output Token</label>
                            <input className={styles.input} value={outputToken} onChange={(e) => setOutputToken(e.target.value)} />
                        </div>
                        <div>
                            <label className={styles.label}>Amount</label>
                            <input className={styles.input} value={amountStr} onChange={(e) => setAmountStr(e.target.value)} />
                        </div>
                        <div>
                            <label className={styles.label}>Receiver (external address)</label>
                            <input className={styles.input} value={receiver} onChange={(e) => setReceiver(e.target.value)} placeholder="0x..." />
                        </div>
                        <div>
                            <label className={styles.label}>Slippage (bp)</label>
                            <input className={styles.input} type="number" value={slippage} onChange={(e) => setSlippage(e.target.value)} />
                        </div>
                    </div>

                    <div className={styles.actions}>
                        <button className="btn btn-secondary" onClick={onGetQuote} disabled={!canQuote || busy}>
                            {busy ? <><span className="spinner-border spinner-border-sm me-2" /> Getting quote…</> : "Get Quote"}
                        </button>
                    </div>
                </section>

                {/* Quote */}
                {quote && (
                    <section className={`${app.card} ${styles.card}`}>
                        <h2 className={styles.subTitle}>Quote</h2>
                        <div className={styles.kvGrid}>
                            <div className={styles.kv}><div className={styles.k}>Send</div><div className={styles.v}>{quote.amountInFormatted} • {inputToken}</div></div>
                            <div className={styles.kv}><div className={styles.k}>Receive</div><div className={styles.v}>{quote.amountOutFormatted} • {outputToken}</div></div>
                            <div className={styles.kv}><div className={styles.k}>Deposit Address</div><div className={styles.v}><code>{quote.depositAddress}</code></div></div>
                            <div className={styles.kv}><div className={styles.k}>Expires</div><div className={styles.v}>{new Date(quote.deadline).toLocaleString()}</div></div>
                        </div>

                        <div className={styles.actions}>
                            <button className="btn btn-primary" onClick={onExecuteWithdraw} disabled={busy || !isLoggedIn}>
                                {busy ? <><span className="spinner-border spinner-border-sm me-2" /> Executing…</> : "Execute Withdraw"}
                            </button>
                        </div>

                        {status && (
                            <div className={status.type === "ok" ? styles.noteOk : status.type === "err" ? styles.noteErr : styles.noteInfo}>{status.text}</div>
                        )}
                        {txResult && <details className={styles.txBox}><summary>Wallet Transaction Result</summary><pre>{JSON.stringify(txResult, null, 2)}</pre></details>}
                        {settled && <div className={styles.noteOk}>Withdraw settled ✅</div>}
                    </section>
                )}
            </div>
        </main>
    );
}
