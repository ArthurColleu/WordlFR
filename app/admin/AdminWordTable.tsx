"use client";

import { useState } from "react";

interface WordRow {
  id: string;
  date: string;
  word: string;
}

export function AdminWordTable({
  words,
  onChanged,
}: {
  words: WordRow[];
  onChanged: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWord, setEditWord] = useState("");
  const [error, setError] = useState<string | null>(null);

  const startEdit = (row: WordRow) => {
    setError(null);
    setEditingId(row.id);
    setEditWord(row.word);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditWord("");
    setError(null);
  };

  const saveEdit = async (id: string) => {
    setError(null);
    const res = await fetch(`/api/admin/words/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ word: editWord }),
    });
    if (!res.ok) {
      setError("Mot invalide (doit être un mot de 5 lettres du dictionnaire).");
      return;
    }
    cancelEdit();
    onChanged();
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/admin/words/${id}`, { method: "DELETE" });
    onChanged();
  };

  return (
    <div className="flex flex-col gap-2">
      {error && (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      )}
      <table className="w-full border-collapse text-left">
        <thead>
          <tr>
            <th className="border-b p-2">Date</th>
            <th className="border-b p-2">Mot</th>
            <th className="border-b p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {words.map((row) => (
            <tr key={row.id}>
              <td className="border-b p-2">{row.date}</td>
              <td className="border-b p-2 uppercase">
                {editingId === row.id ? (
                  <input
                    type="text"
                    maxLength={5}
                    value={editWord}
                    onChange={(e) => setEditWord(e.target.value)}
                    aria-label={`Modifier le mot du ${row.date}`}
                    className="rounded border px-2 py-1 uppercase"
                  />
                ) : (
                  row.word
                )}
              </td>
              <td className="border-b p-2">
                {editingId === row.id ? (
                  <span className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(row.id)}
                      className="text-blue-600 underline"
                    >
                      Enregistrer
                    </button>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="text-gray-600 underline"
                    >
                      Annuler
                    </button>
                  </span>
                ) : (
                  <span className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(row)}
                      className="text-blue-600 underline"
                    >
                      Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(row.id)}
                      className="text-red-600 underline"
                    >
                      Supprimer
                    </button>
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
