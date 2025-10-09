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
 *       2. Dapatkan item pengiriman spesifik dengan grup pemuatan: `GET /api/vendor/shipments/{shipmentId}/available-items`
 *       3. Kirim data penimbangan untuk grup pemuatan: `POST /api/vendor/shipments/weigh`
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
 *                     loadingGroups:
 *                       type: array
 *                       description: Item yang dikelompokkan berdasarkan produk dan grup pemuatan
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             description: ID grup pemuatan
 *                           productId:
 *                             type: string
 *                             format: uuid
 *                             description: ID produk
 *                           productName:
 *                             type: string
 *                             description: Nama produk
 *                           productUnit:
 *                             type: string
 *                             description: Satuan produk
 *                           productCode:
 *                             type: string
 *                             description: Kode produk untuk referensi vendor
 *                           warehouse:
 *                             type: object
 *                             properties:
 *                               id:
 *                                 type: string
 *                                 format: uuid
 *                               name:
 *                                 type: string
 *                           doNumbers:
 *                             type: array
 *                             items:
 *                               type: string
 *                             description: Nomor-nomor DO dalam grup ini
 *                           deliveryOrderIds:
 *                             type: array
 *                             items:
 *                               type: string
 *                               format: uuid
 *                             description: ID DO dalam grup ini (untuk referensi)
 *                           customers:
 *                             type: array
 *                             items:
 *                               type: string
 *                             description: Nama pelanggan dalam grup ini
 *                           requestedQuantity:
 *                             type: number
 *                             description: Total kuantitas yang akan ditimbang dalam grup ini
 *                           itemCount:
 *                             type: number
 *                             description: Jumlah item dalam grup pemuatan ini
 *                           shipmentItemIds:
 *                             type: array
 *                             items:
 *                               type: string
 *                               format: uuid
 *                             description: ID semua item yang terkait dengan grup ini
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
 * /api/vendor/shipments/weigh:
 *   post:
 *     summary: Penimbangan vendor untuk item yang ditandai untuk penimbangan vendor
 *     description: |
 *       **Endpoint API Publik** - Tidak memerlukan autentikasi JWT, hanya header x-auth.
 *
 *       Endpoint ini memungkinkan sistem vendor untuk mengirim data penimbangan untuk item yang
 *       ditandai dengan metode penimbangan VENDOR. Endpoint ini memproses item CHOSEN dengan
 *       produk yang ditentukan dalam pengiriman dengan:
 *       1. Memvalidasi bahwa produk yang dipilih ditandai untuk penimbangan VENDOR
 *       2. Memvalidasi bahwa semua item berada dalam grup pemuatan yang sama (loadingGroupId)
 *       3. Menemukan item yang dipilih untuk produk dan loading group ini dalam pengiriman
 *       4. Mendistribusikan berat secara proporsional berdasarkan kuantitas yang diminta setiap item
 *       5. Mencatat berat untuk setiap item dan produk yang dipilih
 *       6. Memperbarui semua item ke status COMPLETED
 *
 *       **PENTING - Grup Pemuatan:**
 *       Item yang dimuat bersamaan (loading group) harus ditimbang bersamaan.
 *       Gunakan `loadingGroupId` dari response `/available-items` untuk menentukan
 *       grup mana yang akan ditimbang.
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
 *               - loadingGroupId
 *               - grossWeight
 *             properties:
 *               shipmentId:
 *                 type: string
 *                 format: uuid
 *                 description: ID pengiriman yang berisi item yang akan ditimbang
 *               loadingGroupId:
 *                 type: string
 *                 description: |
 *                   ID grup pemuatan yang akan ditimbang (wajib).
 *                   Gunakan id dari loadingGroups di response /available-items untuk memastikan grup yang benar.
 *                   Loading group ID sudah berisi informasi produk, jadi productId tidak diperlukan.
 *               grossWeight:
 *                 type: number
 *                 description: Total berat kotor untuk item yang dipilih
 *                 minimum: 0
 *               netWeight:
 *                 type: number
 *                 description: Total berat bersih untuk item yang dipilih (opsional)
 *                 minimum: 0
 *               tareWeight:
 *                 type: number
 *                 description: Total berat tara untuk item yang dipilih (opsional)
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
router.post('/shipments/weigh', vendorController.bulkWeighShipmentItems);

export default router;
