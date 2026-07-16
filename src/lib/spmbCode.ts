import { Prisma } from '@prisma/client';

// A = January ... L = December
const MONTH_LETTERS = 'ABCDEFGHIJKL';

/**
 * Generates the user-facing SPMB display code in the format:
 *   {warehouseCode}-{monthLetter}{yy}{dd}{sequence}
 * Example: GDB-G26161 (SPMB #1 for warehouse GDB, created July 16, 2026)
 *
 * The date part reflects when the SPMB was created; the sequence is a
 * per-warehouse counter that starts at 1, never resets, and has no zero
 * padding (…9, 10, 11, … 100, …).
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
  const warehouse = warehouseCode || 'WH';
  const prefix = `${warehouse}-${monthLetter}${yearSuffix}${daySuffix}`;

  // Sequence spans all dates for this warehouse: match any month letter and
  // 4-digit yy+dd, capture everything after as the sequence number.
  const escapedWarehouse = warehouse.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sequencePattern = new RegExp(`^${escapedWarehouse}-[A-L]\\d{4}(\\d+)$`);

  const existingCodes = await tx.sPMB.findMany({
    where: { displayCode: { startsWith: `${warehouse}-` } },
    select: { displayCode: true },
  });

  let maxSequence = 0;
  for (const { displayCode } of existingCodes) {
    const match = displayCode?.match(sequencePattern);
    if (match) {
      maxSequence = Math.max(maxSequence, parseInt(match[1], 10));
    }
  }

  return `${prefix}${maxSequence + 1}`;
};
