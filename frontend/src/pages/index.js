import Image from 'next/image';
import Link from 'next/link';

import NearLogo from '/public/near.svg';
import NextLogo from '/public/next.svg';
import styles from '@/styles/app.module.css';

export default function Home() {
  return (
    <main className={styles.main}>
      {/* Page container for consistent left/right padding */}
      <div className="container-xl px-3 px-md-4">

        {/* Hero */}
        <section className={`${styles.hero} text-center text-md-start`}>
          <div className={styles.heroInner}>
            {/* Left: Logos */}
            <div className={`${styles.heroLogos} mb-4 mb-md-0`}>
              <Image
                className={styles.logo}
                src={NearLogo}
                alt="NEAR Logo"
                width={165}
                height={42}
                priority
              />
              <span className={styles.plus}>+</span>
              <Image
                className={styles.logo}
                src={NextLogo}
                alt="Next.js Logo"
                width={174}
                height={35}
                priority
              />
            </div>

            {/* Right: Copy */}
            <div className={styles.heroContent}>
              <h1 className={`${styles.heroTitle} mb-3`}>
                NEAR Intents • 1Click API • Demo Frontend
              </h1>

              <p className={`${styles.heroSubtitle} mb-4`}>
                Learn and try the full flow: deposit on NEAR, swap on Intents, withdraw to Arbitrum,
                and deposit back—now with friendly pages for each step.
              </p>

              <div className="d-flex flex-wrap gap-2 justify-content-center justify-content-md-start">
                <Link href="/docs/overview" className="btn btn-light btn-lg px-4">
                  Read the Overview
                </Link>
                <Link href="/examples/get-started" className="btn btn-primary btn-lg px-4">
                  Get Started
                </Link>
              </div>
            </div>
          </div>
        </section>



        {/* What is this? */}
        <section className={`${styles.section} ${styles.card}`}>
          <h2 className="h4 mb-2">What is this?</h2>
          <p className="mb-0">
            This UI wraps the <strong>NEAR Intents 1Click API</strong> examples. It explains the
            concepts and gives you one-click pages to run each example with your own config.
          </p>
        </section>

        {/* How it works */}
        <section className={`${styles.section} ${styles.card}`}>
          <h2 className="h4 mb-3">How it works</h2>
          <ol className={`${styles.steps} mb-0`}>
            <li>
              <span className="badge bg-secondary me-2">1</span>
              <strong>Deposit</strong> NEAR to Intents as a cross-chain asset.
            </li>
            <li>
              <span className="badge bg-secondary me-2">2</span>
              <strong>Swap</strong> NEAR → ETH on NEAR via Intents (fast, single tx).
            </li>
            <li>
              <span className="badge bg-secondary me-2">3</span>
              <strong>Withdraw</strong> ETH to Arbitrum.
            </li>
            <li>
              <span className="badge bg-secondary me-2">4</span>
              <strong>Deposit back</strong> from Arbitrum → NEAR as ETH cross-chain asset.
            </li>
          </ol>
        </section>

        {/* Example Pages */}
        <section className={styles.grid}>
          <Link href="/tokens" className={styles.card}>
            <h2>View Multi-Token Assets <span>→</span></h2>
            <p>List NEAR Intents token representations and balances.</p>
          </Link>

          <Link href="/deposit" className={styles.card}>
            <h2>Example 1: Deposit <span>→</span></h2>
            <p>Convert NEAR to <code>nep141:wrap.near</code> on Intents.</p>
          </Link>

          <Link href="/swap" className={styles.card}>
            <h2>Example 2: Swap <span>→</span></h2>
            <p>Swap NEAR → ETH on NEAR using the 1Click API quote + solver.</p>
          </Link>

          <Link href="/withdraw" className={styles.card}>
            <h2>Example 3: Withdraw <span>→</span></h2>
            <p>Send ETH to Arbitrum and view the tx on the explorer.</p>
          </Link>

          {/* <Link href="/examples/deposit-arb" className={styles.card}>
            <h2>Example 4: Deposit from Arbitrum <span>→</span></h2>
            <p>Bring ETH back from Arbitrum into NEAR Intents.</p>
          </Link>

          <Link href="/docs/challenge" className={styles.card}>
            <h2>Challenge: Reverse Flow <span>→</span></h2>
            <p>Start on Arbitrum → swap for NEAR on Intents → withdraw to NEAR.</p>
          </Link> */}
        </section>

        {/* Helpful Links */}
        <section className={`${styles.section} ${styles.card} mb-4`}>
          <h2 className="h5 mb-2">Helpful links</h2>
          <ul className={styles.links}>
            <li>
              <a
                href="https://docs.near-intents.org/near-intents/integration/distribution-channels/1click-api#post-v0-quote"
                target="_blank"
                rel="noreferrer"
              >
                1Click API: Quote endpoint
              </a>
            </li>
            <li>
              <a href="https://app.near-intents.org/" target="_blank" rel="noreferrer">
                NEAR Intents Frontend
              </a>
            </li>
            <li>
              <a href="https://github.com/nearuaguild/near-intents-1click-example" target="_blank" rel="noreferrer">
                Example Scripts (repo)
              </a>
            </li>
          </ul>
        </section>

      </div>
    </main>
  );
}
