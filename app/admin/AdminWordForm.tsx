"use client";

import { useState } from "react";

export function AdminWordForm({ onAdded }: { onAdded: () => void }) {
  const [date, setDate] = useState("");
  const [word, setWord] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/admin/words", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, word }),
    });
    if (!res.ok) {
      setError("Date ou mot invalide (le mot doit être dans le dictionnaire).");
      return;
    }
    setDate("");
    setWord("");
    onAdded();
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <label className="flex flex-col gap-1">
        Date
        <input
          type="date"
          required
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded border px-2 py-1"
        />
      </label>
      <label className="flex flex-col gap-1">
        Mot
        <input
          type="text"
          required
          maxLength={5}
          value={word}
          onChange={(e) => setWord(e.target.value)}
          className="rounded border px-2 py-1 uppercase"
        />
      </label>
      <button type="submit" className="rounded bg-blue-600 px-3 py-2 text-white">
        Ajouter
      </button>
      {error && <p role="alert" className="text-red-600">{error}</p>}
    </form>
  );
}
