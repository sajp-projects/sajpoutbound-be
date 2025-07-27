import { STATUS } from '@prisma/client';
import {
  NextFunction, Request, Response, 
} from 'express';
import { CustomError } from '../middlewares/error';
import {
  dailyOutputReportFilterSchema,
  operationalReportFilterSchema,
  shipmentAssignmentReportFilterSchema,
} from '../schemas/report';
import reportService from '../services/reportService';
import {
  DailyOutputReportQuery,
  OperationalReportFilter,
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
      const { startDate, endDate } = req.query;

      // Validate date parameters if provided
      if (startDate && typeof startDate !== 'string') {
        throw new CustomError({
          message: 'startDate harus berupa string dengan format YYYY-MM-DD',
          errorCode: 'PARAMETER_TIDAK_VALID',
          status: 400,
        });
      }

      if (endDate && typeof endDate !== 'string') {
        throw new CustomError({
          message: 'endDate harus berupa string dengan format YYYY-MM-DD',
          errorCode: 'PARAMETER_TIDAK_VALID',
          status: 400,
        });
      }

      const summary = await reportService.getDashboardSummary({
        startDate: startDate as string,
        endDate: endDate as string,
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
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      if (isNaN(page) || page < 1) {
        throw new CustomError({
          message: 'Halaman harus berupa bilangan bulat positif',
          errorCode: 'PAGINASI_TIDAK_VALID',
          status: 400,
        });
      }

      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new CustomError({
          message: 'Batas harus berupa bilangan bulat positif antara 1 dan 100',
          errorCode: 'PAGINASI_TIDAK_VALID',
          status: 400,
        });
      }
      const {
        page: _p, limit: _l, status: rawStatus, ...rawFilters 
      } = req.query;
      let status = rawStatus as string | undefined;
      if (status === 'ALL') status = undefined;
      if (status && !['PENDING', 'PROSES', 'SELESAI'].includes(status)) {
        throw new CustomError({
          message: 'Status pengiriman tidak valid',
          errorCode: 'STATUS_TIDAK_VALID',
          status: 400,
        });
      }
      const filters = await operationalReportFilterSchema.validateAsync({
        ...rawFilters,
        status,
      } as unknown);
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
      const {
        startDate, endDate, type, status, page = 1, limit = 5, 
      } = req.query;

      const filters: OperationalReportFilter = {
        startDate: startDate as string,
        endDate: endDate as string,
        type: type as 'ANTAR' | 'JEMPUT',
        status: status as STATUS,
      };

      const result = await reportService.getOperationalReportTable(
        filters,
        Number(page),
        Number(limit),
      );

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
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      if (isNaN(page) || page < 1) {
        throw new CustomError({
          message: 'Halaman harus berupa bilangan bulat positif',
          errorCode: 'PAGINASI_TIDAK_VALID',
          status: 400,
        });
      }

      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new CustomError({
          message: 'Batas harus berupa bilangan bulat positif antara 1 dan 100',
          errorCode: 'PAGINASI_TIDAK_VALID',
          status: 400,
        });
      }

      const {
        page: _p, limit: _l, ...rawFilters 
      } = req.query;

      // Parse numeric parameters and validate with schema
      const filters = await dailyOutputReportFilterSchema.validateAsync({
        ...rawFilters,
        year: rawFilters.year
          ? typeof rawFilters.year === 'string'
            ? parseInt(rawFilters.year, 10)
            : rawFilters.year
          : undefined,
        month: rawFilters.month
          ? typeof rawFilters.month === 'string'
            ? parseInt(rawFilters.month, 10)
            : rawFilters.month
          : undefined,
      } as unknown);

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
      const {
        period,
        startDate,
        endDate,
        year,
        month,
        groupBy,
        status,
        page = 1,
        limit = 5,
      } = req.query;

      // Parse numeric parameters and validate with schema
      const filters = await dailyOutputReportFilterSchema.validateAsync({
        period,
        startDate,
        endDate,
        year: year ? (typeof year === 'string' ? parseInt(year, 10) : year) : undefined,
        month: month ? (typeof month === 'string' ? parseInt(month, 10) : month) : undefined,
        groupBy,
        status,
      } as unknown);

      const result = await reportService.getDailyOutputReportTable(
        filters,
        Number(page),
        Number(limit),
      );

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
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;

      if (isNaN(page) || page < 1) {
        throw new CustomError({
          message: 'Halaman harus berupa bilangan bulat positif',
          errorCode: 'PAGINASI_TIDAK_VALID',
          status: 400,
        });
      }

      if (isNaN(limit) || limit < 1 || limit > 100) {
        throw new CustomError({
          message: 'Batas harus berupa bilangan bulat positif antara 1 dan 100',
          errorCode: 'PAGINASI_TIDAK_VALID',
          status: 400,
        });
      }
      const {
        page: _p, limit: _l, ...rawFilters 
      } = req.query;
      const filters = await shipmentAssignmentReportFilterSchema.validateAsync(
        rawFilters as unknown,
      );
      const report = await reportService.getShipmentAssignmentReport(filters, page, limit);

      console.log(report, 'report');

      res.status(200).json(
        success({
          report,
        }),
      );
    } catch (error) {
      next(error);
    }
  },
};
