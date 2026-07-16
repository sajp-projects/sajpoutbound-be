import { Prisma } from '@prisma/client';

// A = January ... L = December
const MONTH_LETTERS = 'ABCDEFGHIJKL';

/**
 * Generates the user-facing SPMB display code in the format:
 *   {warehouseCode}-{monthLetter}{yy}{dd}{sequence}
 * Example: GDB-G26161 (SPMB #1 for warehouse GDB, created July 16, 2026)
 *
 * The sequence resets per warehouse per day, starts at 1, and has no zero
 * padding (…9, 10, 11, …).
 *
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

  // Suffix after today's prefix is the sequence. The optional dash and
  // leading zeros tolerate codes from earlier format iterations.
  let maxSequence = 0;
  for (const { displayCode } of existingCodes) {
    const match = (displayCode ?? '').slice(prefix.length).match(/^-?(\d+)$/);
    if (match) {
      maxSequence = Math.max(maxSequence, parseInt(match[1], 10));
    }
  }

  return `${prefix}${maxSequence + 1}`;
};
