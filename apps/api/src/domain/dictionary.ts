export const DICTIONARY: string[] = [
  // — noyau initial —
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
  // — animaux —
  "lapin", "renne", "morse", "panda", "koala", "hibou", "merle", "dinde",
  "boeuf", "crabe", "moule", "morue", "carpe", "gecko", "varan", "biche",
  "cygne", "heron", "furet", "bison", "chats", "loups", "veaux", "mulot",
  // — nature & paysage —
  "berge", "digue", "crete", "butte", "combe", "ravin", "etang", "ruche",
  "tronc", "herbe", "ronce", "ortie", "baies", "seves", "monts", "vague",
  "houle", "recif", "ilots", "marin", "gazon", "buche",
  // — maison & objets —
  "divan", "nappe", "draps", "linge", "balai", "outil", "clous", "ecrou",
  "corde", "bocal", "store", "volet", "seuil", "pelle", "pince",
  // — nourriture —
  "miche", "huile", "creme", "sucre", "farce", "sirop", "cidre", "biere",
  "sodas", "melon", "mures", "figue", "datte", "navet", "radis", "cumin",
  "pates", "steak", "gigot", "pizza", "tarte", "crepe", "olive", "coing",
  "prune",
  // — couleurs & adjectifs —
  "mauve", "brune", "blond", "fauve", "terne", "ample", "epais", "mince",
  "raide", "lisse", "dense", "creux", "plein", "moite", "frais", "ocres",
  "rosee", "vives", "mates", "court", "haute", "basse", "riche", "jeune",
  "vieux", "rusee", "sotte", "digne", "noble", "avare", "actif", "ovale",
  // — verbes —
  "lever", "poser", "tirer", "mener", "jeter", "crier", "plier", "river",
  "scier", "cirer", "filer", "nouer", "lacer", "coder", "gerer", "creer",
  "payer", "louer", "jurer", "ruser", "semer", "gober", "muser", "viser",
  "raper", "saler", "noter", "voter", "dater", "ramer", "gager", "loger",
  // — transport, ville, culture —
  "avion", "train", "velos", "canot", "radio", "phare", "quais", "gares",
  "ponts", "tours", "ecole", "lycee", "usine", "jeton", "piano", "flute",
  "harpe", "chant", "danse", "opera", "actes", "roman", "conte", "recit",
  "texte", "pages", "titre",
  // — corps —
  "pouce", "doigt", "coude", "genou", "talon", "joues", "levre", "dents",
  "gorge", "torse", "ongle", "veine", "nerfs", "crane", "front", "mains",
  "pieds",
  // — temps & abstractions —
  "matin", "soirs", "nuits", "midis", "annee", "jours", "heure", "duree",
  "delai", "aubes", "joies", "larme", "reves", "ennui", "grace", "merci",
  "adieu", "salut",
  // — animaux (2) —
  "lions", "ourse", "truie", "poney", "raton", "tique", "cobra", "aspic",
  "mante", "loirs",
  // — arbres & plantes —
  "cedre", "saule", "frene", "aulne", "myrte", "lilas", "roses", "aster",
  "sauge", "epine", "liane", "thuya", "ormes",
  // — maison & outils (2) —
  "etage", "rampe", "caves", "tuile", "tamis", "cable", "gaine", "prise",
  "fiche", "forge", "loque", "beche", "serpe", "limon",
  // — nourriture (2) —
  "soupe", "puree", "grain", "epice", "feves", "colza", "gelee", "rotie",
  "gigue", "mache", "kakis",
  // — verbes (2) —
  "finir", "nuire", "cuire", "luire", "haler", "peler", "meler", "trier",
  "frire",
  // — adjectifs (2) —
  "vrais", "exact", "grave", "utile", "sobre", "ivres", "aride", "trapu",
  "frele", "sourd", "muets", "leste", "dodue", "fluet", "pales", "laids",
  "beaux", "fiers", "sages", "rudes", "plats", "ronds", "longs",
  // — corps (2) —
  "reins", "tibia", "paume", "nuque", "buste",
  // — météo & abstractions (2) —
  "givre", "grele", "vents", "bruit", "echos", "ombre", "lueur", "rayon",
  "halos",
];

const DICTIONARY_SET = new Set(DICTIONARY);

export function isValidWord(word: string): boolean {
  return DICTIONARY_SET.has(word.toLowerCase());
}
