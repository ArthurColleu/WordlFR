export function dailyFallbackWord(date: string, dictionary: string[]): string {
  let hash = 0;
  for (let i = 0; i < date.length; i++) {
    hash = (hash * 31 + date.charCodeAt(i)) >>> 0;
  }
  return dictionary[hash % dictionary.length];
}
