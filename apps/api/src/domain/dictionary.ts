export const DICTIONARY: string[] = [
  "table", "porte", "fleur", "jouer", "monde", "temps", "lieux", "rouge",
  "noire", "blanc", "verte", "jaune", "grise", "ville", "route", "image",
  "force", "ordre", "place", "terre", "fruit", "lampe", "trace", "geste",
  "sport", "douce", "salle", "verre", "stylo", "poire", "pomme", "vigne",
  "ferme", "champ", "boite", "carte", "livre", "chien", "tigre", "zebre",
  "singe", "aigle", "poule", "vache", "arbre", "foret", "plage", "neige",
  "glace", "pluie", "orage", "nuage", "brume", "froid", "chaud", "tiede",
  "clair", "beige", "doree", "acier", "metal", "roche", "sable", "puits",
  "sente", "piste", "salon", "cadre", "cible", "ligne", "point", "angle",
  "cycle", "signe", "forme", "masse", "poids", "vitre", "socle", "credo",
  "degre", "piece", "cause", "doute", "envie", "peine", "amour", "haine",
  "calme", "agite", "fatal", "lourd", "leger", "solde", "prime", "somme",
  "ratio", "carre", "droit", "apres", "avant", "motif", "trait", "degat",
  "casse", "brise", "ronde", "pacte", "ligue", "trone", "garde", "veste",
  "botte", "sabot", "laine", "coton", "toile", "perle", "bague", "verni",
  "tapis", "aimer", "venir", "tenir", "boire", "vivre", "laver", "nager",
  "voler",
];

const DICTIONARY_SET = new Set(DICTIONARY);

export function isValidWord(word: string): boolean {
  return DICTIONARY_SET.has(word.toLowerCase());
}
