import Link from "next/link";
import HistoryList from "./HistoryList";

export const metadata = {
  title: "Мои разборы — YouTube Video Analyzer",
};

export default function HistoryPage() {
  return (
    <div className="page-frame">
      <header className="masthead">
        <h1>Мои разборы</h1>
        <span className="tag">Видео, которые вы разобрали</span>
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
