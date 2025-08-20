import dotenv from 'dotenv';
import fs from 'fs';
import moment from 'moment-timezone';
import path from 'path';
import { promisify } from 'util';
import * as XLSX from 'xlsx';
import prisma from '../config/prisma';

// Convert callback-based fs functions to Promise-based
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);
dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

const PUBLIC_DIR = isProd
  ? '/var/www/sajpoutbound.com/public'
  : path.join(process.cwd(), 'src', 'public');
const REPORTS_DIR = path.join(PUBLIC_DIR, 'reports');

// Ensure directories exist
const ensureDirectoriesExist = async () => {
  if (!(await existsAsync(PUBLIC_DIR))) {
    await mkdirAsync(PUBLIC_DIR, {
      recursive: true,
    });
  }
  if (!(await existsAsync(REPORTS_DIR))) {
    await mkdirAsync(REPORTS_DIR, {
      recursive: true,
    });
  }
};

// Initialize directories when service is loaded
ensureDirectoriesExist().catch((err) => {
  console.error('Failed to create reports directories:', err);
});

type ExpenditureReportFilters = {
  period?: 'daily' | 'monthly' | 'yearly';
  startDate?: string;
  endDate?: string;
  year?: number;
  month?: number;
  warehouseId?: string;
};

type ExpenditureItem = {
  no: number;
  tanggal: string;
  noSpmb: string;
  namaCustomer: string;
  namaBarang: string;
  qty: number;
  netto: number;
  nomorPlat: string;
  ekspedisi: string;
};

export default {
  async generateExpenditureExcel(filters: ExpenditureReportFilters = {}): Promise<string> {
    await ensureDirectoriesExist();

    const { period = 'daily', startDate, endDate, year, month, warehouseId } = filters;

    // Determine date range based on period (same logic as getDailyOutputReport)
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

    // Build where conditions
    const whereConditions: any = {
      deletedAt: null,
      status: 'SELESAI', // Only completed shipments
      verifiedAt: {
        gte: start.toDate(),
        lte: end.toDate(),
      },
    };

    if (warehouseId) {
      whereConditions.shipmentItems = {
        some: {
          warehouseId,
        },
      };
    }

    // Get warehouse name if filtering by warehouse
    let warehouseName = '';
    if (warehouseId) {
      const warehouse = await prisma.warehouse.findUnique({
        where: { id: warehouseId },
        select: { name: true },
      });
      warehouseName = warehouse?.name || '';
    }

    // Fetch shipment data
    const shipments = await prisma.shipment.findMany({
      where: whereConditions,
      include: {
        armada: {
          select: {
            plateNumber: true,
          },
        },
        spmbs: {
          select: {
            code: true,
            deliveryOrderId: true,
          },
        },
        shipmentItems: {
          include: {
            deliveryOrder: {
              include: {
                customer: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            product: {
              select: {
                name: true,
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
        chosenProducts: {
          include: {
            weighings: {
              select: {
                netWeight: true,
              },
            },
          },
        },
      },
      orderBy: {
        verifiedAt: 'asc',
      },
    });

    // Transform data into Excel format
    const excelData: ExpenditureItem[] = [];
    let rowNumber = 1;

    shipments.forEach((shipment) => {
      shipment.shipmentItems.forEach((item) => {
        // Skip if warehouse filter doesn't match
        if (warehouseId && item.warehouse.id !== warehouseId) {
          return;
        }

        // Calculate netto from weighings for this specific product
        const chosenProduct = shipment.chosenProducts.find((cp) => cp.productId === item.productId);

        const totalNetto =
          chosenProduct?.weighings.reduce((sum, weighing) => sum + (weighing.netWeight || 0), 0) ||
          0;

        // Determine expedition type (ANTAR if has armada, JEMPUT if no armada)
        const ekspedisi = shipment.armada ? 'ANTAR' : 'JEMPUT';

        // Find SPMB for this delivery order
        const spmbForDO = shipment.spmbs.find(
          (spmb) => spmb.deliveryOrderId === item.deliveryOrderId,
        );

        const rowData = {
          no: rowNumber++,
          tanggal: moment(shipment.verifiedAt).tz('Asia/Jakarta').format('DD-MM-YYYY'),
          noSpmb: spmbForDO?.code || '',
          namaCustomer: item.deliveryOrder.customer.name,
          namaBarang: item.product.name,
          qty: item.requestedQuantity,
          netto: totalNetto,
          nomorPlat: shipment.armada?.plateNumber || shipment.plateNumber || '',
          ekspedisi,
        };

        excelData.push(rowData);
      });
    });

    // Create Excel workbook
    const workbook = XLSX.utils.book_new();

    // Create title based on warehouse filter
    const title = warehouseName
      ? `LAPORAN HARIAN BARANG KELUAR ${warehouseName}`
      : 'LAPORAN HARIAN BARANG KELUAR SEMUA GUDANG';

    // Create worksheet with title row
    const worksheetData: (string | number)[][] = [
      [title], // Title row
      [], // Empty row
      [
        'NO',
        'TANGGAL',
        'NO. SPMB',
        'NAMA CUSTOMER',
        'NAMA BARANG',
        'QTY',
        'NETTO (KG)',
        'NOMOR PLAT',
        'EKSPEDISI',
      ], // Header row
    ];

    // Add data rows
    excelData.forEach((item) => {
      worksheetData.push([
        item.no,
        item.tanggal,
        item.noSpmb,
        item.namaCustomer,
        item.namaBarang,
        item.qty,
        item.netto,
        item.nomorPlat,
        item.ekspedisi,
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Set column widths
    worksheet['!cols'] = [
      { width: 5 }, // NO
      { width: 12 }, // TANGGAL
      { width: 15 }, // NO. SPMB
      { width: 25 }, // NAMA CUSTOMER
      { width: 20 }, // NAMA BARANG
      { width: 10 }, // QTY
      { width: 12 }, // NETTO
      { width: 15 }, // NOMOR PLAT
      { width: 15 }, // EKSPEDISI
    ];

    // Merge title cells (A1:I1)
    worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];

    // Add worksheet to workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Laporan Barang Keluar');

    // Generate filename
    const dateStr = moment().tz('Asia/Jakarta').format('YYYY-MM-DD_HH-mm-ss');
    const warehouseStr = warehouseName ? `_${warehouseName.replace(/\s+/g, '_')}` : '_SEMUA_GUDANG';
    const filename = `laporan_barang_keluar${warehouseStr}_${dateStr}.xlsx`;
    const filePath = path.join(REPORTS_DIR, filename);

    // Write Excel file
    XLSX.writeFile(workbook, filePath);

    // Return relative path for download
    return `reports/${filename}`;
  },
};
