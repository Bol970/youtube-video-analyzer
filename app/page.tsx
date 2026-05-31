import AnalyzerForm from "./AnalyzerForm";

export default function Home() {
  return (
    <div className="page-frame">
      <header className="masthead">
        <div className="burst">NEW!</div>
        <h1>YouTube Video Analyzer</h1>
        <span className="tag">Транскрипт → ИИ-анализ за один клик</span>
      </header>

      <main className="inner">
        <AnalyzerForm />

        <div className="footer">
          Транскрипты —{" "}
          <a href="https://supadata.ai" target="_blank" rel="noreferrer">
            Supadata
          </a>{" "}
          · Анализ —{" "}
          <a href="https://openrouter.ai" target="_blank" rel="noreferrer">
            OpenRouter LLM
          </a>
          <br />
          Учебный проект курса «Разработка с AI на практике» · {new Date().getFullYear()}
        </div>
      </main>
    </div>
  );
}
