import {
  NextFunction, Request, Response, 
} from 'express';
import {
  dailyOutputReportFilterSchema,
  monthlyOutputReportFilterSchema,
  operationalReportFilterSchema,
  shipmentAssignmentReportFilterSchema,
} from '../schemas/report';
import reportService from '../services/reportService';
import {
  DailyOutputReportQuery,
  MonthlyOutputReportQuery,
  OperationalReportQuery,
  ShipmentAssignmentReportQuery,
} from '../types/report';
import { success } from '../types/response';

export default {
  /**
   * Get operational report (Laporan Operasional)
   */
  async getOperationalReport(
    req: Request<unknown, unknown, unknown, OperationalReportQuery>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const page = req.query.page && !isNaN(Number(req.query.page)) ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit && !isNaN(Number(req.query.limit)) ? parseInt(String(req.query.limit), 10) : 10;
      const {
        page: _p, limit: _l, ...rawFilters 
      } = req.query;
      const filters = await operationalReportFilterSchema.validateAsync(rawFilters as unknown);
      const report = await reportService.getOperationalReport(filters, page, limit);
      res.status(200).json(
        success({
          report,
          message: 'Laporan operasional berhasil dibuat',
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get daily output report (Laporan Pengeluaran Harian)
   */
  async getDailyOutputReport(
    req: Request<unknown, unknown, unknown, DailyOutputReportQuery>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const page = req.query.page && !isNaN(Number(req.query.page)) ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit && !isNaN(Number(req.query.limit)) ? parseInt(String(req.query.limit), 10) : 10;
      const {
        page: _p, limit: _l, ...rawFilters 
      } = req.query;
      const filters = await dailyOutputReportFilterSchema.validateAsync(rawFilters as unknown);
      const report = await reportService.getDailyOutputReport(filters, page, limit);
      res.status(200).json(
        success({
          report,
          message: 'Laporan pengeluaran harian berhasil dibuat',
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get monthly output report (Laporan Pengeluaran Bulanan)
   */
  async getMonthlyOutputReport(
    req: Request<unknown, unknown, unknown, MonthlyOutputReportQuery>,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const page = req.query.page && !isNaN(Number(req.query.page)) ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit && !isNaN(Number(req.query.limit)) ? parseInt(String(req.query.limit), 10) : 10;
      const {
        page: _p, limit: _l, ...rawFilters 
      } = req.query;
      const filters = await monthlyOutputReportFilterSchema.validateAsync(rawFilters as unknown);
      const report = await reportService.getMonthlyOutputReport(filters, page, limit);
      res.status(200).json(
        success({
          report,
          message: 'Laporan pengeluaran bulanan berhasil dibuat',
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
      const page = req.query.page && !isNaN(Number(req.query.page)) ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit && !isNaN(Number(req.query.limit)) ? parseInt(String(req.query.limit), 10) : 10;
      const {
        page: _p, limit: _l, ...rawFilters 
      } = req.query;
      const filters = await shipmentAssignmentReportFilterSchema.validateAsync(rawFilters as unknown);
      const report = await reportService.getShipmentAssignmentReport(filters, page, limit);
      res.status(200).json(
        success({
          report,
          message: 'Laporan penugasan pengiriman berhasil dibuat',
        }),
      );
    } catch (error) {
      next(error);
    }
  },

  /**
   * Get dashboard summary for all reports
   */
  async getDashboardSummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await reportService.getDashboardSummary();

      res.status(200).json(
        success({
          summary,
          message: 'Ringkasan dashboard berhasil dibuat',
        }),
      );
    } catch (error) {
      next(error);
    }
  },
};
