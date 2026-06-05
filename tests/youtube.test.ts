import { describe, it, expect } from "vitest";
import { extractVideoId, formatOffset } from "@/lib/youtube";

describe("extractVideoId", () => {
  const ID = "dQw4w9WgXcQ"; // валидный 11-символьный id

  it("принимает чистый 11-символьный id", () => {
    expect(extractVideoId(ID)).toBe(ID);
  });

  it("разбирает обычную ссылку watch?v=", () => {
    expect(extractVideoId(`https://www.youtube.com/watch?v=${ID}`)).toBe(ID);
  });

  it("разбирает короткую ссылку youtu.be", () => {
    expect(extractVideoId(`https://youtu.be/${ID}`)).toBe(ID);
  });

  it("разбирает /embed/, /shorts/, /live/, /v/", () => {
    expect(extractVideoId(`https://www.youtube.com/embed/${ID}`)).toBe(ID);
    expect(extractVideoId(`https://www.youtube.com/shorts/${ID}`)).toBe(ID);
    expect(extractVideoId(`https://www.youtube.com/live/${ID}`)).toBe(ID);
    expect(extractVideoId(`https://www.youtube.com/v/${ID}`)).toBe(ID);
  });

  it("работает без схемы и с www-доменом", () => {
    expect(extractVideoId(`youtube.com/watch?v=${ID}`)).toBe(ID);
    expect(extractVideoId(`youtube-nocookie.com/embed/${ID}`)).toBe(ID);
  });

  it("игнорирует лишние query-параметры", () => {
    expect(
      extractVideoId(`https://www.youtube.com/watch?v=${ID}&t=42s&list=PL123`)
    ).toBe(ID);
  });

  it("обрезает пробелы по краям", () => {
    expect(extractVideoId(`  https://youtu.be/${ID}  `)).toBe(ID);
  });

  it("возвращает null для мусора и не-YouTube ссылок", () => {
    expect(extractVideoId("")).toBeNull();
    expect(extractVideoId("   ")).toBeNull();
    expect(extractVideoId("просто текст")).toBeNull();
    expect(extractVideoId("https://vimeo.com/123456")).toBeNull();
    expect(extractVideoId(`https://notyoutube.com/watch?v=${ID}`)).toBeNull();
    expect(extractVideoId(`https://youtube.com.evil.test/watch?v=${ID}`)).toBeNull();
    expect(extractVideoId("https://www.youtube.com/")).toBeNull();
  });

  it("возвращает null для id неверной длины", () => {
    expect(extractVideoId("https://youtu.be/short")).toBeNull();
    expect(extractVideoId("https://www.youtube.com/watch?v=tooLongVideoId123")).toBeNull();
  });
});

describe("formatOffset", () => {
  it("форматирует менее часа как m:ss", () => {
    expect(formatOffset(0)).toBe("0:00");
    expect(formatOffset(5_000)).toBe("0:05");
    expect(formatOffset(65_000)).toBe("1:05");
    expect(formatOffset(600_000)).toBe("10:00");
  });

  it("форматирует час и больше как h:mm:ss", () => {
    expect(formatOffset(3_600_000)).toBe("1:00:00");
    expect(formatOffset(3_665_000)).toBe("1:01:05");
  });

  it("отбрасывает дробные миллисекунды вниз", () => {
    expect(formatOffset(5_999)).toBe("0:05");
  });
});
