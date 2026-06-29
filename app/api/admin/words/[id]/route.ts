import { NextRequest, NextResponse } from "next/server";
import { getServiceRoleClient } from "@/lib/supabase/server";
import { isValidWord } from "@/lib/dictionary";
import { requireAdminSession } from "../auth";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const update: { date?: string; word?: string } = {};

  if (body?.date !== undefined) {
    if (!DATE_REGEX.test(body.date)) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
    update.date = body.date;
  }

  if (body?.word !== undefined) {
    const word = String(body.word).toLowerCase();
    if (!isValidWord(word)) {
      return NextResponse.json({ error: "invalid_input" }, { status: 400 });
    }
    update.word = word;
  }

  const supabase = getServiceRoleClient();
  const { data, error } = await supabase
    .from("daily_words")
    .update(update)
    .eq("id", params.id)
    .select("id, date, word")
    .single();

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  if (!(await requireAdminSession())) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = getServiceRoleClient();
  const { error } = await supabase.from("daily_words").delete().eq("id", params.id);

  if (error) {
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
