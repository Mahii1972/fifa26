/** Wikimedia thumbnail PNG URLs often 400; direct SVG paths are reliable. */
export function normalizeFlagUrl(url: string): string {
  if (!url) return url;

  const thumbMatch = url.match(
    /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/(?:commons|en))\/thumb\/(.+\.svg)\/\d+px-.+\.svg\.png$/,
  );

  if (thumbMatch) {
    return `${thumbMatch[1]}/${thumbMatch[2]}`;
  }

  return url;
}