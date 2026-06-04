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
        <span className="tag">Создайте аккаунт, чтобы пользоваться анализатором</span>
      </header>

      <main className="inner">
        <RegisterForm />

        <div className="footer">
          <Link href="/">← Вернуться к анализатору</Link>
        </div>
      </main>
    </div>
  );
}
