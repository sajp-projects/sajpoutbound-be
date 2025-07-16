import { SHIPMENT_TYPE, STATUS } from '@prisma/client';
import Joi from 'joi';

import {
  DailyOutputReportFilter,
  MonthlyOutputReportFilter,
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
  startDate: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'Tanggal mulai harus dalam format ISO yang valid',
  }),
  endDate: Joi.string().isoDate().optional().messages({
    'string.isoDate': 'Tanggal akhir harus dalam format ISO yang valid',
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
    .valid(...Object.values(STATUS))
    .optional()
    .messages({
      'any.only': 'Status harus PENDING, PROSES, atau SELESAI',
    }),
});

export const monthlyOutputReportFilterSchema = Joi.object<MonthlyOutputReportFilter>({
  year: Joi.number().integer().min(2020).max(2050).required().messages({
    'number.base': 'Tahun harus berupa angka',
    'number.integer': 'Tahun harus berupa bilangan bulat',
    'number.min': 'Tahun minimal 2020',
    'number.max': 'Tahun maksimal 2050',
    'any.required': 'Tahun diperlukan',
  }),
  month: Joi.number().integer().min(1).max(12).required().messages({
    'number.base': 'Bulan harus berupa angka',
    'number.integer': 'Bulan harus berupa bilangan bulat',
    'number.min': 'Bulan minimal 1',
    'number.max': 'Bulan maksimal 12',
    'any.required': 'Bulan diperlukan',
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
