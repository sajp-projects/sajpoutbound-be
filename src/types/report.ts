import {
  SHIPMENT_ITEM_STATUS, SHIPMENT_TYPE, STATUS, 
} from '@prisma/client';

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

export type DailyOutputReportFilter = {
  period?: 'daily' | 'monthly' | 'yearly';
  // Daily period parameters
  startDate?: string;
  endDate?: string;
  // Monthly period parameters
  year?: number;
  month?: number;
  // Common parameters
  groupBy?: 'item' | 'customer' | 'vehicle' | 'warehouse';
  warehouseId?: string;
  customerId?: string;
  armadaId?: string;
  productId?: string;
  status?: STATUS | 'ALL';
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

// Report data structure types
export interface ReportArmada {
  id: string;
  model: string;
  plateNumber: string;
  id_sl?: string;
  description?: string;
}

export interface ReportShipmentItem {
  id: string;
  product: {
    id: string;
    name: string;
    satuan: string;
  };
  warehouse: {
    id: string;
    name: string;
  };
  requestedQuantity: number;
  weightedQuantity: number | null;
  status: STATUS;
  locationType: string | null;
  deliveryOrder: ReportDeliveryOrder;
}

export interface ReportDeliveryOrder {
  id: string;
  doNumber: string;
  customer: {
    id: string;
    name: string;
    address: string;
  };
  items: ReportShipmentItemSimple[];
}

export interface ReportShipmentItemSimple {
  id: string;
  product: {
    id: string;
    name: string;
    satuan: string;
  };
  warehouse: {
    id: string;
    name: string;
  };
  requestedQuantity: number;
  weightedQuantity: number | null;
  status: SHIPMENT_ITEM_STATUS;
  locationType: string | null;
}

export interface ReportShipment {
  id: string;
  shipmentNumber: string;
  type: SHIPMENT_TYPE;
  status: STATUS;
  plateNumber: string;
  armada: ReportArmada | null;
  createdAt: Date;
  updatedAt: Date;
  verifiedAt: Date | null;
  isVerified: boolean;
  deliveryOrders: ReportDeliveryOrder[];
  totalItems: number;
  totalWeight: number;
}

export interface OperationalReportGroup {
  PENDING: ReportShipment[];
  PROSES: ReportShipment[];
  SELESAI: ReportShipment[];
}

export interface OperationalReportGroupedData {
  ANTAR: OperationalReportGroup;
  JEMPUT: OperationalReportGroup;
}

export interface OperationalReportSummary {
  ANTAR: { PENDING: number; PROSES: number; SELESAI: number; total: number };
  JEMPUT: { PENDING: number; PROSES: number; SELESAI: number; total: number };
  overall: { PENDING: number; PROSES: number; SELESAI: number; total: number };
}

export interface OperationalReportKPI {
  totalShipmentsCreatedToday: number;
  totalShipmentsVerifiedToday: number;
  uniqueProductsMoved: number;
  dispatchedTotalsByUnit: Array<{ satuan: string; totalQuantity: number }>;
  topShippedProducts: Array<{ id: string; name: string; satuan: string; totalQuantity: number }>;
  mostActiveVehicle: Array<{
    id: string;
    model: string;
    plateNumber: string;
    shipmentCount: number;
  }>;
  topCustomersByShipmentCount: Array<{ id: string; name: string; shipmentCount: number }>;
  topCustomersByVolume: Array<{ id: string; name: string; totalQuantity: number }>;
  vehicleUsageCount: number;
  trendline7Days: Array<{ date: string; shipmentCount: number }>;
  unitsUsed: string[];
}

export interface OperationalReportResult {
  data: OperationalReportGroupedData;
  summary: OperationalReportSummary;
  filters: OperationalReportFilter;
  kpi: OperationalReportKPI;
}

export type DailyGroupType = 'item' | 'customer' | 'vehicle' | 'warehouse';

export interface DailyOutputGroupBase {
  id: string | null;
  name: string;
  type: DailyGroupType;
  satuan?: string; // Unit of measurement for this group, if applicable
  totalQuantity: number;
  totalWeight: number;
  shipmentCount: number;
  shipments: DailyOutputShipment[];
}

export interface DailyOutputShipment {
  shipmentId: string;
  shipmentNumber: string;
  type: SHIPMENT_TYPE;
  verifiedAt: Date | null;
  item: ReportShipmentItemSimple;
  armada: ReportArmada | null;
  plateNumber: string;
}

export interface DailyOutputReportSummary {
  totalGroups: number;
  totalQuantityBySatuan: Array<{ satuan: string; total: number }>;
  totalWeightBySatuan: Array<{ satuan: string; total: number }>;
  totalShipments: number;
  dateRange: { start: string; end: string };
}

export interface DailyOutputReportResult {
  data: DailyOutputGroupBase[];
  summary: DailyOutputReportSummary;
  filters: DailyOutputReportFilter;
  allGroups?: DailyOutputGroupBase[];
}

export interface MonthlyOutputReportResult extends DailyOutputReportResult {
  monthInfo: {
    year: number;
    month: number;
    monthName: string;
    daysInMonth: number;
  };
}

export interface ShipmentAssignment {
  armada: ReportArmada;
  assignments: OperationalReportGroup;
  summary: { PENDING: number; PROSES: number; SELESAI: number; total: number };
}

export interface ShipmentAssignmentReportSummary {
  totalArmada: number;
  totalAssignments: number;
  byStatus: { PENDING: number; PROSES: number; SELESAI: number };
}

export interface ShipmentAssignmentKPI {
  totalAssignedToday: number;
  totalAssignedWeek: number;
  totalAssignedMonth: number;
  mostActiveArmada: {
    id: string;
    model: string;
    plateNumber: string;
    count: number;
  } | null;
  avgShipmentsPerArmadaPerDay: number;
  pendingAssignments: number;
}

export interface ShipmentAssignmentReportResult {
  data: ShipmentAssignment[];
  summary: ShipmentAssignmentReportSummary;
  filters: ShipmentAssignmentReportFilter;
  kpi?: ShipmentAssignmentKPI;
}
