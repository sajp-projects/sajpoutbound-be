import { ACTION, ArmadaLog, ENTITY_TYPE } from '@prisma/client';
import prisma from '../config/prisma';
import { ArmadaLogCreateInput } from '../schemas/armadaLog';

interface RawArmadaLog extends ArmadaLog {
  armada: {
    id: string | null;
    model: string | null;
    id_sl: string | null;
    plateNumber: string | null;
    description: string | null;
  };
  performedBy: {
    id: string | null;
    name: string | null;
    email: string | null;
  };
}

export default {
  /**
   * Log an armada creation event
   *
   * @param armadaId The ID of the newly created armada
   * @param performedById The ID of the user who created the armada
   * @param armadaData The data of the created armada
   * @param tx Optional transaction client
   * @returns The created log entry
   */
  async logArmadaCreation(
    armadaId: string,
    performedById: string,
    armadaData: any,
    tx?: any,
  ): Promise<ArmadaLog> {
    const client = tx || prisma;
    // Create a Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    const logData: ArmadaLogCreateInput = {
      armadaId,
      performedById,
      action: ACTION.CREATE,
      entityType: ENTITY_TYPE.ARMADA,
      newData: armadaData,
      description: `Membuat armada baru: ${armadaData.model} - ${armadaData.plateNumber}`,
    };

    return client.armadaLog.create({
      data: {
        ...logData,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Log an armada update event
   *
   * @param armadaId The ID of the updated armada
   * @param performedById The ID of the user who performed the update
   * @param oldData The previous state of the data
   * @param newData The new state of the data
   * @param tx Optional transaction client
   * @param description Optional custom description
   * @returns The created log entry
   */
  async logArmadaUpdate(
    armadaId: string,
    performedById: string,
    oldData: any,
    newData: any,
    tx?: any,
    description?: string,
  ): Promise<ArmadaLog> {
    const client = tx || prisma;
    // Create a Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    const logData: ArmadaLogCreateInput = {
      armadaId,
      performedById,
      action: ACTION.UPDATE,
      entityType: ENTITY_TYPE.ARMADA,
      oldData,
      newData,
      description: description || 'Mengubah informasi armada',
    };

    return client.armadaLog.create({
      data: {
        ...logData,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Log an armada deletion event
   *
   * @param performedById The ID of the user who performed the deletion
   * @param armadaData The data of the armada being deleted
   * @param tx Optional transaction client
   * @returns The created log entry
   */
  async logArmadaDeletion(performedById: string, armadaData: any, tx?: any): Promise<ArmadaLog> {
    const client = tx || prisma;
    // Create a Jakarta timezone date (UTC+7)
    const jakartaTime = new Date();
    jakartaTime.setHours(jakartaTime.getHours() + 7);

    const logData: ArmadaLogCreateInput = {
      armadaId: armadaData.id,
      performedById,
      action: ACTION.DELETE,
      entityType: ENTITY_TYPE.ARMADA,
      oldData: armadaData,
      description: `Menghapus armada: ${armadaData.model} - ${armadaData.plateNumber}`,
    };

    return client.armadaLog.create({
      data: {
        ...logData,
        createdAt: jakartaTime,
        updatedAt: jakartaTime,
      },
    });
  },

  /**
   * Get all armada logs with pagination
   *
   * @param page The page number (1-based)
   * @param limit The number of items per page
   * @returns Object containing logs array and total count
   */
  async getAllArmadaLogs(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.$queryRaw<RawArmadaLog[]>`
        SELECT
          al.*,
          JSON_OBJECT(
            'id', a.id,
            'model', a.model,
            'id_sl', a.id_sl,
            'plateNumber', a.plateNumber,
            'description', a.description
          ) as armada,
          JSON_OBJECT(
            'id', u.id,
            'name', u.name,
            'email', u.email
          ) as performedBy
        FROM ArmadaLog al
        LEFT JOIN Armada a ON al.armadaId = a.id
        LEFT JOIN User u ON al.performedById = u.id
        ORDER BY al.createdAt DESC
        LIMIT ${skip}, ${limit}
      `,
      prisma.armadaLog.count(),
    ]);

    return {
      logs: logs.map((log: RawArmadaLog) => ({
        ...log,
        armada: log.armada.id ? log.armada : null,
        performedBy: log.performedBy.id ? log.performedBy : null,
      })),
      total,
    };
  },

  /**
   * Get all logs for a specific armada
   *
   * @param armadaId The ID of the armada to get logs for
   * @param page The page number (1-based)
   * @param limit The number of items per page
   * @returns Object containing logs array and total count
   */
  async getArmadaLogs(armadaId: string, page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [logs, total] = await Promise.all([
      prisma.$queryRaw<RawArmadaLog[]>`
        SELECT
          al.*,
          JSON_OBJECT(
            'id', a.id,
            'model', a.model,
            'id_sl', a.id_sl,
            'plateNumber', a.plateNumber,
            'description', a.description
          ) as armada,
          JSON_OBJECT(
            'id', u.id,
            'name', u.name,
            'email', u.email
          ) as performedBy
        FROM ArmadaLog al
        LEFT JOIN Armada a ON al.armadaId = a.id
        LEFT JOIN User u ON al.performedById = u.id
        WHERE al.armadaId = ${armadaId}
        ORDER BY al.createdAt DESC
        LIMIT ${skip}, ${limit}
      `,
      prisma.armadaLog.count({
        where: {
          armadaId,
        },
      }),
    ]);

    return {
      logs: logs.map((log: RawArmadaLog) => ({
        ...log,
        armada: log.armada.id ? log.armada : null,
        performedBy: log.performedBy.id ? log.performedBy : null,
      })),
      total,
    };
  },
};
