import { Prisma } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs';
import moment from 'moment-timezone';
import path from 'path';
import PDFDocument from 'pdfkit';
import { promisify } from 'util';

// Convert callback-based fs functions to Promise-based
const mkdirAsync = promisify(fs.mkdir);
const existsAsync = promisify(fs.exists);
dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

const PUBLIC_DIR = isProd
  ? '/var/www/sajpoutbound.com/public'
  : path.join(process.cwd(), 'src', 'public');
const NOTA_TIMBANGAN_DIR = path.join(PUBLIC_DIR, 'nota-timbangan');

// Ensure directories exist
const ensureDirectoriesExist = async () => {
  if (!(await existsAsync(PUBLIC_DIR))) {
    await mkdirAsync(PUBLIC_DIR, {
      recursive: true,
    });
  }
  if (!(await existsAsync(NOTA_TIMBANGAN_DIR))) {
    await mkdirAsync(NOTA_TIMBANGAN_DIR, {
      recursive: true,
    });
  }
};

// Initialize directories when service is loaded
ensureDirectoriesExist().catch((err) => {
  console.error('Failed to create nota timbangan directories:', err);
});

type WeighingWithIncludes = Prisma.ShipmentChosenProductWeighingGetPayload<{
  include: {
    shipmentChosenProduct: {
      include: {
        product: true;
        shipment: {
          include: {
            armada: true;
            shipmentItems: {
              include: {
                deliveryOrder: {
                  include: {
                    customer: true;
                  };
                };
              };
            };
          };
        };
      };
    };
  };
}>;

export default {
  async generateNotaTimbangan(
    weighing: WeighingWithIncludes,
    ticketNumber: string,
    weighedQuantity?: number, // Optional parameter for specific weighing quantity
  ): Promise<string> {
    await ensureDirectoriesExist();

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: [240, 320], // Shorter height for receipt
        margins: {
          top: 10,
          bottom: 10,
          left: 15,
          right: 15,
        },
      });

      const filePath = path.join(NOTA_TIMBANGAN_DIR, `${ticketNumber}.pdf`);
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const { shipmentChosenProduct } = weighing;
      const { shipment, product } = shipmentChosenProduct;

      const fontName = 'Helvetica';
      const boldFontName = 'Helvetica-Bold';
      const fontSize = 8;

      const formatDate = (date: Date | null | undefined) => {
        if (!date) return 'N/A';

        // Handle timezone based on environment
        const isProductionVPS = process.env.NODE_ENV === 'production';

        if (isProductionVPS) {
          return moment(date).format('DD/MM/YY - HH:mm:ss');
        } else {
          return moment(date).subtract(7, 'hours').format('DD/MM/YY - HH:mm:ss');
        }
      };

      const formatNumber = (num: number | null | undefined) => {
        if (num === null || num === undefined) return '0';
        return num.toLocaleString('id-ID');
      };

      const formatWeight = (weight: number | null | undefined) => {
        if (weight === null || weight === undefined) return '0,00';
        return weight
          .toFixed(2)
          .replace('.', ',')
          .replace(/\B(?=(\d{3})+(?!\d))/g, '.');
      };

      // Header
      doc.font(boldFontName).fontSize(10).text('NOTA TIMBANGAN', {
        align: 'center',
      });
      doc.moveDown(1.5);

      // Info Section
      const infoX = doc.x;
      const labelWidth = 80;
      const valueX = infoX + labelWidth + 5;

      const addInfoRow = (label: string, value: string) => {
        const currentY = doc.y;
        doc.font(fontName).fontSize(fontSize).text(label, infoX, currentY, {
          width: labelWidth,
        });
        doc.font(fontName).fontSize(fontSize).text(`: ${value}`, valueX, currentY);
        doc.y = currentY + 12;
      };

      addInfoRow('No. Tiket', ticketNumber);
      addInfoRow('Tgl/ Jam Masuk', formatDate(weighing.timeIn));
      addInfoRow('Tgl/ Jam Keluar', formatDate(weighing.timeOut));
      doc.moveDown(0.5);

      addInfoRow('No. Kendaraan', shipment.armada?.plateNumber || shipment.plateNumber || 'N/A');
      addInfoRow('Nama Barang', product.name);
      addInfoRow('No. Referensi', shipmentChosenProduct.code);
      doc.moveDown(0.5);

      // Use the specific weighing quantity if provided, otherwise calculate from all shipment items
      const totalQuantity =
        weighedQuantity !== undefined
          ? weighedQuantity
          : shipment.shipmentItems
              .filter((item) => item.productId === product.id)
              .reduce((sum, item) => sum + item.requestedQuantity, 0);

      addInfoRow('Jumlah', `${formatNumber(totalQuantity)}`);
      doc.moveDown(1);

      // Weight Section
      const addWeightRow = (label: string, value: string) => {
        const currentY = doc.y;
        doc.font(boldFontName).fontSize(fontSize).text(label, infoX, currentY);
        doc.font(boldFontName).fontSize(fontSize).text(`: ${value}`, valueX, currentY);
        doc.y = currentY + 12;
      };

      addWeightRow('Berat Bruto', `${formatWeight(weighing.grossWeight)} kg`);
      addWeightRow('Berat Tarra', `${formatWeight(weighing.tareWeight)} kg`);
      addWeightRow('Berat Netto', `${formatWeight(weighing.netWeight)} kg`);
      doc.moveDown(1);

      // 🔹 Average Weight Section (fixed)
      const averageWeight =
        weighing.netWeight && totalQuantity > 0 ? weighing.netWeight / totalQuantity : 0;

      const labelText = 'Ditimbang: ';
      const valueText = `${formatWeight(averageWeight)} kg`;

      const availableWidth = 240 - 30;
      const centerX = availableWidth / 2 + 15;

      // measure widths properly
      doc.font(boldFontName).fontSize(fontSize);
      const valueWidth = doc.widthOfString(valueText);

      doc.font(fontName).fontSize(fontSize);
      const labelWidth2 = doc.widthOfString(labelText);

      const averageWeightXValue = centerX - valueWidth / 2;
      const averageWeightLabelX = averageWeightXValue - labelWidth2 - 2;

      doc.moveDown(2);
      const avgY = doc.y;

      // label
      doc.font(fontName).fontSize(fontSize).text(labelText, averageWeightLabelX, avgY);

      // value
      doc.font(boldFontName).fontSize(fontSize).text(valueText, averageWeightXValue, avgY);

      doc.moveDown(1.5);

      // Manual customer name field
      doc.moveDown(4);
      const currentY = doc.y;
      const pageWidth = 240 - 30;
      const leftX = infoX;
      const rightX = infoX + pageWidth - 90;
      doc.font(fontName).fontSize(fontSize).text('(                    )', leftX, currentY);
      doc.font(fontName).fontSize(fontSize).text('(                    )', rightX, currentY);

      doc.end();

      stream.on('finish', () => {
        const relativePath = `nota-timbangan/${ticketNumber}.pdf`;
        resolve(relativePath);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    });
  },
};
