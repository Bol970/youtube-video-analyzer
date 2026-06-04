import Link from "next/link";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Вход — YouTube Video Analyzer",
};

export default function LoginPage() {
  return (
    <div className="page-frame">
      <header className="masthead">
        <h1>Вход</h1>
        <span className="tag">Войдите, чтобы сохранять свои разборы</span>
      </header>

      <main className="inner">
        <LoginForm />

        <div className="footer">
          <Link href="/">← Вернуться к разбору</Link>
        </div>
      </main>
    </div>
  );
}
