"use client";

import { useEffect, useState } from "react";

const SPIN = ["|", "/", "-", "\\"];
const STAGES = [
  "Достаю транскрипт через Supadata",
  "Передаю текст нейросети",
  "Анализирую через нейросеть",
  "Формирую ответ",
];

/** Терминальный лоадер: ASCII-спиннер + бегущие точки + смена статуса. */
export default function Loader() {
  const [frame, setFrame] = useState(0);
  const [dots, setDots] = useState(1);
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const spin = setInterval(() => setFrame((f) => (f + 1) % SPIN.length), 110);
    const dot = setInterval(() => setDots((d) => (d % 3) + 1), 400);
    const stg = setInterval(
      () => setStage((s) => Math.min(s + 1, STAGES.length - 1)),
      3000
    );
    return () => {
      clearInterval(spin);
      clearInterval(dot);
      clearInterval(stg);
    };
  }, []);

  return (
    <div className="card bevel-out">
      <div className="terminal">
        <span className="spin">{SPIN[frame]}</span> {STAGES[stage]}
        {".".repeat(dots)}
        <span className="cursor">▮</span>
      </div>
      <p className="note">Длинное видео может обрабатываться до минуты.</p>
    </div>
  );
}
