/**
 * Pick the document to serve on the post-payment success page.
 *
 * Why this exists: PaymentSuccess used to grab `documents.list[0]`, but that
 * list is ordered by `updatedAt DESC` and `markDocumentsPaid` re-stamps ALL of
 * a user's pending docs at payment time — so their `updatedAt` ties and the
 * "first" row can be an OLDER document than the one the user just edited and
 * paid for (real incident: user 72366 received doc 4634 instead of her final
 * 4642 → "pagué y está en blanco").
 *
 * Rule: honor an explicit `forcedId` (threaded through the payment flow when
 * known), else return the NEWEST by `createdAt` — the doc just created for this
 * edit+pay session. Pure + deterministic so it's unit-tested.
 */
export interface PickableDoc {
  id: number;
  createdAt: string | number | Date;
}

export function pickDownloadDoc<T extends PickableDoc>(
  docs: T[] | undefined | null,
  forcedId?: number | null,
): T | null {
  if (!docs || docs.length === 0) return null;
  if (forcedId) {
    const forced = docs.find((d) => d.id === forcedId);
    if (forced) return forced;
  }
  return [...docs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )[0];
}
