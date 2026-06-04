import Link from "next/link";
import SubscriptionPlans from "../SubscriptionPlans";

export const metadata = {
  title: "Тарифы — YouTube Video Analyzer",
};

export default function PricingPage() {
  return (
    <div className="page-frame">
      <header className="masthead">
        <h1>Тарифы</h1>
        <span className="tag">Выберите план или вернитесь на бесплатный</span>
      </header>

      <main className="inner">
        <SubscriptionPlans reason="Выберите подходящий тариф. Вернуться на бесплатный можно в любой момент." />

        <div className="footer">
          <Link href="/">← Вернуться к разбору</Link>
        </div>
      </main>
    </div>
  );
}
