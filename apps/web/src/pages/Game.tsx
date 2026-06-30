import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api, ApiError, type GameState, type LetterState } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { GameBoard } from "../components/game/GameBoard";
import { Keyboard } from "../components/game/Keyboard";
import { Toast } from "../components/ui/Toast";
import { Spinner } from "../components/ui/Spinner";

export default function Game() {
  const { user, logout } = useAuth();
  const [state, setState] = useState<GameState | null>(null);
  const [currentGuess, setCurrentGuess] = useState("");
  const [shake, setShake] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "info" | "error" | "success" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [wonRow, setWonRow] = useState<number | undefined>(undefined);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = (message: string, type: "info" | "error" | "success" = "info") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, type });
    toastTimer.current = setTimeout(() => setToast(null), 2200);
  };

  const letterStates = (): Record<string, LetterState> => {
    const map: Record<string, LetterState> = {};
    for (const attempt of state?.attempts ?? []) {
      attempt.guess.split("").forEach((l, i) => {
        const s = attempt.result[i];
        const cur = map[l];
        if (cur === "correct") return;
        if (s === "correct" || cur === undefined) map[l] = s;
        if (s === "present" && cur === "absent") map[l] = s;
      });
    }
    return map;
  };

  useEffect(() => {
    api.getToday().then((s) => setState(s)).catch(() => showToast("Erreur de chargement.", "error")).finally(() => setLoading(false));
  }, []);

  const handleKey = useCallback(
    async (key: string) => {
      // Bloque toute saisie si la partie est finie OU si un essai est en cours
      // d'envoi (sinon, sur une connexion lente, le joueur peut continuer à
      // taper/valider tant que le serveur n'a pas répondu).
      if (!state || state.status !== "in_progress" || submitting) return;

      if (key === "←") {
        setCurrentGuess((g) => g.slice(0, -1));
        return;
      }
      if (key === "ENTRÉE") {
        if (currentGuess.length < 5) { triggerShake(); showToast("5 lettres requises", "error"); return; }
        setSubmitting(true);
        try {
          const result = await api.submitGuess(currentGuess);
          setState((prev) => {
            if (!prev) return prev;
            const nextAttempts = [...prev.attempts, { guess: currentGuess, result: result.result }];
            if (result.status === "won") setWonRow(nextAttempts.length - 1);
            return { ...prev, attempts: nextAttempts, status: result.status };
          });
          setCurrentGuess("");
          if (result.status === "won") setTimeout(() => showToast("🎉 Bravo !", "success"), 1600);
          else if (result.status === "lost") setTimeout(() => showToast("Partie terminée.", "info"), 1600);
        } catch (e) {
          if (e instanceof ApiError && e.status === 400) {
            triggerShake(); showToast("Mot invalide", "error");
          } else if (e instanceof ApiError && e.status === 409) {
            showToast("Partie terminée.", "info");
          }
        } finally {
          setSubmitting(false);
        }
        return;
      }
      if (/^[a-z]$/.test(key) && currentGuess.length < 5) {
        setCurrentGuess((g) => g + key);
      }
    },
    [state, currentGuess, submitting],
  );

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 500);
  };

  const gameOver = state?.status === "won" || state?.status === "lost";
  const isDisabled = gameOver || loading || submitting;

  return (
    <div className="flex flex-col min-h-screen">
      {/* Skip link (RGAA) */}
      <a href="#main" className="skip-link">Aller au contenu</a>

      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-xl font-black tracking-tighter text-white">WORDL<span className="text-indigo-400">FR</span></span>
        </div>
        <nav aria-label="Navigation principale" className="flex items-center gap-4 text-sm">
          <Link to="/statistiques" className="text-slate-300 hover:text-white transition font-medium">Stats</Link>
          {user?.role === "admin" && (
            <Link to="/admin" className="text-amber-400 hover:text-amber-300 transition font-medium">Admin</Link>
          )}
          <button
            onClick={logout}
            className="text-slate-400 hover:text-white transition text-xs border border-slate-700 px-3 py-1.5 rounded-lg"
          >
            Déconnexion
          </button>
        </nav>
      </header>

      <main id="main" className="flex flex-col items-center flex-1">
        {/* Live status for screen readers */}
        <div aria-live="assertive" className="sr-only">
          {state?.status === "won" ? "Félicitations ! Vous avez trouvé le mot !" : ""}
          {state?.status === "lost" ? "Partie terminée. Vous n'avez pas trouvé le mot." : ""}
        </div>

        {loading && <Spinner />}

        {!loading && state && (
          <>
            <GameBoard
              attempts={state.attempts}
              currentGuess={currentGuess}
              maxAttempts={state.maxAttempts}
              shake={shake}
              wonRow={wonRow}
            />
            <Keyboard letterStates={letterStates()} onKey={handleKey} disabled={isDisabled} />
          </>
        )}

        {gameOver && (
          <div className="text-center mt-2 pb-4">
            <Link to="/statistiques" className="inline-block px-6 py-2.5 bg-indigo-500 hover:bg-indigo-400 text-white font-bold rounded-xl transition">
              Voir mes statistiques
            </Link>
          </div>
        )}
      </main>

      <Toast message={toast?.message ?? null} type={toast?.type} />
    </div>
  );
}
