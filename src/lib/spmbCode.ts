import { Prisma } from '@prisma/client';

// A = January ... L = December
const MONTH_LETTERS = 'ABCDEFGHIJKL';

/**
 * Generates the user-facing SPMB display code in the format:
 *   {warehouseCode}-{monthLetter}{yy}{dd}{sequence}
 * Example: GDB-A26160001 (first SPMB of January 16, 2026 for warehouse GDB)
 *
 * The sequence is 4 digits and resets per warehouse per day.
 * This is stored in SPMB.displayCode and shown to users; SPMB.code remains
 * the internal unique identifier.
 *
 * Must be called inside the same transaction that creates/updates the SPMB
 * so the unique constraint on SPMB.displayCode catches concurrent duplicates.
 */
export const generateSpmbDisplayCode = async (
  tx: Prisma.TransactionClient,
  warehouseCode: string | null | undefined,
  date?: Date,
): Promise<string> => {
  // Match the codebase convention for Jakarta time (GMT+7)
  const jakartaTime = date ?? new Date();
  if (!date) {
    jakartaTime.setHours(jakartaTime.getHours() + 7);
  }

  const monthLetter = MONTH_LETTERS[jakartaTime.getMonth()];
  const yearSuffix = String(jakartaTime.getFullYear() % 100).padStart(2, '0');
  const daySuffix = String(jakartaTime.getDate()).padStart(2, '0');
  const prefix = `${warehouseCode || 'WH'}-${monthLetter}${yearSuffix}${daySuffix}`;

  const existingCodes = await tx.sPMB.findMany({
    where: { displayCode: { startsWith: prefix } },
    select: { displayCode: true },
  });

  let maxSequence = 0;
  for (const { displayCode } of existingCodes) {
    const suffix = displayCode?.slice(prefix.length) ?? '';
    if (/^\d{4,}$/.test(suffix)) {
      maxSequence = Math.max(maxSequence, parseInt(suffix, 10));
    }
  }

  return `${prefix}${String(maxSequence + 1).padStart(4, '0')}`;
};
