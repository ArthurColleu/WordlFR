# Wordle quotidien

Jeu Wordle en français avec un mot différent chaque jour, et un dashboard admin pour gérer les mots.

## Le jeu

- Un mot cible de 5 lettres par jour, déterminé par la date.
- 6 essais. Après chaque essai, chaque lettre est colorée : **vert** = bonne lettre, bonne position ; **jaune** = bonne lettre, mauvaise position ; **gris** = lettre absente.
- Seuls des mots français de 5 lettres du dictionnaire (`lib/dictionary.ts`) sont acceptés comme essais.
- La progression du jour est sauvegardée dans le `localStorage` du navigateur (elle survit à un rafraîchissement et repart à zéro chaque jour).
- **Anti-triche :** le mot du jour n'est jamais envoyé au navigateur. L'essai est évalué côté serveur (`POST /api/word`), qui ne renvoie que les couleurs et `isCorrect`. En cas de défaite, le mot n'est pas révélé.

## Stack

Next.js 14 (App Router) + TypeScript + Tailwind CSS, Supabase (Postgres + Auth), déployé sur Vercel.

## Installation locale

1. `npm install`
2. Créer un projet sur [supabase.com](https://supabase.com).
3. Dans l'éditeur SQL du projet Supabase, exécuter le contenu de `supabase/migrations/0001_init.sql`.
4. Dans **Authentication > Users** du dashboard Supabase, créer manuellement un utilisateur admin (email + mot de passe). C'est ce compte qui se connectera sur `/admin/login`.
5. Copier `.env.local.example` vers `.env.local` et renseigner :
   - `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` : Project Settings > API.
   - `SUPABASE_SERVICE_ROLE_KEY` : Project Settings > API (clé secrète, ne jamais l'exposer côté client).
6. `npm run dev` puis ouvrir `http://localhost:3000`.

## Scripts

- `npm run dev` : serveur de développement.
- `npm run build` : build de production.
- `npm run start` : sert le build de production.
- `npm run test` : lance les tests Vitest.

## Déploiement sur Vercel

1. Importer le repo dans Vercel.
2. Dans les paramètres du projet Vercel > Environment Variables, ajouter les 3 mêmes variables que dans `.env.local`.
3. Déployer. Vercel détecte automatiquement Next.js.

## Ajouter/gérer les mots du jour

Se connecter sur `/admin/login` avec le compte admin créé à l'étape 4, puis ajouter une date + un mot de 5 lettres (doit appartenir au dictionnaire de `lib/dictionary.ts`) sur `/admin`.

## Comportement de secours

Si aucun mot n'est défini pour la date du jour, ou si Supabase est indisponible, le jeu choisit automatiquement un mot du dictionnaire local de façon déterministe (même mot pour tout le monde, basé sur la date).
