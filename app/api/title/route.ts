import { NextRequest, NextResponse } from "next/server";

// Возвращает название YouTube-видео по его id (через публичный oEmbed).
// Делается на сервере, чтобы обойти CORS и работать для уже сохранённых разборов.
export const runtime = "nodejs";

const ID_RE = /^[a-zA-Z0-9_-]{11}$/;

export async function GET(req: NextRequest) {
  const v = req.nextUrl.searchParams.get("v") || "";
  if (!ID_RE.test(v)) {
    return NextResponse.json({ error: "Некорректный id видео." }, { status: 400 });
  }

  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${v}&format=json`,
      { cache: "no-store" }
    );
    if (!res.ok) {
      return NextResponse.json({ title: null }, { status: 200 });
    }
    const data = await res.json();
    return NextResponse.json(
      { title: typeof data?.title === "string" ? data.title : null },
      { headers: { "Cache-Control": "public, max-age=86400" } }
    );
  } catch {
    return NextResponse.json({ title: null }, { status: 200 });
  }
}
