import Link from "next/link";
import RegisterForm from "./RegisterForm";

export const metadata = {
  title: "Регистрация — YouTube Video Analyzer",
};

export default function RegisterPage() {
  return (
    <div className="page-frame">
      <header className="masthead">
        <h1>Регистрация</h1>
        <span className="tag">Создайте аккаунт, чтобы сохранять свои разборы</span>
      </header>

      <main className="inner">
        <RegisterForm />

        <div className="footer">
          <Link href="/">← Вернуться к разбору</Link>
        </div>
      </main>
    </div>
  );
}
