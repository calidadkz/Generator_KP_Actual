/**
 * Converts a number to Russian words.
 * Supports up to billions.
 */
export function numberToWordsRu(num: number): string {
  if (num === 0) return 'ноль';

  const ones = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  const onesFemale = ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'];
  const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
  const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
  const hundreds = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];

  function getDeclension(n: number, forms: [string, string, string]) {
    const n100 = n % 100;
    const n10 = n % 10;
    if (n100 > 10 && n100 < 20) return forms[2];
    if (n10 > 1 && n10 < 5) return forms[1];
    if (n10 === 1) return forms[0];
    return forms[2];
  }

  function parseGroup(n: number, isFemale: boolean): string {
    let res = '';
    const h = Math.floor(n / 100);
    const t = Math.floor((n % 100) / 10);
    const u = n % 10;

    if (h > 0) res += hundreds[h] + ' ';
    
    if (t === 1) {
      res += teens[u] + ' ';
    } else {
      if (t > 1) res += tens[t] + ' ';
      if (u > 0) res += (isFemale ? onesFemale[u] : ones[u]) + ' ';
    }
    return res.trim();
  }

  let result = '';
  const billions = Math.floor(num / 1000000000);
  const millions = Math.floor((num % 1000000000) / 1000000);
  const thousands = Math.floor((num % 1000000) / 1000);
  const units = num % 1000;

  if (billions > 0) {
    result += parseGroup(billions, false) + ' ' + getDeclension(billions, ['миллиард', 'миллиарда', 'миллиардов']) + ' ';
  }
  if (millions > 0) {
    result += parseGroup(millions, false) + ' ' + getDeclension(millions, ['миллион', 'миллиона', 'миллионов']) + ' ';
  }
  if (thousands > 0) {
    result += parseGroup(thousands, true) + ' ' + getDeclension(thousands, ['тысяча', 'тысячи', 'тысяч']) + ' ';
  }
  if (units > 0 || result === '') {
    result += parseGroup(units, false);
  }

  return result.trim();
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ru-RU').format(amount);
}

export function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  }).format(date);
}

export const extractFieldsFromHTML = (html: string) => {
  const regex = /{{([a-zA-Z0-9._]+)}}/g;
  const matches = html.matchAll(regex);
  const fields = new Set<string>();
  
  for (const match of matches) {
    fields.add(match[1]);
  }
  
  return Array.from(fields);
};
