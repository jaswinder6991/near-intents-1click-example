"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getSupportedTokens } from "@/lib/intents"; // adjust if your path differs

import app from "@/styles/app.module.css";      // shared styles
import styles from "@/styles/tokens.module.css";       // tokens-only styles

export default function TokensPage() {
  const [groups, setGroups] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // chain -> badge class name
  const chainBadge = useMemo(
    () => ({
      near: styles.badgeNear,
      eth: styles.badgeEth,
      arb: styles.badgeArb,
      base: styles.badgeBase,
      op: styles.badgeOp,
      sol: styles.badgeSol,
      bsc: styles.badgeBsc,
      gnosis: styles.badgeGnosis,
      polygon: styles.badgePolygon,
      avalanche: styles.badgeAvalanche,
    }),
    []
  );

  useEffect(() => {
    (async () => {
      try {
        const supported = await getSupportedTokens();
        const grouped = supported.reduce((acc, t) => {
          (acc[t.symbol] ||= []).push(t);
          return acc;
        }, {});
        const sorted = Object.fromEntries(
          Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))
        );
        setGroups(sorted);
      } catch (e) {
        console.error(e);
        setError(e?.message ?? "Failed to load tokens");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <main className={app.main}>
      <div className={app.container}>
        <header className={styles.headerRow}>
          <h1 className={styles.title}>Supported Tokens</h1>
          <Link href="/" className="btn btn-outline-secondary btn-sm">← Back</Link>
        </header>

        {loading && <p className={styles.muted}>Loading tokens…</p>}
        {error && <p className="text-danger">{error}</p>}

        {!loading && !error && Object.entries(groups).map(([symbol, list]) => (
          <section key={symbol} className={`${app.card} ${styles.tokenCard}`}>
            <div className={styles.cardHead}>
              <div className={styles.symbol}>{symbol}</div>
              <div className={styles.count}>{list.length} representations</div>
            </div>

            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Asset ID</th>
                    <th className={styles.chainCol}>Chain</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((t, i) => (
                    <tr key={`${t.assetId}-${i}`}>
                      <td>
                        <code className={styles.assetId} title={t.assetId}>
                          {t.assetId}
                        </code>
                      </td>
                      <td className={styles.chainCol}>
                        <span
                          className={`${styles.badge} ${chainBadge[t.blockchain?.toLowerCase()] || styles.badgeGeneric}`}
                          title={t.blockchain}
                        >
                          {t.blockchain}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
