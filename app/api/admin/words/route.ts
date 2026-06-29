import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server";
import { isValidWord } from "@/lib/dictionary";
import { requireAdminSession } from "./auth";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function GET() {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("daily_words")
    .select("id, date, word")
    .order("date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ words: data });
}

export async function POST(request: NextRequest) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const date = body?.date;
  const word = typeof body?.word === "string" ? body.word.toLowerCase() : "";

  if (!DATE_REGEX.test(date ?? "") || !isValidWord(word)) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("daily_words")
    .insert({ date, word })
    .select("id, date, word")
    .single();

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
