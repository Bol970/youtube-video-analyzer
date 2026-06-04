import Link from "next/link";
import HistoryList from "./HistoryList";

export const metadata = {
  title: "Мои анализы — YouTube Video Analyzer",
};

export default function HistoryPage() {
  return (
    <div className="page-frame">
      <header className="masthead">
        <h1>Мои анализы</h1>
        <span className="tag">История выполненных анализов</span>
      </header>

      <main className="inner">
        <HistoryList />

        <div className="footer">
          <Link href="/">← Вернуться к анализатору</Link>
        </div>
      </main>
    </div>
  );
}
