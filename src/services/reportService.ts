import { STATUS } from '@prisma/client';
import moment from 'moment-timezone';
import prisma from '../config/prisma';
import {
  ArmadaInfo,
  DailyOutputGroupBase,
  DailyOutputReportFilter,
  DailyOutputReportResult,
  DashboardSummaryFilter,
  DashboardSummaryResult,
  OperationalReportFilter,
  OperationalReportGroupedData,
  OperationalReportResult,
  PerformanceMetrics,
  RecentActivity,
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
    const { startDate, endDate, type, status, warehouseId } = filters;
    const whereConditions: any = {
      deletedAt: null,
    };
    if (startDate || endDate) {
      whereConditions.createdAt = {};
      if (startDate) {
        // Since DB stores Jakarta time with +7 offset, create date with same offset
        const startMoment = moment.tz(startDate, 'Asia/Jakarta').startOf('day');
        const startDate7Plus = new Date(startMoment.toDate());
        startDate7Plus.setHours(startDate7Plus.getHours() + 7);
        whereConditions.createdAt.gte = startDate7Plus;
      }
      if (endDate) {
        // Since DB stores Jakarta time with +7 offset, create date with same offset
        const endMoment = moment.tz(endDate, 'Asia/Jakarta').endOf('day');
        const endDate7Plus = new Date(endMoment.toDate());
        endDate7Plus.setHours(endDate7Plus.getHours() + 7);
        whereConditions.createdAt.lte = endDate7Plus;
      }
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
                spmbs: {
                  select: {
                    id: true,
                    code: true,
                    warehouseId: true,
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
    // Use filtered shipments for most KPIs, but use all shipments for customer calculations when no status filter
    const filteredShipments = status ? shipments.filter((s) => s.status === status) : shipments;
    const allShipmentsForCustomerCalc = shipments; // Always use all shipments for customer calculations

    // Use date filter for KPI calculations instead of just today
    const startDateForKPI = startDate
      ? moment.tz(startDate, 'Asia/Jakarta').startOf('day')
      : moment.tz('Asia/Jakarta').startOf('day');
    const endDateForKPI = endDate
      ? moment.tz(endDate, 'Asia/Jakarta').endOf('day')
      : moment.tz('Asia/Jakarta').endOf('day');

    // 1. Total Shipments Created in Date Range (all statuses)
    const totalShipmentsCreatedToday = filteredShipments.filter((s) =>
      moment(s.createdAt).isBetween(startDateForKPI, endDateForKPI, 'day', '[]'),
    ).length;
    // 2. Total Shipments Verified in Date Range (filtered only)
    const totalShipmentsVerifiedToday = filteredShipments.filter(
      (s) =>
        s.verifiedAt && moment(s.verifiedAt).isBetween(startDateForKPI, endDateForKPI, 'day', '[]'),
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
    filteredShipments.forEach((s) => {
      s.shipmentItems.forEach((i) => {
        if (!productQtyMap.has(i.product.id)) {
          productQtyMap.set(i.product.id, {
            id: i.product.id,
            name: i.product.name,
            satuan: i.product.satuan,
            totalQuantity: 0,
          });
        }
        productQtyMap.get(i.product.id)!.totalQuantity += i.requestedQuantity || 0;
      });
    });
    const topShippedProducts = Array.from(productQtyMap.values())
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, 3);
    // 6. Most Active Vehicle (use all shipments when no status filter)
    const vehicleMap = new Map<
      string,
      { id: string; model: string; plateNumber: string; shipmentCount: number }
    >();
    allShipmentsForCustomerCalc.forEach((s) => {
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
    const mostActiveVehicle = Array.from(vehicleMap.values())
      .sort((a, b) => b.shipmentCount - a.shipmentCount)
      .slice(0, 3);
    // 7. Top Customers by Shipment Count (use all shipments for customer calculations)
    const customerCountMap = new Map<string, { id: string; name: string; shipmentCount: number }>();
    allShipmentsForCustomerCalc.forEach((s) => {
      // Count unique customers per shipment, not per item
      const customerIds = new Set<string>();
      s.shipmentItems.forEach((i) => {
        customerIds.add(i.deliveryOrder.customer.id);
      });

      customerIds.forEach((customerId) => {
        const customer = s.shipmentItems.find((i) => i.deliveryOrder.customer.id === customerId)
          ?.deliveryOrder.customer;
        if (!customer) return;

        if (!customerCountMap.has(customerId)) {
          customerCountMap.set(customerId, {
            id: customerId,
            name: customer.name,
            shipmentCount: 0,
          });
        }
        customerCountMap.get(customerId)!.shipmentCount += 1;
      });
    });
    const topCustomersByShipmentCount = Array.from(customerCountMap.values())
      .sort((a, b) => b.shipmentCount - a.shipmentCount)
      .slice(0, 3);
    // 8. Top Customers by Volume (use all shipments for customer calculations)
    const customerVolumeMap = new Map<
      string,
      { id: string; name: string; totalQuantity: number }
    >();
    allShipmentsForCustomerCalc.forEach((s) =>
      s.shipmentItems.forEach((i) => {
        const c = i.deliveryOrder.customer;
        if (!customerVolumeMap.has(c.id)) {
          customerVolumeMap.set(c.id, {
            id: c.id,
            name: c.name,
            totalQuantity: 0,
          });
        }
        customerVolumeMap.get(c.id)!.totalQuantity += i.requestedQuantity || 0;
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

    // Apply pagination to all groups combined
    const allShipments = [
      ...groupedData.ANTAR.PENDING,
      ...groupedData.ANTAR.PROSES,
      ...groupedData.ANTAR.SELESAI,
      ...groupedData.JEMPUT.PENDING,
      ...groupedData.JEMPUT.PROSES,
      ...groupedData.JEMPUT.SELESAI,
    ];

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedShipments = allShipments.slice(startIndex, endIndex);

    // Re-group the paginated shipments
    const paginatedGroupedData: OperationalReportGroupedData = {
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

    paginatedShipments.forEach((shipment) => {
      paginatedGroupedData[shipment.type][shipment.status].push(shipment);
    });

    result.data = paginatedGroupedData;

    const pagination = {
      total: allShipments.length,
      page,
      limit,
      totalPages: Math.ceil(allShipments.length / limit),
      hasNext: endIndex < allShipments.length,
      hasPrev: page > 1,
    };

    return {
      ...result,
      kpi,
      pagination,
    };
  },

  /**
   * Get operational report table data only (for pagination)
   * Returns only the shipment data without KPI calculations
   */
  async getOperationalReportTable(
    filters: OperationalReportFilter = {},
    page: number = 1,
    limit: number = 5,
  ): Promise<{
    data: ReportShipment[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const { startDate, endDate, type, status, warehouseId } = filters;
    const whereConditions: any = {
      deletedAt: null,
    };
    if (startDate || endDate) {
      whereConditions.createdAt = {};
      if (startDate) {
        // Since DB stores Jakarta time with +7 offset, create date with same offset
        const startMoment = moment.tz(startDate, 'Asia/Jakarta').startOf('day');
        const startDate7Plus = new Date(startMoment.toDate());
        startDate7Plus.setHours(startDate7Plus.getHours() + 7);
        whereConditions.createdAt.gte = startDate7Plus;
      }
      if (endDate) {
        // Since DB stores Jakarta time with +7 offset, create date with same offset
        const endMoment = moment.tz(endDate, 'Asia/Jakarta').endOf('day');
        const endDate7Plus = new Date(endMoment.toDate());
        endDate7Plus.setHours(endDate7Plus.getHours() + 7);
        whereConditions.createdAt.lte = endDate7Plus;
      }
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
                spmbs: {
                  select: {
                    id: true,
                    code: true,
                    warehouseId: true,
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
      skip: (page - 1) * limit,
      take: limit,
    });

    const tableData: ReportShipment[] = shipments.map((shipment) => {
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

      return {
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
        deliveryOrders: Array.from(deliveryOrderMap.values()),
        totalItems,
        totalWeight,
      };
    });

    // Get total count for pagination
    const totalCount = await prisma.shipment.count({
      where: whereConditions,
    });

    const pagination = {
      total: totalCount,
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      hasNext: page * limit < totalCount,
      hasPrev: page > 1,
    };

    return {
      data: tableData,
      pagination,
    };
  },

  /**
   * Generate output report (Laporan Pengeluaran) - unified for daily/monthly/yearly
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
      period = 'daily',
      startDate,
      endDate,
      year,
      month,
      groupBy = 'item',
      warehouseId,
      customerId,
      armadaId,
      productId,
      status,
    } = filters;

    // Determine date range based on period
    let start: moment.Moment;
    let end: moment.Moment;

    if (period === 'daily') {
      start = startDate
        ? moment.tz(startDate, 'Asia/Jakarta').startOf('day')
        : moment.tz('Asia/Jakarta').startOf('day');
      end = endDate
        ? moment.tz(endDate, 'Asia/Jakarta').endOf('day')
        : moment.tz('Asia/Jakarta').endOf('day');
    } else if (period === 'monthly') {
      if (!year || !month) {
        const now = moment();
        start = moment({
          year: now.year(),
          month: now.month(),
        }).startOf('month');
        end = moment({
          year: now.year(),
          month: now.month(),
        }).endOf('month');
      } else {
        start = moment({
          year,
          month: month - 1,
        }).startOf('month');
        end = moment({
          year,
          month: month - 1,
        }).endOf('month');
      }
    } else if (period === 'yearly') {
      if (!year) {
        const now = moment();
        start = moment({
          year: now.year(),
        }).startOf('year');
        end = moment({
          year: now.year(),
        }).endOf('year');
      } else {
        start = moment({
          year,
        }).startOf('year');
        end = moment({
          year,
        }).endOf('year');
      }
    } else {
      // Default to daily
      start = startDate
        ? moment.tz(startDate, 'Asia/Jakarta').startOf('day')
        : moment.tz('Asia/Jakarta').startOf('day');
      end = endDate
        ? moment.tz(endDate, 'Asia/Jakarta').endOf('day')
        : moment.tz('Asia/Jakarta').endOf('day');
    }

    const whereConditions: any = {
      deletedAt: null,
    };

    // Since DB stores Jakarta time with +7 offset, create date with same offset
    const startDate7Plus = new Date(start.toDate());
    startDate7Plus.setHours(startDate7Plus.getHours() + 7);
    const endDate7Plus = new Date(end.toDate());
    endDate7Plus.setHours(endDate7Plus.getHours() + 7);

    console.log('startDate7Plus', startDate7Plus);
    console.log('endDate7Plus', endDate7Plus);

    if (status === STATUS.SELESAI) {
      whereConditions.verifiedAt = {
        gte: startDate7Plus,
        lte: endDate7Plus,
      };
    } else if (status === STATUS.PENDING || status === STATUS.PROSES) {
      whereConditions.createdAt = {
        gte: startDate7Plus,
        lte: endDate7Plus,
      };
    } else if (!status || status === 'ALL') {
      // For "ALL" status, use createdAt to include all shipments in the date range
      whereConditions.createdAt = {
        gte: startDate7Plus,
        lte: endDate7Plus,
      };
    }

    if (status && status !== 'ALL') {
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
                spmbs: {
                  select: {
                    id: true,
                    code: true,
                    warehouseId: true,
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
          satuan: undefined, // will be set after grouping
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

          // Only add shipment-item combination if it's not already in the group's shipments
          const shipmentItemExists = group.shipments.some((s) => s.shipmentId === shipment.id && s.item.id === item.id);
          if (!shipmentItemExists) {
            // Find SPMB for this delivery order and warehouse
            const spmbForDO = item.deliveryOrder.spmbs.find(
              (spmb) => spmb.warehouseId === item.warehouse.id,
            );

            group.shipments.push({
              shipmentId: shipment.id || '',
              shipmentNumber: shipment.shipmentNumber || '',
              type: shipment.type,
              verifiedAt: shipment.verifiedAt,
              createdAt: shipment.createdAt,
              item: {
                id: item.id || '',
                product: item.product,
                warehouse: item.warehouse,
                requestedQuantity: item.requestedQuantity,
                weightedQuantity: item.weightedQuantity,
                status: item.status,
                locationType: item.locationType,
                deliveryOrder: {
                  id: item.deliveryOrder.id,
                  customer: {
                    id: item.deliveryOrder.customer.id,
                    name: item.deliveryOrder.customer.name,
                  },
                  spmb: spmbForDO
                    ? {
                        id: spmbForDO.id,
                        code: spmbForDO.code,
                      }
                    : null,
                },
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
        period,
        startDate,
        endDate,
        year,
        month,
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
   * Get output report table data only (for pagination) - unified for daily/monthly/yearly
   */
  async getDailyOutputReportTable(
    filters: DailyOutputReportFilter = {},
    page: number = 1,
    limit: number = 5,
  ): Promise<{
    data: DailyOutputGroupBase[];
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
      hasNext: boolean;
      hasPrev: boolean;
    };
  }> {
    const {
      period = 'daily',
      startDate,
      endDate,
      year,
      month,
      groupBy = 'item',
      warehouseId,
      customerId,
      armadaId,
      productId,
      status,
    } = filters;

    // Determine date range based on period
    let start: moment.Moment;
    let end: moment.Moment;

    if (period === 'daily') {
      start = startDate
        ? moment.tz(startDate, 'Asia/Jakarta').startOf('day')
        : moment.tz('Asia/Jakarta').startOf('day');
      end = endDate
        ? moment.tz(endDate, 'Asia/Jakarta').endOf('day')
        : moment.tz('Asia/Jakarta').endOf('day');
    } else if (period === 'monthly') {
      if (!year || !month) {
        const now = moment();
        start = moment({
          year: now.year(),
          month: now.month(),
        }).startOf('month');
        end = moment({
          year: now.year(),
          month: now.month(),
        }).endOf('month');
      } else {
        start = moment({
          year,
          month: month - 1,
        }).startOf('month');
        end = moment({
          year,
          month: month - 1,
        }).endOf('month');
      }
    } else if (period === 'yearly') {
      if (!year) {
        const now = moment();
        start = moment({
          year: now.year(),
        }).startOf('year');
        end = moment({
          year: now.year(),
        }).endOf('year');
      } else {
        start = moment({
          year,
        }).startOf('year');
        end = moment({
          year,
        }).endOf('year');
      }
    } else {
      // Default to daily
      start = startDate
        ? moment.tz(startDate, 'Asia/Jakarta').startOf('day')
        : moment.tz('Asia/Jakarta').startOf('day');
      end = endDate
        ? moment.tz(endDate, 'Asia/Jakarta').endOf('day')
        : moment.tz('Asia/Jakarta').endOf('day');
    }

    const whereConditions: any = {
      deletedAt: null,
    };

    // Since DB stores Jakarta time with +7 offset, create date with same offset
    const startDate7Plus = new Date(start.toDate());
    startDate7Plus.setHours(startDate7Plus.getHours() + 7);
    const endDate7Plus = new Date(end.toDate());
    endDate7Plus.setHours(endDate7Plus.getHours() + 7);

    if (status === STATUS.SELESAI) {
      whereConditions.verifiedAt = {
        gte: startDate7Plus,
        lte: endDate7Plus,
      };
    } else if (status === STATUS.PENDING || status === STATUS.PROSES) {
      whereConditions.createdAt = {
        gte: startDate7Plus,
        lte: endDate7Plus,
      };
    } else if (!status || status === 'ALL') {
      // For "ALL" status, use createdAt to include all shipments in the date range
      whereConditions.createdAt = {
        gte: startDate7Plus,
        lte: endDate7Plus,
      };
    }

    if (status && status !== 'ALL') {
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
                spmbs: {
                  select: {
                    id: true,
                    code: true,
                    warehouseId: true,
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
              satuan: undefined,
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
              satuan: undefined,
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
              satuan: undefined,
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

          // Find SPMB for this delivery order and warehouse
          const spmbForDO = item.deliveryOrder.spmbs.find(
            (spmb) => spmb.warehouseId === item.warehouse.id,
          );

          group.shipments.push({
            shipmentId: shipment.id || '',
            shipmentNumber: shipment.shipmentNumber || '',
            type: shipment.type,
            verifiedAt: shipment.verifiedAt,
            createdAt: shipment.createdAt,
            item: {
              id: item.id || '',
              product: item.product,
              warehouse: item.warehouse,
              requestedQuantity: item.requestedQuantity,
              weightedQuantity: item.weightedQuantity,
              status: item.status,
              locationType: item.locationType,
              deliveryOrder: {
                id: item.deliveryOrder.id,
                customer: {
                  id: item.deliveryOrder.customer.id,
                  name: item.deliveryOrder.customer.name,
                },
                spmb: spmbForDO
                  ? {
                      id: spmbForDO.id,
                      code: spmbForDO.code,
                    }
                  : null,
              },
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

    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedData = data.slice(startIndex, endIndex);

    const pagination = {
      total: data.length,
      page,
      limit,
      totalPages: Math.ceil(data.length / limit),
      hasNext: endIndex < data.length,
      hasPrev: page > 1,
    };

    return {
      data: paginatedData,
      pagination,
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
    const { startDate, endDate, armadaId, warehouseId, status } = filters;
    const whereConditions: any = {
      deletedAt: null,
      armadaId: {
        not: null,
      },
      type: 'ANTAR',
    };
    if (startDate || endDate) {
      whereConditions.createdAt = {};
      if (startDate) {
        // Since DB stores Jakarta time with +7 offset, create date with same offset
        const startMoment = moment.tz(startDate, 'Asia/Jakarta').startOf('day');
        const startDate7Plus = new Date(startMoment.toDate());
        startDate7Plus.setHours(startDate7Plus.getHours() + 7);
        whereConditions.createdAt.gte = startDate7Plus;
      }
      if (endDate) {
        // Since DB stores Jakarta time with +7 offset, create date with same offset
        const endMoment = moment.tz(endDate, 'Asia/Jakarta').endOf('day');
        const endDate7Plus = new Date(endMoment.toDate());
        endDate7Plus.setHours(endDate7Plus.getHours() + 7);
        whereConditions.createdAt.lte = endDate7Plus;
      }
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
                spmbs: {
                  select: {
                    id: true,
                    code: true,
                    warehouseId: true,
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
    const today = moment.tz('Asia/Jakarta').startOf('day');
    const startOfWeek = moment.tz('Asia/Jakarta').startOf('isoWeek');
    const startOfMonth = moment.tz('Asia/Jakarta').startOf('month');
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
    // Get most used verified armadas for today with plate photos from finished shipments
    const todayFinishedShipments = shipments.filter(
      (s) =>
        moment(s.createdAt).isSame(today, 'day') &&
        s.status === 'SELESAI' &&
        s.isVerified === true &&
        s.platePhoto,
    );

    const todayArmadaCountMap = new Map<
      string,
      {
        id: string;
        model: string;
        plateNumber: string;
        count: number;
        platePhotos: string[];
      }
    >();

    todayFinishedShipments.forEach((s) => {
      if (s.armada && s.platePhoto) {
        const key = s.armada.id;
        if (!todayArmadaCountMap.has(key)) {
          todayArmadaCountMap.set(key, {
            id: s.armada.id,
            model: s.armada.model,
            plateNumber: s.armada.plateNumber || '',
            count: 0,
            platePhotos: [],
          });
        }
        const armadaData = todayArmadaCountMap.get(key)!;
        armadaData.count += 1;
        // Add unique plate photos
        if (!armadaData.platePhotos.includes(s.platePhoto)) {
          armadaData.platePhotos.push(s.platePhoto);
        }
      }
    });

    // Get top verified armadas for today with their plate photos
    const topVerifiedArmadas = Array.from(todayArmadaCountMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10) // Limit to top 10
      .map((armadaInfo) => ({
        id: armadaInfo.id,
        model: armadaInfo.model,
        plateNumber: armadaInfo.plateNumber,
        count: armadaInfo.count,
        platePhotos: armadaInfo.platePhotos,
      }));
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
        topVerifiedArmadas,
        pendingAssignments,
      },
    };
  },

  /**
   * Generate comprehensive dashboard summary data with optional date range filtering
   */
  async getDashboardSummary(filters: DashboardSummaryFilter = {}): Promise<DashboardSummaryResult> {
    const { startDate, endDate } = filters;

    console.log('Dashboard Summary - Received filters:', { startDate, endDate });

    // Determine date range - use same pattern as shipment service
    let startOfRange: Date;
    let endOfRange: Date;

    if (startDate) {
      const startMoment = moment.tz(startDate, 'Asia/Jakarta').startOf('day');
      const startDate7Plus = new Date(startMoment.toDate());
      startDate7Plus.setHours(startDate7Plus.getHours() + 7);
      startOfRange = startDate7Plus;
      console.log('Dashboard Summary - Processed startDate:', {
        original: startDate,
        moment: startMoment.format(),
        withOffset: startDate7Plus,
        final: startOfRange,
      });
    } else {
      const todayStart = moment.tz('Asia/Jakarta').startOf('day');
      const todayStart7Plus = new Date(todayStart.toDate());
      todayStart7Plus.setHours(todayStart7Plus.getHours() + 7);
      startOfRange = todayStart7Plus;
      console.log('Dashboard Summary - Default startDate:', {
        todayStart: todayStart.format(),
        withOffset: todayStart7Plus,
        final: startOfRange,
      });
    }

    if (endDate) {
      const endMoment = moment.tz(endDate, 'Asia/Jakarta').endOf('day');
      const endDate7Plus = new Date(endMoment.toDate());
      endDate7Plus.setHours(endDate7Plus.getHours() + 7);
      endOfRange = endDate7Plus;
      console.log('Dashboard Summary - Processed endDate:', {
        original: endDate,
        moment: endMoment.format(),
        withOffset: endDate7Plus,
        final: endOfRange,
      });
    } else {
      const todayEnd = moment.tz('Asia/Jakarta').endOf('day');
      const todayEnd7Plus = new Date(todayEnd.toDate());
      todayEnd7Plus.setHours(todayEnd7Plus.getHours() + 7);
      endOfRange = todayEnd7Plus;
      console.log('Dashboard Summary - Default endDate:', {
        todayEnd: todayEnd.format(),
        withOffset: todayEnd7Plus,
        final: endOfRange,
      });
    }

    try {
      // Get all shipments in date range with related data
      const shipments = await prisma.shipment.findMany({
        where: {
          deletedAt: null,
          createdAt: {
            gte: startOfRange,
            lte: endOfRange,
          },
        },
        include: {
          armada: {
            select: {
              id: true,
              model: true,
              plateNumber: true,
              id_sl: true,
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

      console.log('Dashboard Summary - Shipments found:', {
        count: shipments.length,
        dateRange: { start: startOfRange, end: endOfRange },
        sampleShipments: shipments.slice(0, 3).map((s) => ({
          id: s.id,
          createdAt: s.createdAt,
          status: s.status,
        })),
      });

      // Get basic counts and unprocessed DOs
      const [totalDOs, allArmadas, unprocessedDOs] = await Promise.all([
        // Total active delivery orders
        prisma.deliveryOrder.count({
          where: {
            deletedAt: null,
          },
        }),
        // All armadas
        prisma.armada.findMany({
          select: {
            id: true,
            model: true,
            plateNumber: true,
            id_sl: true,
          },
        }),
        // Unprocessed DOs (PENDING only)
        prisma.deliveryOrder.findMany({
          where: {
            deletedAt: null,
            items: {
              some: {
                pendingQuantity: {
                  gt: 0,
                },
              },
            },
          },
          include: {
            customer: {
              select: {
                id: true,
                name: true,
              },
            },
            items: {
              where: {
                pendingQuantity: {
                  gt: 0,
                },
              },
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    satuan: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'asc',
          },
          take: 10, // Limit to 10 for dashboard
        }),
      ]);

      // Process shipment data for DO summary
      const doSummary = {
        ANTAR: {
          PENDING: 0,
          PROSES: 0,
          SELESAI: 0,
          total: 0,
        },
        JEMPUT: {
          PENDING: 0,
          PROSES: 0,
          SELESAI: 0,
          total: 0,
        },
        overall: {
          PENDING: 0,
          PROSES: 0,
          SELESAI: 0,
          total: 0,
        },
      };

      // Count unique DOs by shipment armada usage and DO status
      const uniqueDOs = new Set<string>();
      const doStatusMap = new Map<string, { status: string; hasArmada: boolean }>();

      shipments.forEach((shipment) => {
        shipment.shipmentItems.forEach((item) => {
          const doId = item.deliveryOrder.id;
          if (!uniqueDOs.has(doId)) {
            uniqueDOs.add(doId);
            const hasArmada = !!shipment.armada;
            doStatusMap.set(doId, {
              status: item.deliveryOrder.status,
              hasArmada: hasArmada,
            });
          }
        });
      });

      // Count DOs by armada usage and status
      doStatusMap.forEach((doInfo) => {
        const type = doInfo.hasArmada ? 'ANTAR' : 'JEMPUT';
        const status = doInfo.status as 'PENDING' | 'PROSES' | 'SELESAI';

        doSummary[type][status]++;
        doSummary[type].total++;
        doSummary.overall[status]++;
        doSummary.overall.total++;
      });

      // Calculate KPI metrics
      const totalShipmentsCreatedToday = shipments.length;
      const totalShipmentsVerifiedToday = shipments.filter(
        (s) =>
          s.verifiedAt && moment(s.verifiedAt).isBetween(startOfRange, endOfRange, 'day', '[]'),
      ).length;

      // Unique products moved
      const productSet = new Set<string>();
      shipments.forEach((s) => s.shipmentItems.forEach((i) => productSet.add(i.product.id)));
      const uniqueProductsMoved = productSet.size;

      // Vehicle usage analysis
      const vehicleMap = new Map<
        string,
        { id: string; model: string; plateNumber: string; shipmentCount: number }
      >();
      shipments.forEach((s) => {
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

      const mostActiveVehicle = Array.from(vehicleMap.values())
        .sort((a, b) => b.shipmentCount - a.shipmentCount)
        .slice(0, 3);

      const vehicleUsageCount = vehicleMap.size;

      // 7-day trendline (for the past 7 days from end date)
      const trendline7Days: Array<{ date: string; shipmentCount: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const day = moment(endOfRange).subtract(i, 'days').startOf('day');
        const count = shipments.filter((s) => moment(s.createdAt).isSame(day, 'day')).length;
        trendline7Days.push({
          date: day.format('YYYY-MM-DD'),
          shipmentCount: count,
        });
      }

      // Recent activities (last 10 shipments)
      const recentActivities: RecentActivity[] = shipments.slice(0, 10).map((s) => ({
        id: s.id,
        shipmentNumber: s.shipmentNumber || '',
        plateNumber: s.armada?.plateNumber || s.plateNumber || null,
        status: s.status,
        createdAt: s.createdAt,
      }));

      // Performance metrics
      const totalShipmentsCompleted = shipments.filter((s) => s.status === STATUS.SELESAI).length;
      const completionRate =
        totalShipmentsCreatedToday > 0
          ? (totalShipmentsCompleted / totalShipmentsCreatedToday) * 100
          : 0;
      const verificationRate =
        totalShipmentsCreatedToday > 0
          ? (totalShipmentsVerifiedToday / totalShipmentsCreatedToday) * 100
          : 0;

      const performanceMetrics: PerformanceMetrics = {
        completionRate: Math.round(completionRate * 100) / 100,
        verificationRate: Math.round(verificationRate * 100) / 100,
        totalShipmentsCreated: totalShipmentsCreatedToday,
        totalShipmentsVerified: totalShipmentsVerifiedToday,
        totalShipmentsCompleted,
        distributionAnalysis: {
          antarTotal: doSummary.ANTAR.total,
          jemputTotal: doSummary.JEMPUT.total,
          antarPercentage:
            doSummary.overall.total > 0
              ? Math.round((doSummary.ANTAR.total / doSummary.overall.total) * 100 * 100) / 100
              : 0,
          jemputPercentage:
            doSummary.overall.total > 0
              ? Math.round((doSummary.JEMPUT.total / doSummary.overall.total) * 100 * 100) / 100
              : 0,
        },
      };

      // Armada data
      const armadaList: ArmadaInfo[] = allArmadas.map((a) => ({
        id: a.id,
        model: a.model,
        plateNumber: a.plateNumber || '',
        id_sl: a.id_sl || '',
      }));

      // Transform unprocessed DOs to the expected format
      const transformedUnprocessedDOs = unprocessedDOs.map((d) => ({
        id: d.id,
        doNumber: d.doNumber,
        customer: d.customer,
        items: d.items.map((item) => ({
          id: item.id,
          product: item.product,
          quantity: item.quantity,
          pendingQuantity: item.pendingQuantity,
        })),
        createdAt: d.createdAt,
        status: d.status,
      }));

      return {
        kpi: {
          totalDOsActive: totalDOs,
          totalShipmentsCreatedToday,
          totalShipmentsVerifiedToday,
          totalArmadas: allArmadas.length,
          uniqueProductsMoved,
          vehicleUsageCount,
          mostActiveVehicle,
          trendline7Days,
        },
        doSummary,
        recentActivities,
        unprocessedDOs: transformedUnprocessedDOs,
        performance: performanceMetrics,
        armada: {
          total: allArmadas.length,
          usageCount: vehicleUsageCount,
          mostActive: mostActiveVehicle[0] || null,
          list: armadaList,
        },
        filters: {
          startDate,
          endDate,
        },
        generatedAt: moment().toISOString(),
        dateRange: {
          start: moment(startOfRange).format('YYYY-MM-DD'),
          end: moment(endOfRange).format('YYYY-MM-DD'),
        },
      };
    } catch (error) {
      console.error('Error generating dashboard summary:', error);
      throw error;
    }
  },
};
