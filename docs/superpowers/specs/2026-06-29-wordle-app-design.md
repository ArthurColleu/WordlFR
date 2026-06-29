# Wordle quotidien — Design

Date : 2026-06-29

## Objectif

Application web type Wordle (mot de 5 lettres, 1 mot par jour déterminé par la date, 6 essais), avec une interface d'administration pour gérer les mots du jour, déployée sur Vercel avec Supabase comme backend.

## Stack

- Next.js 14 (App Router), TypeScript
- Tailwind CSS
- Supabase (Postgres + Supabase Auth pour l'admin)
- Déploiement Vercel
- Vitest pour les tests unitaires

## Architecture / structure de dossiers

```
app/
  page.tsx                     # Jeu Wordle (page d'accueil)
  admin/
    page.tsx                   # Dashboard admin (liste + CRUD des mots)
    login/page.tsx             # Connexion admin (Supabase Auth)
  api/
    word/route.ts              # GET: info du jour (sans le mot) ; POST: valide un essai côté serveur
    admin/words/route.ts       # GET/POST liste+création de mots (protégé)
    admin/words/[id]/route.ts  # PATCH/DELETE (protégé)
lib/
  supabase/
    server.ts                  # client Supabase côté serveur (service role)
    client.ts                  # client Supabase côté navigateur (anon key)
  dictionary.ts                # liste statique des mots valides (5 lettres, sans accents)
  game.ts                      # logique pure : evaluateGuess(guess, target)
middleware.ts                  # protège /admin/* (vérifie session Supabase)
supabase/
  migrations/0001_init.sql     # table daily_words + policies RLS
README.md
```

## Anti-triche

Le mot du jour n'est jamais envoyé au client tel quel. Le client envoie son essai à `POST /api/word`, le serveur compare au mot cible et renvoie uniquement le résultat coloré par lettre (`correct` / `present` / `absent`) ainsi que `isCorrect`. Le mot cible n'est révélé au client que si la partie est gagnée, ou si les 6 essais sont épuisés sans succès.

## Modèle de données (Supabase Postgres)

```sql
create table daily_words (
  id uuid primary key default gen_random_uuid(),
  date date not null unique,
  word varchar(5) not null,
  created_at timestamptz default now()
);

alter table daily_words enable row level security;

-- Aucune lecture publique : seul le service role (utilisé côté serveur) peut lire.
-- Les admins authentifiés (Supabase Auth) ont un accès CRUD complet via les Route Handlers
-- qui vérifient la session puis utilisent le service role.
```

Pas de table `admin_users` custom : les comptes admin sont gérés par Supabase Auth (`auth.users`), créés manuellement (dashboard Supabase ou script one-off), pas d'inscription publique.

## Dictionnaire

`lib/dictionary.ts` exporte un tableau statique de quelques milliers de mots français de 5 lettres, en minuscules sans accents. Utilisé pour :
1. Valider qu'un essai du joueur est un mot réel (sinon, erreur, essai non consommé).
2. Choisir un mot de fallback déterministe (hash de la date) si aucune entrée n'existe dans `daily_words` pour le jour courant, ou si Supabase est injoignable.

## Logique de jeu

`lib/game.ts` :
```ts
type LetterState = 'correct' | 'present' | 'absent';
function evaluateGuess(guess: string, target: string): LetterState[]
```
Algorithme en deux passes : (1) marquer les positions exactes ; (2) parmi les lettres restantes, marquer `present` en respectant le nombre d'occurrences disponibles dans `target` (gère correctement les lettres dupliquées).

## API

**`POST /api/word`** — body `{ guess: string }` :
1. Vérifie `guess` : 5 lettres, présent dans `dictionary.ts` → sinon `400 { error: "invalid_word" }`.
2. Récupère le mot du jour (lookup par date ; fallback déterministe si absent ou Supabase indisponible).
3. Calcule `evaluateGuess`, renvoie `{ result: LetterState[], isCorrect: boolean }`.
4. Révèle le mot cible uniquement si `isCorrect === true`, ou via un champ `revealedWord` si c'est le 6e essai raté.

**`GET /api/word`** : renvoie `{ date: string }` (jamais le mot), utilisé par le client pour détecter un changement de jour (reset à minuit).

**`app/api/admin/words/route.ts`** (GET liste, POST création) et **`app/api/admin/words/[id]/route.ts`** (PATCH, DELETE) : toutes vérifient la session Supabase côté serveur avant d'agir ; utilisent le service role, jamais exposé au client.

## Persistance côté client

État du jeu (essais tentés + résultats reçus du serveur) gardé en mémoire React et persisté dans `localStorage` sous une clé incluant la date du jour (ex. `wordle-progress-2026-06-29`). Un nouveau jour démarre donc automatiquement une nouvelle clé / partie vierge.

## Interface joueur

- Grille 6×5, remplissage progressif, couleur (vert/jaune/gris) appliquée à réception de la réponse serveur, avec une légère animation.
- Clavier virtuel AZERTY sous la grille, coloré selon le meilleur état connu de chaque lettre ; utilisable au clic/tactile et au clavier physique (écoute `keydown` globale).
- Message d'erreur transitoire (shake + toast) si mot hors dictionnaire ou saisie incomplète.
- Modal de fin de partie (gagné : nombre d'essais ; perdu : mot révélé), saisie désactivée jusqu'au lendemain.
- Accessibilité : `aria-label` par case (lettre + état), `aria-label` sur les touches du clavier virtuel, gestion du focus clavier.

## Interface admin

- `/admin/login` : email/mot de passe → `supabase.auth.signInWithPassword`, erreurs affichées.
- `middleware.ts` protège `/admin/*` (hors `/admin/login`) : session absente → redirection login.
- `/admin/page.tsx` : tableau des `daily_words` (tri date décroissante), formulaire d'ajout (date + mot, validation 5 lettres + appartenance dictionnaire), édition et suppression par ligne, bouton déconnexion.

## Gestion d'erreurs

- API : réponses `{ error: string }` avec codes HTTP cohérents (400 entrée invalide, 401 non authentifié, 500 erreur serveur).
- Fallback automatique sur mot déterministe local si Supabase injoignable : le jeu reste jouable même si la base est indisponible.
- Frontend : échecs réseau affichés via message utilisateur ("Réessaie plus tard").

## Tests (Vitest)

- `lib/game.ts` : `evaluateGuess` — cas simples, lettres dupliquées, lettre absente répétée plusieurs fois.
- `lib/dictionary.ts` : toutes les entrées font 5 lettres minuscules sans accents.
- `/api/word` : essai correct, incorrect, mot hors dictionnaire (client Supabase mocké).

## Déploiement

Variables d'environnement (`.env.local` en local, Vercel en prod) :
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (serveur uniquement)

`README.md` couvre : création du projet Supabase, exécution de la migration SQL, création d'un compte admin, configuration des variables d'environnement (local + Vercel), scripts `npm run dev/build/start/test`.

## Hors périmètre

- Inscription publique de comptes admin.
- Comptes joueurs / statistiques cross-device (la persistance reste locale au navigateur).
- Internationalisation (dictionnaire français uniquement).
