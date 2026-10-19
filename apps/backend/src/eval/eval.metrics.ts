export function normalizeText(value: string): string {
  return value.toLowerCase();
}

export function keywordHitRate(
  text: string,
  keywords: string[],
  mode: 'all' | 'any' = 'all',
): number {
  if (!keywords.length) {
    return 1;
  }
  const haystack = normalizeText(text);
  const hits = keywords.filter((keyword) =>
    haystack.includes(keyword.toLowerCase()),
  ).length;
  if (mode === 'any') {
    return hits > 0 ? 1 : 0;
  }
  return hits / keywords.length;
}

export function containsForbiddenPhrase(
  text: string,
  phrases: string[],
): boolean {
  const haystack = normalizeText(text);
  return phrases.some((phrase) => haystack.includes(phrase.toLowerCase()));
}

function negatedNear(text: string, phrase: string): boolean {
  const index = text.indexOf(phrase);
  if (index < 0) {
    return false;
  }
  const window = text.slice(
    Math.max(0, index - 48),
    index + phrase.length + 48,
  );
  return (
    /\b(not|no|never|without|n't)\b/.test(window) ||
    window.includes('does not') ||
    window.includes('do not') ||
    window.includes('did not')
  );
}

/**
 * A forbidden phrase is an unsupported claim only when the answer states it
 * without the same negation the retrieved CV uses. "Kafka is not listed"
 * is faithful when the CV says "does not list Kafka".
 */
export function unsupportedClaim(
  answer: string,
  context: string,
  phrases: string[],
): boolean {
  const answerNorm = normalizeText(answer);
  const contextNorm = normalizeText(context);
  return phrases.some((phrase) => {
    const needle = phrase.toLowerCase();
    if (!answerNorm.includes(needle)) {
      return false;
    }
    const answerNegated = negatedNear(answerNorm, needle);
    const contextNegated =
      contextNorm.includes(needle) && negatedNear(contextNorm, needle);
    return !(answerNegated && contextNegated);
  });
}

export function percentile(values: number[], p: number): number {
  if (!values.length) {
    return 0;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((p / 100) * sorted.length) - 1),
  );
  return sorted[index];
}

export function average(values: number[]): number {
  if (!values.length) {
    return 0;
  }
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function splitTextIntoChunks(text: string, maxTokens: number): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentTokenCount = 0;

  for (const word of words) {
    const tokenEstimate = Math.ceil(word.length / 4);
    if (currentTokenCount + tokenEstimate > maxTokens && currentChunk.length) {
      chunks.push(currentChunk.join(' '));
      currentChunk = [word];
      currentTokenCount = tokenEstimate;
    } else {
      currentChunk.push(word);
      currentTokenCount += tokenEstimate;
    }
  }

  if (currentChunk.length) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks.filter((chunk) => chunk.trim().length > 0);
}
