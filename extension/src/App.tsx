import { useEffect, useState } from "react";

type ApiState = "checking" | "online" | "offline";

const features = [
  ["PriceTrace", "Reveal new fees and calculate the real price increase."],
  ["Add-on Check", "Find optional paid services selected by default."],
  ["Renewal Check", "Expose when a free trial becomes a recurring charge."],
] as const;

export default function App() {
  const [apiState, setApiState] = useState<ApiState>("checking");

  useEffect(() => {
    fetch("http://127.0.0.1:8000/health")
      .then((response) => {
        if (!response.ok) throw new Error("API unavailable");
        setApiState("online");
      })
      .catch(() => setApiState("offline"));
  }, []);

  return (
    <main className="shell">
      <nav>
        <div className="brand"><span>F</span> FairFlow AI</div>
        <div className={`status ${apiState}`}>{apiState}</div>
      </nav>

      <section className="hero">
        <p className="eyebrow">DAY 1 · FOUNDATION</p>
        <h1>See the real cost<br />before you click.</h1>
        <p className="lede">
          FairFlow compares each checkout step and explains price, add-on,
          and subscription changes with visible evidence.
        </p>
      </section>

      <section className="features" aria-label="MVP features">
        {features.map(([title, description], index) => (
          <article key={title}>
            <div className="number">0{index + 1}</div>
            <h2>{title}</h2>
            <p>{description}</p>
          </article>
        ))}
      </section>

      <footer>
        <span>Private by default</span>
        <span>Evidence with every warning</span>
        <span>Uncertainty made visible</span>
      </footer>
    </main>
  );
}

