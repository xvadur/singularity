import { CaptureParityForm } from "@/components/CaptureParityForm";
import { StatusParityCard } from "@/components/StatusParityCard";
import { ThreeBackdrop } from "@/components/effects/ThreeBackdrop.client";
import styles from "./page.module.css";

export default function Home() {
  const threeEnabled = process.env.NEXT_PUBLIC_ENABLE_THREE === "1";

  return (
    <div className={styles.pageShell}>
      {threeEnabled ? <ThreeBackdrop /> : <div className={styles.ambientGlow} aria-hidden />}
      <main className={styles.main}>
        <section className={styles.panel}>
          <p className={styles.kicker}>Iteration 2 Bootstrap</p>
          <h1>Next.js strangler slice wired to existing Jarvis API contracts.</h1>
          <p className={styles.meta}>
            Existing Express endpoints remain source of truth. Next route handlers currently proxy
            <code> /api/status </code> and <code>/api/capture</code>.
          </p>
        </section>

        <section className={styles.panel}>
          <h2>Parity Check: GET /api/status</h2>
          <StatusParityCard />
        </section>

        <section className={styles.panel}>
          <h2>Parity Check: POST /api/capture</h2>
          <CaptureParityForm />
        </section>

        <section className={styles.panel}>
          <h2>Three.js Baseline</h2>
          <p className={styles.meta}>
            Feature flag <code>NEXT_PUBLIC_ENABLE_THREE=1</code> enables a minimal canvas backdrop.
            Default state keeps visual parity and avoids UI risk.
          </p>
        </section>
      </main>
    </div>
  );
}
