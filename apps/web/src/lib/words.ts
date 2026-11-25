const SMALL = ["no one", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve"];

/** Numbers as words, the way the designs write them ("six of us", "Eleven crops"). */
export function numberWord(n: number): string {
  return SMALL[n] ?? String(n);
}

export function capitalise(s: string): string {
  return s ? s[0].toUpperCase() + s.slice(1) : s;
}

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

/** "MM-DD" as gentle words: "early March", "mid-December", "late May". */
export function dateWords(md: string): string {
  const [m, d] = md.split("-").map(Number);
  const part = d <= 10 ? "early " : d <= 20 ? "mid-" : "late ";
  return `${part}${MONTHS[m - 1]}`;
}

/** "a, b and c". */
export function listWords(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
