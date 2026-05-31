"use client";

import { useEffect, useRef, useState } from "react";

interface Option {
  code: string;
  name: string;
}

/**
 * Кастомный выпадающий список в ретро-стиле: открывается прямо под полем,
 * внешний вид полностью под нашим контролем (в отличие от нативного <select>).
 * Поддерживает закрытие по клику вне, Esc и навигацию стрелками + Enter.
 */
export default function LangSelect({
  id,
  value,
  options,
  onChange,
}: {
  id?: string;
  value: string;
  options: Option[];
  onChange: (code: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.code === value) ?? options[0];

  // Закрытие по клику вне компонента
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  // При открытии подсветить текущий выбранный пункт
  useEffect(() => {
    if (open) {
      const idx = options.findIndex((o) => o.code === value);
      setActive(idx < 0 ? 0 : idx);
    }
  }, [open, value, options]);

  function choose(code: string) {
    onChange(code);
    setOpen(false);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        return;
      }
      setActive((a) => {
        const next = e.key === "ArrowDown" ? a + 1 : a - 1;
        return (next + options.length) % options.length;
      });
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (open) choose(options[active].code);
      else setOpen(true);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="cselect" ref={ref}>
      <button
        type="button"
        id={id}
        className="cselect-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKeyDown}
      >
        <span>{selected?.name}</span>
        <span className="cselect-arrow">▾</span>
      </button>

      {open && (
        <ul className="cselect-list" role="listbox" tabIndex={-1}>
          {options.map((o, i) => (
            <li
              key={o.code || "auto"}
              role="option"
              aria-selected={o.code === value}
              className={
                "cselect-option" +
                (i === active ? " active" : "") +
                (o.code === value ? " selected" : "")
              }
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(o.code)}
            >
              {o.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
