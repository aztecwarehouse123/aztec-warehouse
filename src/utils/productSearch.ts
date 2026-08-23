/** Match products where every search keyword appears in name, barcode, or ASIN. */
export function productMatchesKeywordSearch(
  product: { name: string; barcode: string; asin?: string | null },
  query: string
): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const keywords = trimmed.toUpperCase().split(/\s+/).filter(Boolean);
  const haystack = [product.name, product.barcode, product.asin || ''].join(' ').toUpperCase();

  return keywords.every(keyword => haystack.includes(keyword));
}
