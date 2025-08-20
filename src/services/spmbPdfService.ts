import { Prisma } from '@prisma/client';
import dotenv from 'dotenv';
import fs from 'fs';
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
const SPMB_DIR = path.join(PUBLIC_DIR, 'spmb');

// Ensure directories exist
const ensureDirectoriesExist = async () => {
  if (!(await existsAsync(PUBLIC_DIR))) {
    await mkdirAsync(PUBLIC_DIR, {
      recursive: true,
    });
  }
  if (!(await existsAsync(SPMB_DIR))) {
    await mkdirAsync(SPMB_DIR, {
      recursive: true,
    });
  }
};

// Initialize directories when service is loaded
ensureDirectoriesExist().catch((err) => {
  console.error('Failed to create SPMB directories:', err);
});

type ShipmentWithIncludes = Prisma.ShipmentGetPayload<{
  include: {
    armada: true;
    driver: true;
    shipmentItems: {
      include: {
        product: true;
        deliveryOrder: {
          include: {
            customer: true;
          };
        };
      };
    };
  };
}>;

type SPMBWithIncludes = Prisma.SPMBGetPayload<{
  include: {
    deliveryOrder: {
      include: {
        customer: true;
        items: {
          include: {
            product: true;
          };
        };
      };
    };
    shipment: {
      include: {
        armada: true;
        driver: true;
        shipmentItems: {
          include: {
            product: true;
          };
        };
      };
    };
    warehouse: true;
    generatedBy: true;
  };
}>;

export default {
  async generateSPMB(spmb: SPMBWithIncludes, shipment: ShipmentWithIncludes): Promise<string> {
    await ensureDirectoriesExist();

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A5',
        layout: 'landscape',
        margins: {
          top: 20,
          bottom: 20,
          left: 20,
          right: 20,
        },
      });

      const filePath = path.join(SPMB_DIR, `${spmb.code}.pdf`);
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const formatNumber = (num: number | null | undefined) => {
        if (num === null || num === undefined) return '0';
        return num.toLocaleString('id-ID');
      };

      // Header
      doc.fontSize(14).text('SPMB', {
        align: 'center',
      });
      doc.fontSize(10).text('(Surat Perintah Muat Barang)', {
        align: 'center',
      });
      doc.moveDown(1);

      // SPMB Info (moved above the table)
      const spmbInfoTop = doc.y + 10;
      doc.fontSize(10);
      doc.text('No.', 20, spmbInfoTop);
      doc.text(`: ${spmb.code}`, 80, spmbInfoTop);
      doc.text('Tanggal', 20, spmbInfoTop + 15);
      doc.text(`: ${new Date(spmb.createdAt).toLocaleDateString('id-ID')}`, 80, spmbInfoTop + 15);
      doc.text('Kepada', 20, spmbInfoTop + 30);
      doc.text(`: ${spmb.deliveryOrder.customer.name}`, 80, spmbInfoTop + 30);

      // Shipment Info (aligned with SPMB info on the right side)
      doc.text('Plat Nomor', 350, spmbInfoTop);
      doc.text(`: ${shipment.armada?.plateNumber || shipment.plateNumber || ''}`, 425, spmbInfoTop);
      doc.text('Supir', 350, spmbInfoTop + 15);
      doc.text(`: ${shipment.driver?.name || ''}`, 425, spmbInfoTop + 15);
      doc.text('Tally', 350, spmbInfoTop + 30);
      doc.text(`: ${shipment.tally || ''}`, 425, spmbInfoTop + 30);
      doc.text('Keterangan', 350, spmbInfoTop + 45);
      doc.text(`: ${shipment.internalNote || ''}`, 425, spmbInfoTop + 45);

      // Table Header (positioned below SPMB info)
      const tableTop = spmbInfoTop + 70; // Add more spacing after SPMB info to accommodate shipment info
      const tableWidth = 555;
      const tableLeft = 20;
      const qtyColumnWidth = 70;
      const tableHeaderHeight = 20;

      doc.rect(tableLeft, tableTop, tableWidth, tableHeaderHeight).stroke();
      doc.text('Qty', tableLeft, tableTop + 5, {
        width: qtyColumnWidth,
        align: 'center',
      });
      doc
        .moveTo(tableLeft + qtyColumnWidth, tableTop)
        .lineTo(tableLeft + qtyColumnWidth, tableTop + tableHeaderHeight)
        .stroke();
      doc.text('Nama Barang', tableLeft + qtyColumnWidth, tableTop + 5, {
        width: tableWidth - qtyColumnWidth,
        align: 'center',
      });

      // Table Body
      let y = tableTop + tableHeaderHeight;
      const rowHeight = 20;
      const totalRows = 5;
      const shipmentItemsForDO = shipment.shipmentItems.filter(
        (item) => item.deliveryOrderId === spmb.deliveryOrderId,
      );

      shipmentItemsForDO.forEach((item) => {
        doc.rect(tableLeft, y, tableWidth, rowHeight).stroke();
        doc.text(formatNumber(item.requestedQuantity), tableLeft, y + 5, {
          width: qtyColumnWidth,
          align: 'center',
        });
        doc
          .moveTo(tableLeft + qtyColumnWidth, y)
          .lineTo(tableLeft + qtyColumnWidth, y + rowHeight)
          .stroke();
        doc.text(item.product.name, tableLeft + qtyColumnWidth + 5, y + 5, {
          width: tableWidth - qtyColumnWidth - 10,
          align: 'left',
        });
        y += rowHeight;
      });

      // Fill remaining rows
      const remainingRows = totalRows - shipmentItemsForDO.length;
      for (let i = 0; i < remainingRows; i++) {
        doc.rect(tableLeft, y, tableWidth, rowHeight).stroke();
        doc
          .moveTo(tableLeft + qtyColumnWidth, y)
          .lineTo(tableLeft + qtyColumnWidth, y + rowHeight)
          .stroke();
        y += rowHeight;
      }

      // Add signature area aligned with Keterangan text
      const pageHeight = doc.page.height;
      const bottomMargin = 20;
      const signatureY = pageHeight - bottomMargin - 20; // Move much closer to bottom

      // Add "Dibuat Oleh" text above the signature line
      const dibuatOlehY = y + 30; // Position closer to table with some spacing
      doc.fontSize(10).text('Dibuat Oleh', 350, dibuatOlehY);

      // Draw signature line aligned with "Keterangan" text (x=350)
      const lineLength = 200;
      const lineX = 350; // Same x position as "Keterangan" text
      doc
        .moveTo(lineX, signatureY)
        .lineTo(lineX + lineLength, signatureY)
        .stroke();

      doc.end();

      stream.on('finish', () => {
        const relativePath = `spmb/${spmb.code}.pdf`;
        resolve(relativePath);
      });

      stream.on('error', (err) => {
        reject(err);
      });
    });
  },
};
