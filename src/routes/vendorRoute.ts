import express from 'express';
import vendorController from '../controllers/vendorController';

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Vendor Weighing API
 *     description: |
 *       Endpoint API publik untuk sistem penimbangan vendor pihak ketiga.
 *
 *       ## Autentikasi
 *       Endpoint ini bersifat **publik** dan tidak memerlukan autentikasi JWT Bearer.
 *       Sebaliknya, menggunakan header `x-auth` khusus untuk autentikasi vendor.
 *
 *       ## Penggunaan
 *       1. Dapatkan kunci API vendor dari administrator sistem
 *       2. Sertakan kunci API dalam header `x-auth` untuk semua permintaan
 *       3. Hanya akses item yang ditandai dengan metode penimbangan VENDOR
 *
 *       ## Alur Kerja
 *       1. Dapatkan pengiriman yang tersedia dengan item vendor: `GET /api/vendor/shipments/available-items`
 *       2. Dapatkan item pengiriman spesifik: `GET /api/vendor/shipments/{shipmentId}/available-items`
 *       3. Kirim data penimbangan: `POST /api/vendor/shipments/bulk-weigh`
 */

/**
 * @openapi
 * /api/vendor/shipments/available-items:
 *   get:
 *     summary: Dapatkan item yang tersedia untuk penimbangan vendor di semua pengiriman
 *     description: |
 *       **Endpoint API Publik** - Tidak memerlukan autentikasi JWT, hanya header x-auth.
 *
 *       Mengembalikan daftar pengiriman yang memiliki item yang ditandai untuk metode penimbangan VENDOR.
 *       Item-item ini telah dipilih dengan metode penimbangan VENDOR dan siap untuk
 *       pemrosesan penimbangan vendor eksternal melalui API.
 *
 *       **Data yang disediakan untuk vendor:**
 *       - Informasi pengiriman (ID, armada, plat nomor)
 *       - Item yang siap ditimbang dengan detail produk
 *       - Kuantitas yang diminta dan status item
 *       - Informasi gudang dan lokasi
 *       - ID item untuk referensi penimbangan
 *
 *       **Autentikasi**: Menggunakan header x-auth alih-alih token JWT Bearer.
 *     tags:
 *       - Vendor Weighing API
 *     parameters:
 *       - in: header
 *         name: x-auth
 *         required: true
 *         schema:
 *           type: string
 *           example: "vendor-api-key-12345"
 *         description: Kunci API vendor untuk autentikasi (disediakan oleh administrator sistem)
 *     responses:
 *       200:
 *         description: Berhasil mengambil item penimbangan vendor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     shipments:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             format: uuid
 *                             description: ID pengiriman
 *                           shipmentNumber:
 *                             type: string
 *                             description: Nomor pengiriman untuk referensi
 *                           armada:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               model:
 *                                 type: string
 *                                 description: Model kendaraan
 *                               plateNumber:
 *                                 type: string
 *                                 description: Plat nomor kendaraan
 *                           shipmentItems:
 *                             type: array
 *                             description: Item yang ditandai untuk penimbangan vendor
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                   format: uuid
 *                                   description: ID item untuk referensi penimbangan
 *                                 status:
 *                                   type: string
 *                                   enum: [CHOSEN]
 *                                   description: Status item (selalu CHOSEN untuk vendor)
 *                                 requestedQuantity:
 *                                   type: number
 *                                   description: Kuantitas yang diminta
 *                                 product:
 *                                   type: object
 *                                   properties:
 *                                     id:
 *                                       type: string
 *                                       format: uuid
 *                                     name:
 *                                       type: string
 *                                       description: Nama produk
 *                                     satuan:
 *                                       type: string
 *                                       description: Satuan produk
 *                                     code:
 *                                       type: string
 *                                       description: Kode produk untuk referensi
 *                                 warehouse:
 *                                   type: object
 *                                   properties:
 *                                     id:
 *                                       type: string
 *                                       format: uuid
 *                                     name:
 *                                       type: string
 *                                       description: Nama gudang
 *                                 locationType:
 *                                   type: string
 *                                   description: Tipe lokasi (GUDANG, PELABUHAN, dll)
 *                                 deliveryOrder:
 *                                   type: object
 *                                   properties:
 *                                     id:
 *                                       type: string
 *                                       format: uuid
 *                                     doNumber:
 *                                       type: string
 *                                       description: Nomor DO untuk referensi
 *                                     customer:
 *                                       type: object
 *                                       properties:
 *                                         name:
 *                                           type: string
 *                                           description: Nama pelanggan
 *       401:
 *         description: Tidak diotorisasi - Kunci API vendor tidak valid atau hilang
 *       500:
 *         description: Kesalahan server
 */
router.get('/shipments/available-items', vendorController.getAvailableItemsForWeighing);

