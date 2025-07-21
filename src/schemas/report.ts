import { SHIPMENT_TYPE, STATUS } from '@prisma/client';
import Joi from 'joi';

import {
  DailyOutputReportFilter,
  OperationalReportFilter,
  ReportDateFilter,
  ShipmentAssignmentReportFilter,
} from '../types/report';

// Joi validation schemas
export const reportDateFilterSchema = Joi.object<ReportDateFilter>({
  startDate: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'Tanggal mulai harus dalam format ISO yang valid',
  }),
  endDate: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'Tanggal akhir harus dalam format ISO yang valid',
  }),
});

export const operationalReportFilterSchema = Joi.object<OperationalReportFilter>({
  startDate: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'Tanggal mulai harus dalam format ISO yang valid',
  }),
  endDate: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'Tanggal akhir harus dalam format ISO yang valid',
  }),
  type: Joi.string()
    .valid(...Object.values(SHIPMENT_TYPE))
    .optional()
    .messages({
      'any.only': 'Tipe pengiriman harus ANTAR atau JEMPUT',
    }),
  status: Joi.string()
    .valid(...Object.values(STATUS))
    .optional()
    .messages({
      'any.only': 'Status harus PENDING, PROSES, atau SELESAI',
    }),
  warehouseId: Joi.string().uuid().optional().messages({
    'string.uuid': 'ID gudang harus berupa UUID yang valid',
  }),
});

export const dailyOutputReportFilterSchema = Joi.object<DailyOutputReportFilter>({
  period: Joi.string().valid('daily', 'monthly', 'yearly').optional().messages({
    'any.only': 'Periode harus salah satu dari: daily, monthly, yearly',
  }),
  startDate: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'Tanggal mulai harus dalam format ISO yang valid',
  }),
  endDate: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'Tanggal akhir harus dalam format ISO yang valid',
  }),
  year: Joi.number().integer().min(2000).max(2100).optional().messages({
    'number.base': 'Tahun harus berupa angka',
    'number.integer': 'Tahun harus berupa bilangan bulat',
    'number.min': 'Tahun harus minimal 2000',
    'number.max': 'Tahun harus maksimal 2100',
  }),
  month: Joi.number().integer().min(1).max(12).optional().messages({
    'number.base': 'Bulan harus berupa angka',
    'number.integer': 'Bulan harus berupa bilangan bulat',
    'number.min': 'Bulan harus minimal 1',
    'number.max': 'Bulan harus maksimal 12',
  }),
  groupBy: Joi.string().valid('item', 'customer', 'vehicle', 'warehouse').optional().messages({
    'any.only': 'Grup harus salah satu dari: item, customer, vehicle, warehouse',
  }),
  warehouseId: Joi.string().uuid().optional().messages({
    'string.uuid': 'ID gudang harus berupa UUID yang valid',
  }),
  customerId: Joi.string().uuid().optional().messages({
    'string.uuid': 'ID pelanggan harus berupa UUID yang valid',
  }),
  armadaId: Joi.string().uuid().optional().messages({
    'string.uuid': 'ID armada harus berupa UUID yang valid',
  }),
  productId: Joi.string().uuid().optional().messages({
    'string.uuid': 'ID produk harus berupa UUID yang valid',
  }),
  status: Joi.string()
    .valid(...Object.values(STATUS), 'ALL')
    .optional()
    .messages({
      'any.only': 'Status harus PENDING, PROSES, SELESAI, atau ALL',
    }),
});

export const shipmentAssignmentReportFilterSchema = Joi.object<ShipmentAssignmentReportFilter>({
  startDate: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'Tanggal mulai harus dalam format ISO yang valid',
  }),
  endDate: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'Tanggal akhir harus dalam format ISO yang valid',
  }),
  armadaId: Joi.string().uuid().optional().messages({
    'string.uuid': 'ID armada harus berupa UUID yang valid',
  }),
  warehouseId: Joi.string().uuid().optional().messages({
    'string.uuid': 'ID gudang harus berupa UUID yang valid',
  }),
  status: Joi.string()
    .valid(...Object.values(STATUS))
    .optional()
    .messages({
      'any.only': 'Status harus PENDING, PROSES, atau SELESAI',
    }),
});
