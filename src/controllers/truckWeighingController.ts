import { NextFunction, Request, Response } from 'express';
import prisma from '../config/prisma';
import { CustomError } from '../middlewares/error';
import { truckWeighingSchema } from '../schemas/truckWeighing';
import shipmentService from '../services/shipmentService';
import { success } from '../types/response';

// Validate x-auth header
const validateVendorAuth = (req: Request) => {
  const auth = req.headers['x-auth'] as string;
  if (!auth || auth !== process.env.X_AUTH_KEY) {
    throw new CustomError({
      message: 'Kunci API vendor tidak valid',
      errorCode: 'INVALID_VENDOR_KEY',
      status: 401,
    });
  }
};

// GET /api/vendor/truck-weighing/shipments
export const getShipmentsForTruckWeighing = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    validateVendorAuth(req);

    // Get shipments that need truck weighing
    const shipments = await prisma.shipment.findMany({
      where: {
        deletedAt: null,
        OR: [
          // Needs PRE weighing: PENDING status, no pre weight
          { status: 'PENDING', preWeighingWeight: null },
          // Needs POST weighing: PROSES status, no post weight (item check done separately)
          { status: 'PROSES', postWeighingWeight: null },
        ],
      },
      include: {
        armada: { select: { model: true, plateNumber: true } },
        shipmentItems: { select: { status: true } },
      },
    });

    // Filter and transform
    const result = shipments
      .map((s) => {
        const nonCancelledItems = s.shipmentItems.filter((i) => i.status !== 'CANCELLED');
        const completedItems = nonCancelledItems.filter((i) => i.status === 'COMPLETED');
        const allItemsCompleted =
          nonCancelledItems.length > 0 && completedItems.length === nonCancelledItems.length;

        const needsPreWeighing =
          s.status === 'PENDING' && s.preWeighingWeight === null && !!s.tally;
        const needsPostWeighing =
          s.status === 'PROSES' && s.postWeighingWeight === null && allItemsCompleted;
        // Shipment is waiting for items to be completed before POST weighing
        const awaitingItemCompletion =
          s.status === 'PROSES' && s.postWeighingWeight === null && !allItemsCompleted;

        return {
          id: s.id,
          shipmentNumber: s.shipmentNumber,
          plateNumber: s.plateNumber,
          status: s.status,
          hasTally: !!s.tally,
          needsPreWeighing,
          needsPostWeighing,
          awaitingItemCompletion,
          armada: s.armada ? { model: s.armada.model, plateNumber: s.armada.plateNumber } : null,
        };
      })
      .filter((s) => s.needsPreWeighing || s.needsPostWeighing || s.awaitingItemCompletion);

    res.status(200).json(success({ shipments: result }));
  } catch (error) {
    next(error);
  }
};

// GET /api/vendor/truck-weighing/shipments/:shipmentId
export const getShipmentDetailForTruckWeighing = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    validateVendorAuth(req);

    const { shipmentId } = req.params;

    const shipment = await prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: {
        armada: { select: { model: true, plateNumber: true } },
        shipmentItems: { select: { status: true } },
      },
    });

    if (!shipment || shipment.deletedAt) {
      throw new CustomError({
        message: 'Pengiriman tidak ditemukan',
        errorCode: 'SHIPMENT_NOT_FOUND',
        status: 404,
      });
    }

    const nonCancelledItems = shipment.shipmentItems.filter((i) => i.status !== 'CANCELLED');
    const completedItems = nonCancelledItems.filter((i) => i.status === 'COMPLETED');

    const needsPreWeighing =
      shipment.status === 'PENDING' && shipment.preWeighingWeight === null && !!shipment.tally;
    const needsPostWeighing =
      shipment.status === 'PROSES' &&
      shipment.postWeighingWeight === null &&
      nonCancelledItems.length > 0 &&
      completedItems.length === nonCancelledItems.length;

    res.status(200).json(
      success({
        shipment: {
          id: shipment.id,
          shipmentNumber: shipment.shipmentNumber,
          plateNumber: shipment.plateNumber,
          status: shipment.status,
          hasTally: !!shipment.tally,
          needsPreWeighing,
          needsPostWeighing,
          preWeighingWeight: shipment.preWeighingWeight,
          preWeighingAt: shipment.preWeighingAt,
          postWeighingWeight: shipment.postWeighingWeight,
          postWeighingAt: shipment.postWeighingAt,
          armada: shipment.armada
            ? { model: shipment.armada.model, plateNumber: shipment.armada.plateNumber }
            : null,
        },
      }),
    );
  } catch (error) {
    next(error);
  }
};

// POST /api/vendor/truck-weighing/weigh
export const performTruckWeighing = async (req: Request, res: Response, next: NextFunction) => {
  try {
    validateVendorAuth(req);

    const validated = await truckWeighingSchema.validateAsync(req.body);
    const { shipmentId, type, weight } = validated;

    let result;
    if (type === 'PRE') {
      result = await shipmentService.performPreWeighing(shipmentId, weight);
    } else {
      result = await shipmentService.performPostWeighing(shipmentId, weight);
    }

    res.status(200).json(
      success({
        shipmentId: result.id,
        type,
        weight,
        weighedAt: type === 'PRE' ? result.preWeighingAt : result.postWeighingAt,
      }),
    );
  } catch (error) {
    next(error);
  }
};

export default {
  getShipmentsForTruckWeighing,
  getShipmentDetailForTruckWeighing,
  performTruckWeighing,
};