/**
 * @openapi
 * /api/vendor/shipments/{shipmentId}/available-items:
 *   get:
 *     summary: Dapatkan item penimbangan vendor yang tersedia untuk pengiriman tertentu
 *     description: |
 *       **Endpoint API Publik** - Tidak memerlukan autentikasi JWT, hanya header x-auth.
 *
 *       Mengembalikan item yang ditandai untuk metode penimbangan VENDOR dalam pengiriman tertentu.
 *       Item-item ini siap untuk pemrosesan penimbangan vendor eksternal dan dikelompokkan
 *       berdasarkan produk untuk memfasilitasi operasi penimbangan massal.
 *
 *       **Data yang disediakan untuk vendor:**
 *       - Informasi pengiriman lengkap (armada, plat nomor, status)
 *       - Item yang siap ditimbang dengan detail produk dan kuantitas
 *       - Informasi gudang dan lokasi untuk setiap item
 *       - Detail pesanan pengiriman (DO) dan pelanggan
 *       - ID item untuk referensi penimbangan individual atau massal
 *
 *       Hanya item yang dipilih dengan metode penimbangan VENDOR yang akan dikembalikan.
 *
 *       **Autentikasi**: Menggunakan header x-auth alih-alih token JWT Bearer.
 *     tags:
 *       - Vendor Weighing API
 *     parameters:
 *       - in: header
 *         name: x-auth
 *         required: true
 *         schema:
 *           type: string
 *           example: "vendor-api-key-12345"
 *         description: Kunci API vendor untuk autentikasi (disediakan oleh administrator sistem)
 *       - name: shipmentId
 *         in: path
 *         required: true
 *         description: ID pengiriman untuk mendapatkan item vendor
 *         schema:
 *           type: string
 *           format: uuid
 *     responses:
 *       200:
 *         description: Berhasil mengambil item penimbangan vendor untuk pengiriman
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     shipment:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         shipmentNumber:
 *                           type: string
 *                           description: Nomor pengiriman
 *                         status:
 *                           type: string
 *                           description: Status pengiriman
 *                         armada:
 *                           type: object
 *                           properties:
 *                             id:
 *                               type: string
 *                               format: uuid
 *                             model:
 *                               type: string
 *                             plateNumber:
 *                               type: string
 *                     availableItems:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           shipmentItemId:
 *                             type: string
 *                             format: uuid
 *                             description: ID item untuk penimbangan individual
 *                           product:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               name:
 *                                 type: string
 *                               satuan:
 *                                 type: string
 *                               code:
 *                                 type: string
 *                                 description: Kode produk untuk referensi vendor
 *                           warehouse:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               name:
 *                                 type: string
 *                           locationType:
 *                             type: string
 *                             description: Tipe lokasi (GUDANG, PELABUHAN, dll)
 *                           deliveryOrders:
 *                             type: array
 *                             description: Pesanan pengiriman yang terkait dengan item ini
 *                             items:
 *                               type: object
 *                               properties:
 *                                 id:
 *                                   type: string
 *                                   format: uuid
 *                                 doNumber:
 *                                   type: string
 *                                   description: Nomor DO
 *                                 customer:
 *                                   type: object
 *                                   properties:
 *                                     name:
 *                                       type: string
 *                                       description: Nama pelanggan
 *                           requestedQuantity:
 *                               type: number
 *                               description: Total kuantitas yang akan ditimbang
 *                           shipmentItemIds:
 *                               type: array
 *                               items:
 *                                 type: string
 *                                 format: uuid
 *                               description: ID semua item yang terkait dengan produk ini
 *       401:
 *         description: Tidak diotorisasi - Kunci API vendor tidak valid atau hilang
 *       404:
 *         description: Pengiriman tidak ditemukan
 *       500:
 *         description: Kesalahan server
 */
router.get(
  '/shipments/:shipmentId/available-items',
  vendorController.getAvailableItemsForWeighingByShipmentId,
);

/**
 * @openapi
 * /api/vendor/shipments/individual-weigh:
 *   post:
 *     summary: Penimbangan individual vendor untuk item tertentu
 *     description: |
 *       **Endpoint API Publik** - Tidak memerlukan autentikasi JWT, hanya header x-auth.
 *
 *       Endpoint ini memungkinkan sistem vendor untuk mengirim data penimbangan untuk item individual
 *       yang ditandai dengan metode penimbangan VENDOR. Endpoint ini memproses item CHOSEN tertentu
 *       dengan:
 *       1. Memvalidasi bahwa item yang dipilih ditandai untuk penimbangan VENDOR
 *       2. Mencatat berat untuk item spesifik
 *       3. Memperbarui item ke status COMPLETED
 *
 *       **Autentikasi**: Menggunakan header x-auth alih-alih token JWT Bearer.
 *     tags:
 *       - Vendor Weighing API
 *     parameters:
 *       - in: header
 *         name: x-auth
 *         required: true
 *         schema:
 *           type: string
 *           example: "vendor-api-key-12345"
 *         description: Kunci API vendor untuk autentikasi (disediakan oleh administrator sistem)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shipmentItemId
 *               - grossWeight
 *             properties:
 *               shipmentItemId:
 *                 type: string
 *                 format: uuid
 *                 description: ID item pengiriman yang akan ditimbang
 *               grossWeight:
 *                 type: number
 *                 description: Berat kotor untuk item ini
 *                 minimum: 0
 *               netWeight:
 *                 type: number
 *                 description: Berat bersih untuk item ini (opsional)
 *                 minimum: 0
 *               tareWeight:
 *                 type: number
 *                 description: Berat tara untuk item ini (opsional)
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Berhasil memproses penimbangan individual vendor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     shipmentItem:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         status:
 *                           type: string
 *                           example: "COMPLETED"
 *                     product:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 *                         satuan:
 *                           type: string
 *                     weights:
 *                       type: object
 *                       properties:
 *                         gross:
 *                           type: number
 *                         net:
 *                           type: number
 *                         tare:
 *                           type: number
 *                     weighedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Permintaan buruk - Item tidak ditandai untuk penimbangan vendor atau kesalahan validasi
 *       401:
 *         description: Tidak diotorisasi - Kunci API vendor tidak valid atau hilang
 *       404:
 *         description: Item pengiriman tidak ditemukan
 *       500:
 *         description: Kesalahan server
 */
