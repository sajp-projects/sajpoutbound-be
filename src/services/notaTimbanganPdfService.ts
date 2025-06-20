import { Prisma } from '@prisma/client';
import fs from 'fs';
import moment from 'moment';
import PDFDocument from 'pdfkit';

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
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: [240, 400], // Custom size for receipt
        margins: {
          top: 10,
          bottom: 10,
          left: 15,
          right: 15,
        },
      });

      const dir = 'src/public/nota-timbangan';
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, {
          recursive: true,
        });
      }

      const filePath = `${dir}/${ticketNumber}.pdf`;
      const stream = fs.createWriteStream(filePath);
      doc.pipe(stream);

      const { shipmentChosenProduct } = weighing;
      const { shipment, product } = shipmentChosenProduct;
      const customer = shipment.shipmentItems[0]?.deliveryOrder?.customer?.name || 'N/A';

      const fontName = 'Helvetica';
      const boldFontName = 'Helvetica-Bold';
      const fontSize = 8;

      const formatDate = (date: Date | null | undefined) => {
        if (!date) return 'N/A';
        return moment(date).format('DD/MM/YY - HH:mm:ss');
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
        doc.y = currentY + 12; // Move to next line with consistent spacing
      };

      addInfoRow('No. Tiket', ticketNumber);
      addInfoRow('Tgl/ Jam Masuk', formatDate(weighing.timeIn));
      addInfoRow('Tgl/ Jam Keluar', formatDate(weighing.timeOut));
      doc.moveDown(0.5);

      addInfoRow('No. Kendaraan', shipment.armada?.plateNumber || shipment.plateNumber || 'N/A');
      addInfoRow('Nama Customer', customer);
      addInfoRow('Nama Barang', product.name);
      addInfoRow('No. Referensi', shipmentChosenProduct.code);
      doc.moveDown(0.5);

      const totalQuantity = shipment.shipmentItems
        .filter((item) => item.productId === product.id)
        .reduce((sum, item) => sum + item.requestedQuantity, 0);

      addInfoRow('Jlh. Sak', `${formatNumber(totalQuantity)} ${product.satuan}`);
      doc.moveDown(1);

      // Weight Section
      const addWeightRow = (label: string, value: string) => {
        const currentY = doc.y;
        doc.font(boldFontName).fontSize(fontSize).text(label, infoX, currentY);
        doc.font(boldFontName).fontSize(fontSize).text(`: ${value}`, valueX, currentY);
        doc.y = currentY + 12; // Move to next line with consistent spacing
      };

      addWeightRow('Berat Bruto', `${formatWeight(weighing.grossWeight)} kg`);
      addWeightRow('Berat Tarra', `${formatWeight(weighing.tareWeight)} kg`);
      addWeightRow('Berat Netto', `${formatWeight(weighing.netWeight)} kg`);
      doc.moveDown(1);

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
