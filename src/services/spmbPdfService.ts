import { Prisma } from '@prisma/client';
import fs from 'fs';
import PDFDocument from 'pdfkit';

type ShipmentWithIncludes = Prisma.ShipmentGetPayload<{
  include: {
    armada: true;
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
        shipmentItems: {
          include: {
            product: true;
          };
        };
      };
    };
  };
}>;

export default {
  async generateSPMB(spmb: SPMBWithIncludes, shipment: ShipmentWithIncludes): Promise<string> {
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

      const dir = 'src/public/spmb';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
          recursive: true,
        });
      }

      const filePath = `${dir}/${spmb.code}.pdf`;
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
      doc.moveDown(2);

      // SPMB Info
      const spmbInfoTop = doc.y;
      doc.fontSize(10);
      doc.text('No.', 20, spmbInfoTop);
      doc.text(`: ${spmb.code}`, 80, spmbInfoTop);
      doc.text('Tanggal', 20, spmbInfoTop + 15);
      doc.text(`: ${new Date(spmb.createdAt).toLocaleDateString('id-ID')}`, 80, spmbInfoTop + 15);
      doc.text('Kepada', 20, spmbInfoTop + 30);
      doc.text(`: ${spmb.deliveryOrder.customer.name}`, 80, spmbInfoTop + 30);

      // Shipment Info
      const shipmentInfoTop = doc.y - 45; // Align with SPMB Info
      doc.text('Plat Nomor', 350, shipmentInfoTop);
      doc.text(
        `: ${shipment.armada?.plateNumber || shipment.plateNumber || ''}`,
        425,
        shipmentInfoTop,
      );
      doc.text('Keterangan', 350, shipmentInfoTop + 15);
      doc.text(`: ${shipment.internalNote || ''}`, 425, shipmentInfoTop + 15);

      doc.moveDown(4);

      // Table Header
      const tableTop = doc.y;
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
