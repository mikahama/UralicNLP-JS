import abrvs from './data/abrvs.js';

const sentenceEnd = new Set(Array.from('!?。……‥！？。⋯…؟჻!…'));
const wordEndPunct = new Set(Array.from(',;:”’\'"»」)]}،؛》』〕｠〉》】〗〙〛–—'));
const wordStartPunct = new Set(Array.from('\'"¡¿「«“”‘({[《『〔｟〈《【〖〘〚–—”'));
const numbers = new Set(Array.from('0123456789١٢٣٤٥٦٧٨٩٠'));
const customPunctuation = new Set(Array.from('!"#$%&\'()*+,-.:;<=>?@[]^_`{|}~'));

function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const abrvRegex = new RegExp(
  '(^|\\s)(' + abrvs.map(escapeRegex).join('|') + ')$',
  'i'
);

function endsInAbrv(text) {
  return abrvRegex.test(text.toLowerCase());
}

/**
 * Splits input text into sentences.
 * @param {string} text
 * @returns {string[]}
 */
export function sentences(text) {
  if (typeof text !== 'string') {
    return [];
  }

  const parts = [];
  let currentS = '';
  let previousBreak = false;

  for (let i = 0; i < text.length; i++) {
    const c = text[i];

    if (sentenceEnd.has(c)) {
      // End of a sentence, not a dot
      if (currentS.length > 0) {
        parts.push(currentS + c);
        currentS = '';
      } else if (parts.length > 0) {
        parts[parts.length - 1] += c;
      } else {
        currentS = c;
      }
    } else if (c === '.') {
      if (currentS.length === 0) {
        if (parts.length > 0) {
          parts[parts.length - 1] += c;
        } else {
          currentS = c;
        }
      } else if (currentS.length > 0 && numbers.has(currentS[currentS.length - 1])) {
        // previous is a number
        currentS += c;
      } else if (endsInAbrv(currentS)) {
        // abbreviation
        currentS += c;
      } else if (text.length > i + 1 && text[i + 1].trim().length !== 0) {
        // dot is not followed by a space
        currentS += c;
      } else {
        // dot ending a sentence
        parts.push(currentS + c);
        currentS = '';
      }
    } else if (c === '\n') {
      if (previousBreak && currentS.length > 0) {
        parts.push(currentS);
        currentS = '';
      }
      if (!previousBreak && currentS.length > 0) {
        currentS += c;
      }
      previousBreak = true;
      continue;
    } else if (c === '\r') {
      continue;
    } else {
      currentS += c;
    }
    previousBreak = false;
  }

  if (currentS.length > 0) {
    parts.push(currentS);
  }

  const spaceRegex = /\s+/g;
  return parts
    .map((part) => part.replace(spaceRegex, ' ').trim())
    .filter((part) => part.length > 0);
}

/**
 * Tokenizes a sentence into words and punctuation tokens.
 * @param {string} text
 * @returns {string[]}
 */
export function words(text) {
  if (typeof text !== 'string') {
    return [];
  }

  const multidot = /(\.{2,})$/;
  const spaceRegex = /\s+/g;

  let processedText = text;
  for (const sentenceEndP of sentenceEnd) {
    processedText = processedText.split(sentenceEndP).join(' ' + sentenceEndP);
  }
  processedText = processedText.replace(spaceRegex, ' ').trim();
  if (processedText.length === 0) {
    return [];
  }

  const whitespaceTokens = processedText.split(' ');
  const tokens = [];

  for (let t of whitespaceTokens) {
    const firstTok = [];
    const lastTok = [];

    let contFirst = true;
    while (contFirst) {
      contFirst = false;
      if (t.length > 0 && wordStartPunct.has(t[0])) {
        contFirst = true;
        firstTok.push(t[0]);
        t = t.slice(1);
      }
    }

    let contLast = true;
    while (contLast) {
      contLast = false;
      if (t.length > 0 && wordEndPunct.has(t[t.length - 1])) {
        contLast = true;
        lastTok.unshift(t[t.length - 1]);
        t = t.slice(0, -1);
      } else if (
        t.length > 1 &&
        t[t.length - 1] === '.' &&
        wordEndPunct.has(t[t.length - 2])
      ) {
        contLast = true;
        lastTok.unshift(t[t.length - 1]);
        lastTok.unshift(t[t.length - 2]);
        t = t.slice(0, -2);
      }
    }

    const dotsMatch = t.match(multidot);
    if (dotsMatch) {
      const dots = dotsMatch[1];
      lastTok.unshift(dots);
      t = t.slice(0, -dots.length);
    } else if (t.length > 0 && t[t.length - 1] === '.') {
      if (!endsInAbrv(t.slice(0, -1))) {
        t = t.slice(0, -1);
        lastTok.unshift('.');
      }
    }

    let tList;
    if (
      (t.includes('/') || t.includes('\\')) &&
      !Array.from(t).some((x) => customPunctuation.has(x))
    ) {
      t = t.replace(/\//g, ' /').replace(/\\/g, ' \\');
      tList = t.split(' ');
    } else {
      tList = [t];
    }
    tList = tList.filter((x) => x.length > 0);

    firstTok.push(...tList);
    firstTok.push(...lastTok);
    tokens.push(...firstTok);
  }

  return tokens.filter((tok) => tok.length > 0);
}

/**
 * Tokenizes text into sentences and word tokens.
 * @param {string} text
 * @returns {string[][]}
 */
export function tokenize(text) {
  const sents = sentences(text);
  return sents.map((s) => words(s));
}

const tokenizer = {
  sentences,
  words,
  tokenize,
};

export default tokenizer;
