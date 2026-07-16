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
  const warehouse = warehouseCode || 'WH';
  const prefix = `${warehouse}-${monthLetter}${yearSuffix}${daySuffix}`;
  const dateKey = `${yearSuffix}${String(jakartaTime.getMonth() + 1).padStart(2, '0')}${daySuffix}`;

  // Atomic per-warehouse-per-day counter. The INSERT..ON DUPLICATE KEY UPDATE
  // row lock serializes concurrent transactions, so two shipments created at
  // the same moment can never get the same sequence. LAST_INSERT_ID(expr)
  // makes the incremented value readable on this connection without another
  // locking read.
  await tx.$executeRaw`
    INSERT INTO SpmbDailyCounter (warehouseCode, dateKey, seq)
    VALUES (${warehouse}, ${dateKey}, LAST_INSERT_ID(1))
    ON DUPLICATE KEY UPDATE seq = LAST_INSERT_ID(seq + 1)
  `;
  const rows = await tx.$queryRaw<{ seq: bigint }[]>`SELECT LAST_INSERT_ID() AS seq`;
  const sequence = Number(rows[0].seq);

  return `${prefix}${sequence}`;
};
