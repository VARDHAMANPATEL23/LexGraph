import { NextRequest, NextResponse } from "next/server";

const BASE = "https://api.dictionaryapi.dev/api/v2/entries/en";

export async function GET(req: NextRequest) {
  const word = req.nextUrl.searchParams.get("word");
  if (!word) {
    return NextResponse.json({ error: "word param required" }, { status: 400 });
  }

  const res = await fetch(`${BASE}/${encodeURIComponent(word.toLowerCase())}`);

  if (!res.ok) {
    return NextResponse.json(
      { error: "Word not found" },
      { status: res.status }
    );
  }

  const data = await res.json();
  return NextResponse.json(data);
}
