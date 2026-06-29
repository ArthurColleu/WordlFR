"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { AdminWordForm } from "./AdminWordForm";
import { AdminWordTable } from "./AdminWordTable";

interface WordRow {
  id: string;
  date: string;
  word: string;
}

export default function AdminPage() {
  const [words, setWords] = useState<WordRow[]>([]);
  const router = useRouter();

  const load = useCallback(() => {
    fetch("/api/admin/words")
      .then((res) => res.json())
      .then((data: { words: WordRow[] }) => setWords(data.words ?? []));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogout = async () => {
    const supabase = getBrowserClient();
    await supabase.auth.signOut();
    router.push("/admin/login");
  };

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mots du jour</h1>
        <button type="button" onClick={handleLogout} className="text-sm underline">
          Déconnexion
        </button>
      </div>
      <AdminWordForm onAdded={load} />
      <AdminWordTable words={words} onChanged={load} />
    </main>
  );
}