router.post('/shipments/individual-weigh', vendorController.individualWeighShipmentItem);

/**
 * @openapi
 * /api/vendor/shipments/bulk-weigh:
 *   post:
 *     summary: Penimbangan massal vendor untuk item yang ditandai untuk penimbangan vendor
 *     description: |
 *       **Endpoint API Publik** - Tidak memerlukan autentikasi JWT, hanya header x-auth.
 *
 *       Endpoint ini memungkinkan sistem vendor untuk mengirim data penimbangan untuk item yang
 *       ditandai dengan metode penimbangan VENDOR. Endpoint ini memproses semua item CHOSEN dengan
 *       produk yang ditentukan dalam pengiriman dengan:
 *       1. Memvalidasi bahwa produk yang dipilih ditandai untuk penimbangan VENDOR
 *       2. Menemukan semua item yang dipilih untuk produk ini dalam pengiriman
 *       3. Mendistribusikan berat secara proporsional berdasarkan kuantitas yang diminta setiap item
 *       4. Mencatat berat untuk setiap item dan produk yang dipilih
 *       5. Memperbarui semua item ke status COMPLETED
 *
 *       Endpoint ini hanya menerima data penimbangan untuk produk yang secara khusus
 *       dipilih dengan metode penimbangan VENDOR selama proses pemilihan produk.
 *
 *       **Autentikasi**: Menggunakan header x-auth alih-alih token JWT Bearer.
 *     tags:
 *       - Vendor Weighing API
 *     parameters:
 *       - in: header
 *         name: x-auth
 *         required: true
 *         schema:
 *           type: string
 *           example: "vendor-api-key-12345"
 *         description: Kunci API vendor untuk autentikasi (disediakan oleh administrator sistem)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shipmentId
 *               - productId
 *               - grossWeight
 *             properties:
 *               shipmentId:
 *                 type: string
 *                 format: uuid
 *                 description: ID pengiriman yang berisi item yang akan ditimbang
 *               productId:
 *                 type: string
 *                 format: uuid
 *                 description: ID produk yang akan ditimbang (harus ditandai untuk penimbangan vendor)
 *               grossWeight:
 *                 type: number
 *                 description: Total berat kotor untuk semua item dengan produk ini
 *                 minimum: 0
 *               netWeight:
 *                 type: number
 *                 description: Total berat bersih untuk semua item dengan produk ini (opsional)
 *                 minimum: 0
 *               tareWeight:
 *                 type: number
 *                 description: Total berat tara untuk semua item dengan produk ini (opsional)
 *                 minimum: 0
 *     responses:
 *       200:
 *         description: Berhasil memproses penimbangan vendor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     product:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                           format: uuid
 *                         name:
 *                           type: string
 *                         satuan:
 *                           type: string
 *                     shipment:
 *                       type: object
 *                       description: Informasi pengiriman
 *                     weights:
 *                       type: object
 *                       properties:
 *                         gross:
 *                           type: number
 *                         net:
 *                           type: number
 *                         tare:
 *                           type: number
 *                     status:
 *                       type: string
 *                       example: "COMPLETED"
 *                     locationType:
 *                       type: string
 *                     weighedAt:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: Permintaan buruk - Produk tidak ditandai untuk penimbangan vendor atau kesalahan validasi
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 error:
 *                   type: object
 *                   properties:
 *                     message:
 *                       type: string
 *                       example: "Produk ini tidak ditandai untuk penimbangan vendor"
 *                     errorCode:
 *                       type: string
 *                       example: "BUKAN_PRODUK_VENDOR"
 *       401:
 *         description: Tidak diotorisasi - Kunci API vendor tidak valid atau hilang
 *       404:
 *         description: Pengiriman, produk, atau item yang dipilih tidak ditemukan
 *       500:
 *         description: Kesalahan server
 */
router.post('/shipments/bulk-weigh', vendorController.bulkWeighShipmentItems);

export default router;
