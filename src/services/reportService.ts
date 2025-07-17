import { STATUS } from '@prisma/client';
import moment from 'moment';
import prisma from '../config/prisma';
import {
  DailyOutputGroupBase,
  DailyOutputReportFilter,
  DailyOutputReportResult,
  DashboardSummary,
  MonthlyOutputReportFilter,
  MonthlyOutputReportResult,
  OperationalReportFilter,
  OperationalReportGroupedData,
  OperationalReportResult,
  ReportShipment,
  ShipmentAssignment,
  ShipmentAssignmentReportFilter,
  ShipmentAssignmentReportResult,
} from '../types/report';

/**
 * Service for handling report operations
 */
export default {
  /**
   * Generate operational report (Laporan Operasional)
   * Shows pending, ongoing, and completed delivery orders divided by ANTAR and JEMPUT
   */
  async getOperationalReport(
    filters: OperationalReportFilter = {},
    page: number = 1,
    limit: number = 10,
  ): Promise<
    OperationalReportResult & {
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    }
  > {
    const {
      startDate, endDate, type, status, warehouseId, 
    } = filters;
    const whereConditions: any = {
      deletedAt: null,
    };
    if (startDate || endDate) {
      whereConditions.createdAt = {};
      if (startDate) whereConditions.createdAt.gte = moment(startDate).startOf('day').toDate();
      if (endDate) whereConditions.createdAt.lte = moment(endDate).endOf('day').toDate();
    }
    if (type) whereConditions.type = type;
    if (status) whereConditions.status = status;
    if (warehouseId) {
      whereConditions.shipmentItems = {
        some: {
          warehouseId,
        },
      };
    }
    const shipments = await prisma.shipment.findMany({
      where: whereConditions,
      include: {
        armada: {
          select: {
            id: true,
            model: true,
            plateNumber: true,
          },
        },
        shipmentItems: {
          include: {
            deliveryOrder: {
              include: {
                customer: {
                  select: {
                    id: true,
                    name: true,
                    address: true,
                  },
                },
              },
            },
            product: {
              select: {
                id: true,
                name: true,
                satuan: true,
              },
            },
            warehouse: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    const groupedData: OperationalReportGroupedData = {
      ANTAR: {
        PENDING: [],
        PROSES: [],
        SELESAI: [],
      },
      JEMPUT: {
        PENDING: [],
        PROSES: [],
        SELESAI: [],
      },
    };
    shipments.forEach((shipment) => {
      const shipmentData: ReportShipment = {
        id: shipment.id,
        shipmentNumber: shipment.shipmentNumber || '',
        type: shipment.type,
        status: shipment.status,
        plateNumber: shipment.plateNumber || '',
        armada: shipment.armada
          ? {
            id: shipment.armada.id,
            model: shipment.armada.model,
            plateNumber: shipment.armada.plateNumber || '',
          }
          : null,
        createdAt: shipment.createdAt,
        updatedAt: shipment.updatedAt,
        verifiedAt: shipment.verifiedAt,
        isVerified: shipment.isVerified,
        deliveryOrders: [],
        totalItems: 0,
        totalWeight: 0,
      };

      const deliveryOrderMap = new Map();
      let totalItems = 0;
      let totalWeight = 0;
      shipment.shipmentItems.forEach((item) => {
        const doId = item.deliveryOrder.id;
        if (!deliveryOrderMap.has(doId)) {
          deliveryOrderMap.set(doId, {
            id: item.deliveryOrder.id,
            doNumber: item.deliveryOrder.doNumber,
            customer: item.deliveryOrder.customer,
            items: [],
          });
        }
        const deliveryOrder = deliveryOrderMap.get(doId);
        deliveryOrder.items.push({
          id: item.id || '',
          product: item.product,
          warehouse: item.warehouse,
          requestedQuantity: item.requestedQuantity,
          weightedQuantity: item.weightedQuantity,
          status: item.status,
          locationType: item.locationType,
        });
        totalItems += item.requestedQuantity;
        totalWeight += item.weightedQuantity || 0;
      });
      shipmentData.deliveryOrders = Array.from(deliveryOrderMap.values());
      shipmentData.totalItems = totalItems;
      shipmentData.totalWeight = totalWeight;
      groupedData[shipment.type][shipment.status].push(shipmentData);
    });
    const summary = {
      ANTAR: {
        PENDING: groupedData.ANTAR.PENDING.length,
        PROSES: groupedData.ANTAR.PROSES.length,
        SELESAI: groupedData.ANTAR.SELESAI.length,
        total:
          groupedData.ANTAR.PENDING.length +
          groupedData.ANTAR.PROSES.length +
          groupedData.ANTAR.SELESAI.length,
      },
      JEMPUT: {
        PENDING: groupedData.JEMPUT.PENDING.length,
        PROSES: groupedData.JEMPUT.PROSES.length,
        SELESAI: groupedData.JEMPUT.SELESAI.length,
        total:
          groupedData.JEMPUT.PENDING.length +
          groupedData.JEMPUT.PROSES.length +
          groupedData.JEMPUT.SELESAI.length,
      },
      overall: {
        PENDING: groupedData.ANTAR.PENDING.length + groupedData.JEMPUT.PENDING.length,
        PROSES: groupedData.ANTAR.PROSES.length + groupedData.JEMPUT.PROSES.length,
        SELESAI: groupedData.ANTAR.SELESAI.length + groupedData.JEMPUT.SELESAI.length,
        total: shipments.length,
      },
    };
    const result = {
      data: groupedData,
      summary,
      filters: {
        startDate,
        endDate,
        type,
        status,
        warehouseId,
      },
    };
    // --- KPI CALCULATION START ---
    // Use filtered shipments for all KPIs
    const filteredShipments = status ? shipments.filter((s) => s.status === status) : shipments;
    const today = moment().startOf('day');
    // 1. Total Shipments Created Today (all statuses)
    const totalShipmentsCreatedToday = filteredShipments.filter((s) =>
      moment(s.createdAt).isSame(today, 'day'),
    ).length;
    // 2. Total Shipments Verified Today (filtered only)
    const totalShipmentsVerifiedToday = filteredShipments.filter(
      (s) => s.verifiedAt && moment(s.verifiedAt).isSame(today, 'day'),
    ).length;
    // 3. Unique Products Moved (filtered only)
    const productSet = new Set<string>();
    filteredShipments.forEach((s) => s.shipmentItems.forEach((i) => productSet.add(i.product.id)));
    const uniqueProductsMoved = productSet.size;
    // 4. Dispatched Totals by Unit (satuan, filtered only)
    const unitMap = new Map<string, number>();
    filteredShipments.forEach((s) =>
      s.shipmentItems.forEach((i) => {
        if (!i.product.satuan) return;
        unitMap.set(
          String(i.product.satuan),
          (unitMap.get(String(i.product.satuan)) || 0) + (i.weightedQuantity || 0),
        );
      }),
    );
    const dispatchedTotalsByUnit = Array.from(unitMap.entries()).map(([satuan, totalQuantity]) => ({
      satuan,
      totalQuantity,
    }));
    // 5. Top 3 Shipped Products (filtered only)
    const productQtyMap = new Map<
      string,
      { id: string; name: string; satuan: string; totalQuantity: number }
    >();
    filteredShipments.forEach((s) =>
      s.shipmentItems.forEach((i) => {
        if (!productQtyMap.has(i.product.id)) {
          productQtyMap.set(i.product.id, {
            id: i.product.id,
            name: i.product.name,
            satuan: i.product.satuan,
            totalQuantity: 0,
          });
        }
        productQtyMap.get(i.product.id)!.totalQuantity += i.weightedQuantity || 0;
      }),
    );
    const topShippedProducts = Array.from(productQtyMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 3);
    // 6. Most Active Vehicle (filtered only)
    const vehicleMap = new Map<
      string,
      { id: string; model: string; plateNumber: string; shipmentCount: number }
    >();
    filteredShipments.forEach((s) => {
      if (s.armada) {
        const key = s.armada.id;
        if (!vehicleMap.has(key)) {
          vehicleMap.set(key, {
            id: s.armada.id,
            model: s.armada.model,
            plateNumber: s.armada.plateNumber || '',
            shipmentCount: 0,
          });
        }
        vehicleMap.get(key)!.shipmentCount += 1;
      }
    });
    const mostActiveVehicle =
      Array.from(vehicleMap.values()).sort((a, b) => b.shipmentCount - a.shipmentCount)[0] || null;
    // 7. Top Customers by Shipment Count (filtered only)
    const customerCountMap = new Map<string, { id: string; name: string; shipmentCount: number }>();
    filteredShipments.forEach((s) =>
      s.shipmentItems.forEach((i) => {
        const c = i.deliveryOrder.customer;
        if (!customerCountMap.has(c.id)) {
          customerCountMap.set(c.id, {
            id: c.id,
            name: c.name,
            shipmentCount: 0,
          });
        }
        customerCountMap.get(c.id)!.shipmentCount += 1;
      }),
    );
    const topCustomersByShipmentCount = Array.from(customerCountMap.values())
      .sort((a, b) => b.shipmentCount - a.shipmentCount)
      .slice(0, 3);
    // 8. Top Customers by Volume (filtered only)
    const customerVolumeMap = new Map<
      string,
      { id: string; name: string; totalQuantity: number }
    >();
    filteredShipments.forEach((s) =>
      s.shipmentItems.forEach((i) => {
        const c = i.deliveryOrder.customer;
        if (!customerVolumeMap.has(c.id)) {
          customerVolumeMap.set(c.id, {
            id: c.id,
            name: c.name,
            totalQuantity: 0,
          });
        }
        customerVolumeMap.get(c.id)!.totalQuantity += i.weightedQuantity || 0;
      }),
    );
    const topCustomersByVolume = Array.from(customerVolumeMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 3);
    // 9. Vehicle Usage Count (filtered only)
    const vehicleUsageCount = vehicleMap.size;
    // 10. Trendline 7 Days (filtered only)
    const trendline7Days: Array<{ date: string; shipmentCount: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const day = moment().subtract(i, 'days').startOf('day');
      const count = filteredShipments.filter((s) => moment(s.createdAt).isSame(day, 'day')).length;
      trendline7Days.push({
        date: String(day.format('YYYY-MM-DD')),
        shipmentCount: Number(count),
      });
    }
    // 11. Units Used (filtered only)
    const unitsUsed = Array.from(unitMap.keys()).filter(
      (u): u is string => typeof u === 'string' && u !== 'null' && u !== 'undefined',
    );
    // --- KPI CALCULATION END ---
    const kpi = {
      totalShipmentsCreatedToday,
      totalShipmentsVerifiedToday,
      uniqueProductsMoved,
      dispatchedTotalsByUnit,
      topShippedProducts,
      mostActiveVehicle,
      topCustomersByShipmentCount,
      topCustomersByVolume,
      vehicleUsageCount,
      trendline7Days,
      unitsUsed,
    };
    // At the end, paginate each group (example: ANTAR.PENDING)
    // For demonstration, paginate ANTAR.PENDING only (customize as needed)
    const groupToPaginate = result.data.ANTAR.PENDING;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedGroup = groupToPaginate.slice(startIndex, endIndex);
    result.data.ANTAR.PENDING = paginatedGroup;
    const pagination = {
      total: groupToPaginate.length,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(groupToPaginate.length / limit)),
      hasNext: endIndex < groupToPaginate.length,
      hasPrev: page > 1,
    };
    return {
      ...result,
      kpi,
      pagination,
    };
  },

  /**
   * Generate daily output report (Laporan Pengeluaran Harian)
   * Can be grouped by item, customer, vehicle, or warehouse
   */
  async getDailyOutputReport(
    filters: DailyOutputReportFilter = {},
    page: number = 1,
    limit: number = 10,
  ): Promise<
    DailyOutputReportResult & {
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    }
  > {
    const {
      startDate,
      endDate,
      groupBy = 'item',
      warehouseId,
      customerId,
      armadaId,
      productId,
      status,
    } = filters;
    const defaultStartDate = moment().startOf('day');
    const defaultEndDate = moment().endOf('day');
    const start = startDate ? moment(startDate).startOf('day') : defaultStartDate;
    const end = endDate ? moment(endDate).endOf('day') : defaultEndDate;
    const whereConditions: any = {
      deletedAt: null,
    };
    if (status === STATUS.SELESAI || !status) {
      whereConditions.verifiedAt = {
        gte: start.toDate(),
        lte: end.toDate(),
      };
    } else if (status === STATUS.PENDING || status === STATUS.PROSES) {
      whereConditions.createdAt = {
        gte: start.toDate(),
        lte: end.toDate(),
      };
    }
    if (status) {
      whereConditions.status = status;
    }
    if (warehouseId) {
      whereConditions.shipmentItems = {
        some: {
          warehouseId,
        },
      };
    }
    if (armadaId) {
      whereConditions.armadaId = armadaId;
    }
    const shipments = await prisma.shipment.findMany({
      where: whereConditions,
      include: {
        armada: {
          select: {
            id: true,
            model: true,
            plateNumber: true,
          },
        },
        shipmentItems: {
          include: {
            deliveryOrder: {
              include: {
                customer: {
                  select: {
                    id: true,
                    name: true,
                    address: true,
                  },
                },
              },
            },
            product: {
              select: {
                id: true,
                name: true,
                satuan: true,
              },
            },
            warehouse: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        verifiedAt: 'desc',
      },
    });
    const groupedData: DailyOutputGroupBase[] = [];
    let _totalQuantity: number = 0;
    let _totalWeight: number = 0;
    shipments.forEach((shipment) => {
      shipment.shipmentItems.forEach((item) => {
        if (productId && item.product.id !== productId) return;
        if (warehouseId && item.warehouse.id !== warehouseId) return;
        if (customerId && item.deliveryOrder.customer.id !== customerId) return;
        let groupKey = '';
        let groupInfo: DailyOutputGroupBase = {
          id: null,
          name: '',
          type: groupBy,
          satuan: undefined,
          totalQuantity: 0,
          totalWeight: 0,
          shipmentCount: 0,
          shipments: [],
        };
        switch (groupBy) {
        case 'item':
          groupKey = item.product.id;
          groupInfo = {
            id: item.product.id,
            name: item.product.name,
            type: 'item',
            satuan: item.product.satuan,
            totalQuantity: 0,
            totalWeight: 0,
            shipmentCount: 0,
            shipments: [],
          };
          break;
        case 'customer':
          groupKey = item.deliveryOrder.customer.id;
          groupInfo = {
            id: item.deliveryOrder.customer.id,
            name: item.deliveryOrder.customer.name,
            type: 'customer',
            satuan: undefined, // will be set after grouping
            totalQuantity: 0,
            totalWeight: 0,
            shipmentCount: 0,
            shipments: [],
          };
          break;
        case 'vehicle':
          groupKey = shipment.armada?.id || 'no-vehicle';
          groupInfo = {
            id: shipment.armada?.id || 'no-vehicle',
            name: shipment.armada?.model || 'Tanpa Armada',
            type: 'vehicle',
            satuan: undefined, // will be set after grouping
            totalQuantity: 0,
            totalWeight: 0,
            shipmentCount: 0,
            shipments: [],
          };
          break;
        case 'warehouse':
          groupKey = item.warehouse.id;
          groupInfo = {
            id: item.warehouse.id,
            name: item.warehouse.name,
            type: 'warehouse',
            satuan: undefined, // will be set after grouping
            totalQuantity: 0,
            totalWeight: 0,
            shipmentCount: 0,
            shipments: [],
          };
          break;
        }
        if (!groupedData.some((g) => g.id === groupKey)) {
          groupedData.push(groupInfo);
        }
        const group = groupedData.find((g) => g.id === groupKey);
        if (group) {
          group.totalQuantity += item.requestedQuantity;
          group.totalWeight += item.weightedQuantity || 0;
          group.shipments.push({
            shipmentId: shipment.id || '',
            shipmentNumber: shipment.shipmentNumber || '',
            type: shipment.type,
            verifiedAt: shipment.verifiedAt,
            item: {
              id: item.id || '',
              product: item.product,
              warehouse: item.warehouse,
              requestedQuantity: item.requestedQuantity,
              weightedQuantity: item.weightedQuantity,
              status: item.status,
              locationType: item.locationType,
            },
            armada: shipment.armada
              ? {
                id: shipment.armada.id,
                model: shipment.armada.model,
                plateNumber: shipment.armada.plateNumber || '',
              }
              : null,
            plateNumber: shipment.plateNumber || '',
          });
          group.shipmentCount++;
        }
        _totalQuantity += item.requestedQuantity;
        _totalWeight += item.weightedQuantity || 0;
      });
    });
    // After grouping, set satuan for non-item groupings
    if (groupBy !== 'item') {
      groupedData.forEach((group) => {
        const satuanSet = new Set<string>();
        group.shipments.forEach((s) => {
          if (s.item.product.satuan) satuanSet.add(s.item.product.satuan);
        });
        if (satuanSet.size === 1) {
          group.satuan = Array.from(satuanSet)[0];
        } else if (satuanSet.size > 1) {
          group.satuan = 'Campuran';
        } else {
          group.satuan = undefined;
        }
      });
    }
    const data = groupedData.sort(
      (a: DailyOutputGroupBase, b: DailyOutputGroupBase) => b.totalQuantity - a.totalQuantity,
    );
    // Calculate summary from all groups (not just paginated)
    // Group totalQuantity and totalWeight by satuan
    const quantityBySatuanMap = new Map<string, number>();
    const weightBySatuanMap = new Map<string, number>();
    data.forEach((g) => {
      const satuan = g.satuan || 'Unknown';
      quantityBySatuanMap.set(satuan, (quantityBySatuanMap.get(satuan) || 0) + g.totalQuantity);
      weightBySatuanMap.set(satuan, (weightBySatuanMap.get(satuan) || 0) + g.totalWeight);
    });
    const totalQuantityBySatuan = Array.from(quantityBySatuanMap.entries()).map(
      ([satuan, total]) => ({
        satuan,
        total,
      }),
    );
    const totalWeightBySatuan = Array.from(weightBySatuanMap.entries()).map(([satuan, total]) => ({
      satuan,
      total,
    }));
    const summary = {
      totalGroups: data.length,
      totalQuantityBySatuan,
      totalWeightBySatuan,
      totalShipments: data.reduce((sum, g) => sum + g.shipmentCount, 0),
      dateRange: {
        start: start.format('YYYY-MM-DD'),
        end: end.format('YYYY-MM-DD'),
      },
    };
    const allData = data;
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = allData.slice(startIndex, endIndex);
    const pagination = {
      total: allData.length,
      page,
      limit,
      totalPages: Math.ceil(allData.length / limit),
      hasNext: endIndex < allData.length,
      hasPrev: page > 1,
    };
    return {
      data: paginatedData,
      allGroups: allData,
      summary,
      filters: {
        startDate,
        endDate,
        groupBy,
        warehouseId,
        customerId,
        armadaId,
        productId,
        status,
      },
      pagination,
    };
  },

  /**
   * Generate monthly output report (Laporan Pengeluaran Bulanan)
   * Similar to daily but aggregated by month
   */
  async getMonthlyOutputReport(
    filters: MonthlyOutputReportFilter,
    page: number = 1,
    limit: number = 10,
  ): Promise<
    MonthlyOutputReportResult & {
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    }
  > {
    const {
      year, month, groupBy = 'item', warehouseId, customerId, armadaId, productId, 
    } = filters;
    const startDate = moment({
      year,
      month: month - 1,
    }).startOf('month');
    const endDate = moment({
      year,
      month: month - 1,
    }).endOf('month');
    const dailyFilters: DailyOutputReportFilter = {
      startDate: startDate.format('YYYY-MM-DD'),
      endDate: endDate.format('YYYY-MM-DD'),
      groupBy,
      warehouseId,
      customerId,
      armadaId,
      productId,
    };
    const dailyReport = await this.getDailyOutputReport(dailyFilters, page, limit);
    // summary is already grouped by satuan in dailyReport
    const allData = dailyReport.data; // replace with actual data array
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = allData.slice(startIndex, endIndex);
    const pagination = {
      total: allData.length,
      page,
      limit,
      totalPages: Math.ceil(allData.length / limit),
      hasNext: endIndex < allData.length,
      hasPrev: page > 1,
    };
    return {
      ...dailyReport,
      data: paginatedData,
      pagination,
      monthInfo: {
        year,
        month,
        monthName: startDate.format('MMMM'),
        daysInMonth: startDate.daysInMonth(),
      },
    };
  },

  /**
   * Generate shipment assignment report (Laporan Penugasan Pengiriman)
   * Shows which armada are assigned to active shipments
   */
  async getShipmentAssignmentReport(
    filters: ShipmentAssignmentReportFilter = {},
    page: number = 1,
    limit: number = 10,
  ): Promise<
    ShipmentAssignmentReportResult & {
      pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
      };
    }
  > {
    const {
      startDate, endDate, armadaId, warehouseId, status, 
    } = filters;
    const whereConditions: any = {
      deletedAt: null,
      armadaId: {
        not: null,
      },
      type: 'ANTAR',
    };
    if (startDate || endDate) {
      whereConditions.createdAt = {};
      if (startDate) whereConditions.createdAt.gte = moment(startDate).startOf('day').toDate();
      if (endDate) whereConditions.createdAt.lte = moment(endDate).endOf('day').toDate();
    }
    if (status) whereConditions.status = status;
    if (armadaId) whereConditions.armadaId = armadaId;
    if (warehouseId) {
      whereConditions.shipmentItems = {
        some: {
          warehouseId,
        },
      };
    }
    const shipments = await prisma.shipment.findMany({
      where: whereConditions,
      include: {
        armada: {
          select: {
            id: true,
            model: true,
            plateNumber: true,
            id_sl: true,
            description: true,
          },
        },
        shipmentItems: {
          include: {
            deliveryOrder: {
              include: {
                customer: {
                  select: {
                    id: true,
                    name: true,
                    address: true,
                  },
                },
              },
            },
            product: {
              select: {
                id: true,
                name: true,
                satuan: true,
              },
            },
            warehouse: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    // KPIs
    const today = moment().startOf('day');
    const startOfWeek = moment().startOf('isoWeek');
    const startOfMonth = moment().startOf('month');
    const totalAssignedToday = shipments.filter((s) =>
      moment(s.createdAt).isSame(today, 'day'),
    ).length;
    const totalAssignedWeek = shipments.filter((s) =>
      moment(s.createdAt).isSameOrAfter(startOfWeek),
    ).length;
    const totalAssignedMonth = shipments.filter((s) =>
      moment(s.createdAt).isSameOrAfter(startOfMonth),
    ).length;
    // Most Active Armada
    const armadaCountMap = new Map<
      string,
      { id: string; model: string; plateNumber: string; count: number }
    >();
    shipments.forEach((s) => {
      if (s.armada) {
        const key = s.armada.id;
        if (!armadaCountMap.has(key)) {
          armadaCountMap.set(key, {
            id: s.armada.id,
            model: s.armada.model,
            plateNumber: s.armada.plateNumber || '',
            count: 0,
          });
        }
        armadaCountMap.get(key)!.count += 1;
      }
    });
    const mostActiveArmada =
      Array.from(armadaCountMap.values()).sort((a, b) => b.count - a.count)[0] || null;
    // Average Shipments per Armada per Day (for the period)
    let periodDays = 1;
    if (startDate && endDate) {
      periodDays = moment(endDate).endOf('day').diff(moment(startDate).startOf('day'), 'days') + 1;
    } else if (startDate) {
      periodDays = moment().endOf('day').diff(moment(startDate).startOf('day'), 'days') + 1;
    } else if (endDate) {
      periodDays = moment(endDate).endOf('day').diff(moment().startOf('day'), 'days') + 1;
    }
    const avgShipmentsPerArmadaPerDay =
      armadaCountMap.size > 0 && periodDays > 0
        ? shipments.length / armadaCountMap.size / periodDays
        : 0;
    // Pending Assignments (status != SELESAI)
    const pendingAssignments = shipments.filter((s) => s.status !== 'SELESAI').length;
    // Grouped by armada for table/chart
    const groupedByArmada: ShipmentAssignment[] = [];
    shipments.forEach((shipment) => {
      const armadaKey = shipment.armada!.id;
      if (!groupedByArmada.some((a) => a.armada.id === armadaKey)) {
        groupedByArmada.push({
          armada: {
            id: shipment.armada!.id,
            model: shipment.armada!.model,
            plateNumber: shipment.armada!.plateNumber || '',
          },
          assignments: {
            PENDING: [],
            PROSES: [],
            SELESAI: [],
          },
          summary: {
            PENDING: 0,
            PROSES: 0,
            SELESAI: 0,
            total: 0,
          },
        });
      }
      const assignmentData: ReportShipment = {
        id: shipment.id || '',
        shipmentNumber: shipment.shipmentNumber || '',
        type: shipment.type,
        status: shipment.status,
        plateNumber: shipment.plateNumber || '',
        armada: shipment.armada
          ? {
            id: shipment.armada.id,
            model: shipment.armada.model,
            plateNumber: shipment.armada.plateNumber || '',
          }
          : null,
        createdAt: shipment.createdAt,
        updatedAt: shipment.updatedAt,
        verifiedAt: shipment.verifiedAt,
        isVerified: shipment.isVerified,
        deliveryOrders: [],
        totalItems: 0,
        totalWeight: 0,
      };
      const deliveryOrderMap = new Map();
      let totalItems = 0;
      let totalWeight = 0;
      shipment.shipmentItems.forEach((item) => {
        const doId = item.deliveryOrder.id;
        if (!deliveryOrderMap.has(doId)) {
          deliveryOrderMap.set(doId, {
            id: item.deliveryOrder.id,
            doNumber: item.deliveryOrder.doNumber,
            customer: item.deliveryOrder.customer,
            items: [],
          });
        }
        const deliveryOrder = deliveryOrderMap.get(doId);
        deliveryOrder.items.push({
          id: item.id || '',
          product: item.product,
          warehouse: item.warehouse,
          requestedQuantity: item.requestedQuantity,
          weightedQuantity: item.weightedQuantity,
          status: item.status,
          locationType: item.locationType,
        });
        totalItems += item.requestedQuantity;
        totalWeight += item.weightedQuantity || 0;
      });
      assignmentData.deliveryOrders = Array.from(deliveryOrderMap.values());
      assignmentData.totalItems = totalItems;
      assignmentData.totalWeight = totalWeight;
      const armadaGroup = groupedByArmada.find((a) => a.armada.id === armadaKey);
      if (armadaGroup) {
        armadaGroup.assignments[shipment.status].push(assignmentData);
        armadaGroup.summary[shipment.status]++;
        armadaGroup.summary.total++;
      }
    });
    const data = groupedByArmada;
    const overallSummary = {
      totalArmada: data.length,
      totalAssignments: shipments.length,
      byStatus: {
        PENDING: 0,
        PROSES: 0,
        SELESAI: 0,
      },
    };
    data.forEach((armadaData: ShipmentAssignment) => {
      overallSummary.byStatus.PENDING += armadaData.summary.PENDING;
      overallSummary.byStatus.PROSES += armadaData.summary.PROSES;
      overallSummary.byStatus.SELESAI += armadaData.summary.SELESAI;
    });
    const allData = data; // replace with actual data array
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = allData.slice(startIndex, endIndex);
    const pagination = {
      total: allData.length,
      page,
      limit,
      totalPages: Math.ceil(allData.length / limit),
      hasNext: endIndex < allData.length,
      hasPrev: page > 1,
    };
    return {
      data: paginatedData,
      summary: overallSummary,
      filters: {
        startDate,
        endDate,
        armadaId,
        warehouseId,
        status,
      },
      pagination,
      kpi: {
        totalAssignedToday,
        totalAssignedWeek,
        totalAssignedMonth,
        mostActiveArmada,
        avgShipmentsPerArmadaPerDay,
        pendingAssignments,
      },
    };
  },

  /**
   * Get dashboard summary for all reports
   */
  async getDashboardSummary(): Promise<DashboardSummary> {
    const today = moment().startOf('day');
    const endOfToday = moment().endOf('day');
    const operationalToday = await this.getOperationalReport({
      startDate: today.format('YYYY-MM-DD'),
      endDate: endOfToday.format('YYYY-MM-DD'),
    });
    const outputToday = await this.getDailyOutputReport({
      startDate: today.format('YYYY-MM-DD'),
      endDate: endOfToday.format('YYYY-MM-DD'),
    });
    const currentMonth = moment();
    const monthlyOutput = await this.getMonthlyOutputReport({
      year: currentMonth.year(),
      month: currentMonth.month() + 1,
    });
    const activeAssignments = await this.getShipmentAssignmentReport({
      status: STATUS.PROSES,
    });
    return {
      today: {
        date: today.format('YYYY-MM-DD'),
        operational: operationalToday.summary,
        output: outputToday.summary,
      },
      thisMonth: {
        year: currentMonth.year(),
        month: currentMonth.month() + 1,
        monthName: currentMonth.format('MMMM'),
        output: monthlyOutput.summary,
      },
      activeAssignments: activeAssignments.summary,
    };
  },
};
