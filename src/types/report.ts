import { SHIPMENT_TYPE, STATUS } from '@prisma/client';

// Report filter types
export type ReportDateFilter = {
  startDate?: string;
  endDate?: string;
};

export type OperationalReportFilter = ReportDateFilter & {
  type?: SHIPMENT_TYPE;
  status?: STATUS;
  warehouseId?: string;
};

export type DailyOutputReportFilter = ReportDateFilter & {
  groupBy?: 'item' | 'customer' | 'vehicle' | 'warehouse';
  warehouseId?: string;
  customerId?: string;
  armadaId?: string;
  productId?: string;
};

export type MonthlyOutputReportFilter = {
  year: number;
  month: number;
  groupBy?: 'item' | 'customer' | 'vehicle' | 'warehouse';
  warehouseId?: string;
  customerId?: string;
  armadaId?: string;
  productId?: string;
};

export type ShipmentAssignmentReportFilter = ReportDateFilter & {
  armadaId?: string;
  warehouseId?: string;
  status?: STATUS;
};

// Pagination type
export type Pagination = {
  page: string;
  limit: string;
};

// Query types for controller (all fields as string, as from req.query)
export type OperationalReportQuery = OperationalReportFilter &
  Pagination & {
    [key: string]: string | undefined;
  };

export type DailyOutputReportQuery = DailyOutputReportFilter &
  Pagination & {
    [key: string]: string | undefined;
  };

export type MonthlyOutputReportQuery = MonthlyOutputReportFilter &
  Pagination & {
    [key: string]: string | undefined;
  };

export type ShipmentAssignmentReportQuery = ShipmentAssignmentReportFilter &
  Pagination & {
    [key: string]: string | undefined;
  };
