import { STATUS } from '@prisma/client';
import moment from 'moment';
import prisma from '../config/prisma';
import {
  DailyOutputGroupBase,
  DailyOutputReportFilter,
  DailyOutputReportResult,
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
    // Use filtered shipments for most KPIs, but use all shipments for customer calculations when no status filter
    const filteredShipments = status ? shipments.filter((s) => s.status === status) : shipments;
    const allShipmentsForCustomerCalc = shipments; // Always use all shipments for customer calculations

    // Use date filter for KPI calculations instead of just today
    const startDateForKPI = startDate ? moment(startDate).startOf('day') : moment().startOf('day');
    const endDateForKPI = endDate ? moment(endDate).endOf('day') : moment().endOf('day');

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

    console.log(pagination, 'pagniaton');

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
      const defaultStartDate = moment().startOf('day');
      const defaultEndDate = moment().endOf('day');
      start = startDate ? moment(startDate).startOf('day') : defaultStartDate;
      end = endDate ? moment(endDate).endOf('day') : defaultEndDate;
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
      const defaultStartDate = moment().startOf('day');
      const defaultEndDate = moment().endOf('day');
      start = startDate ? moment(startDate).startOf('day') : defaultStartDate;
      end = endDate ? moment(endDate).endOf('day') : defaultEndDate;
    }

    const whereConditions: any = {
      deletedAt: null,
    };

    if (status === STATUS.SELESAI) {
      whereConditions.verifiedAt = {
        gte: start.toDate(),
        lte: end.toDate(),
      };
    } else if (status === STATUS.PENDING || status === STATUS.PROSES) {
      whereConditions.createdAt = {
        gte: start.toDate(),
        lte: end.toDate(),
      };
    } else if (!status || status === 'ALL') {
      // For "ALL" status, use createdAt to include all shipments in the date range
      whereConditions.createdAt = {
        gte: start.toDate(),
        lte: end.toDate(),
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

          // Only add shipment if it's not already in the group's shipments
          const shipmentExists = group.shipments.some((s) => s.shipmentId === shipment.id);
          if (!shipmentExists) {
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
      const defaultStartDate = moment().startOf('day');
      const defaultEndDate = moment().endOf('day');
      start = startDate ? moment(startDate).startOf('day') : defaultStartDate;
      end = endDate ? moment(endDate).endOf('day') : defaultEndDate;
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
      const defaultStartDate = moment().startOf('day');
      const defaultEndDate = moment().endOf('day');
      start = startDate ? moment(startDate).startOf('day') : defaultStartDate;
      end = endDate ? moment(endDate).endOf('day') : defaultEndDate;
    }

    const whereConditions: any = {
      deletedAt: null,
    };

    if (status === STATUS.SELESAI) {
      whereConditions.verifiedAt = {
        gte: start.toDate(),
        lte: end.toDate(),
      };
    } else if (status === STATUS.PENDING || status === STATUS.PROSES) {
      whereConditions.createdAt = {
        gte: start.toDate(),
        lte: end.toDate(),
      };
    } else if (!status || status === 'ALL') {
      // For "ALL" status, use createdAt to include all shipments in the date range
      whereConditions.createdAt = {
        gte: start.toDate(),
        lte: end.toDate(),
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
};
