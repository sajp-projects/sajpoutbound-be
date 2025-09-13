import { NextFunction, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { CustomError } from '../middlewares/error';
import {
  dailyOutputReportQuerySchema,
  dailyOutputReportTableQuerySchema,
  dashboardSummaryQuerySchema,
  operationalReportQuerySchema,
  operationalReportTableQuerySchema,
  shipmentAssignmentReportQuerySchema,
} from '../schemas/report';
import expenditureExcelService from '../services/expenditureExcelService';
import reportService from '../services/reportService';
import {
  DailyOutputReportQuery,
  OperationalReportQuery,
  ShipmentAssignmentReportQuery,
} from '../types/report';
import { success } from '../types/response';

export default {
  /**
   * Get dashboard summary data with optional date range filtering
   */
  async getDashboardSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedQuery = await dashboardSummaryQuerySchema.validateAsync(req.query);

      const summary = await reportService.getDashboardSummary({
        startDate: validatedQuery.startDate,
        endDate: validatedQuery.endDate,
      });

      res.status(200).json(
        success({
          summary,
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get operational report (Laporan Operasional)
   */
  async getOperationalReport(
    req: Request<unknown, unknown, unknown, OperationalReportQuery>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const validatedQuery = await operationalReportQuerySchema.validateAsync(req.query);

      const { page, limit, ...filters } = validatedQuery;

      // Handle 'ALL' status
      if (filters.status === 'ALL') {
        delete filters.status;
      }

      const report = await reportService.getOperationalReport(filters, page, limit);

      res.status(200).json(
        success({
          report,
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get operational report table data only (for pagination)
   */
  async getOperationalReportTable(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedQuery = await operationalReportTableQuerySchema.validateAsync(req.query);

      const { page, limit, ...filters } = validatedQuery;

      const result = await reportService.getOperationalReportTable(filters, page, limit);

      res.status(200).json(
        success({
          data: result.data,
          pagination: result.pagination,
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get output report (Laporan Pengeluaran) - unified for daily/monthly/yearly
   */
  async getDailyOutputReport(
    req: Request<unknown, unknown, unknown, DailyOutputReportQuery>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const validatedQuery = await dailyOutputReportQuerySchema.validateAsync(req.query);

      const { page, limit, ...filters } = validatedQuery;

      // Validate period-specific parameters
      if (filters.period === 'monthly') {
        if (!filters.year || !filters.month) {
          throw new CustomError({
            message: 'Tahun dan bulan harus diisi untuk periode bulanan',
            errorCode: 'PARAMETER_TIDAK_LENGKAP',
            status: 400,
          });
        }
      } else if (filters.period === 'yearly') {
        if (!filters.year) {
          throw new CustomError({
            message: 'Tahun harus diisi untuk periode tahunan',
            errorCode: 'PARAMETER_TIDAK_LENGKAP',
            status: 400,
          });
        }
      }

      const report = await reportService.getDailyOutputReport(filters, page, limit);
      res.status(200).json(
        success({
          report,
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get output report table data only (for pagination) - unified for daily/monthly/yearly
   */
  async getDailyOutputReportTable(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedQuery = await dailyOutputReportTableQuerySchema.validateAsync(req.query);

      const { page, limit, ...filters } = validatedQuery;

      const result = await reportService.getDailyOutputReportTable(filters, page, limit);

      res.status(200).json(
        success({
          data: result.data,
          pagination: result.pagination,
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get shipment assignment report (Laporan Penugasan Pengiriman)
   */
  async getShipmentAssignmentReport(
    req: Request<unknown, unknown, unknown, ShipmentAssignmentReportQuery>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const validatedQuery = await shipmentAssignmentReportQuerySchema.validateAsync(req.query);

      const { page, limit, ...filters } = validatedQuery;

      const report = await reportService.getShipmentAssignmentReport(filters, page, limit);

      res.status(200).json(
        success({
          report,
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Download expenditure Excel report
   */
  async downloadExpenditureExcel(req: Request, res: Response, next: NextFunction) {
    try {
      const { period, startDate, endDate, year, month, warehouseId } = req.query as {
        period?: string;
        startDate?: string;
        endDate?: string;
        year?: string;
        month?: string;
        warehouseId?: string;
      };

      const filePath = await expenditureExcelService.generateExpenditureExcel({
        period: period as 'daily' | 'monthly' | 'yearly',
        startDate,
        endDate,
        year: year ? parseInt(year) : undefined,
        month: month ? parseInt(month) : undefined,
        warehouseId,
      });

      const isProd = process.env.NODE_ENV === 'production';
      const PUBLIC_DIR = isProd
        ? '/var/www/sajpoutbound.com/public'
        : path.join(process.cwd(), 'src', 'public');
      const fullPath = path.join(PUBLIC_DIR, filePath);

      // Set headers for file download
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader('Content-Disposition', `attachment; filename="${path.basename(filePath)}"`);

      // Stream the file
      const fileStream = fs.createReadStream(fullPath);
      fileStream.pipe(res);

      fileStream.on('error', (error) => {
        console.error('Error streaming file:', error);
        res.status(500).json({ error: 'Error downloading file' });
      });
    } catch (error) {
      next(error);
    }
  },
};
