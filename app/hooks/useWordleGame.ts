"use client";

import { useCallback, useEffect, useState } from "react";
import type { LetterState } from "@/lib/game";

export type GameStatus = "playing" | "won" | "lost";

export interface AttemptRecord {
  guess: string;
  result: LetterState[];
}

const MAX_ATTEMPTS = 6;
const RANK: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 };

export function computeLetterStates(
  attempts: AttemptRecord[]
): Record<string, LetterState> {
  const states: Record<string, LetterState> = {};
  for (const attempt of attempts) {
    for (let i = 0; i < attempt.guess.length; i++) {
      const letter = attempt.guess[i];
      const state = attempt.result[i];
      if (!states[letter] || RANK[state] > RANK[states[letter]]) {
        states[letter] = state;
      }
    }
  }
  return states;
}

function storageKey(date: string): string {
  return `wordle-progress-${date}`;
}

interface StoredProgress {
  date: string;
  attempts: AttemptRecord[];
  status: GameStatus;
}

export function useWordleGame() {
  const [date, setDate] = useState<string | null>(null);
  const [attempts, setAttempts] = useState<AttemptRecord[]>([]);
  const [status, setStatus] = useState<GameStatus>("playing");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/word")
      .then((res) => res.json())
      .then((data: { date: string }) => {
        setDate(data.date);
        const raw = localStorage.getItem(storageKey(data.date));
        if (raw) {
          try {
            const parsed: StoredProgress = JSON.parse(raw);
            setAttempts(parsed.attempts);
            setStatus(parsed.status);
          } catch {
            // Corrupted localStorage payload — ignore and start a fresh game.
          }
        }
      })
      .catch(() => {
        setError("Réessaie plus tard.");
      });
  }, []);

  const persist = useCallback(
    (next: { attempts: AttemptRecord[]; status: GameStatus }) => {
      if (!date) return;
      const payload: StoredProgress = { date, ...next };
      localStorage.setItem(storageKey(date), JSON.stringify(payload));
    },
    [date]
  );

  const submitGuess = useCallback(
    async (guess: string) => {
      setError(null);
      if (status !== "playing") return;
      if (guess.length !== 5) {
        setError("Le mot doit faire 5 lettres.");
        return;
      }

      // The server never returns the target word — only the colored result
      // and isCorrect. We do not send an attempt count (the 6-attempt limit is
      // enforced here, client-side).
      let data: { result: LetterState[]; isCorrect: boolean };
      try {
        const res = await fetch("/api/word", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guess }),
        });

        if (res.status === 400) {
          setError("Ce mot n'existe pas dans le dictionnaire.");
          return;
        }

        if (!res.ok) {
          setError("Réessaie plus tard.");
          return;
        }

        data = await res.json();
      } catch {
        setError("Réessaie plus tard.");
        return;
      }

      const nextAttempts = [...attempts, { guess, result: data.result }];
      let nextStatus: GameStatus = "playing";
      if (data.isCorrect) nextStatus = "won";
      else if (nextAttempts.length >= MAX_ATTEMPTS) nextStatus = "lost";

      setAttempts(nextAttempts);
      setStatus(nextStatus);
      persist({ attempts: nextAttempts, status: nextStatus });
    },
    [attempts, status, persist]
  );

  return { attempts, status, submitGuess, error };
}
