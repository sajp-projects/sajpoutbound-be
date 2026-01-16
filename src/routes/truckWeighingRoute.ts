import express from 'express';
import truckWeighingController from '../controllers/truckWeighingController';

const router = express.Router();

/**
 * @openapi
 * tags:
 *   - name: Vendor Truck Weighing API
 *     description: |
 *       Endpoint API publik untuk penimbangan truk vendor.
 *
 *       ## Autentikasi
 *       Endpoint ini menggunakan header `x-auth` untuk autentikasi vendor.
 *
 *       ## Alur Kerja
 *       1. Timbang truk kosong (PRE) sebelum muat barang
 *       2. Proses pemilihan dan penimbangan produk
 *       3. Timbang truk setelah muat (POST) sebelum verifikasi plat
 */

/**
 * @openapi
 * /api/vendor/truck-weighing/shipments:
 *   get:
 *     summary: Dapatkan daftar pengiriman yang membutuhkan penimbangan truk
 *     description: |
 *       **Endpoint API Publik** - Tidak memerlukan autentikasi JWT, hanya header x-auth.
 *
 *       Mengembalikan daftar pengiriman yang membutuhkan penimbangan truk (PRE atau POST).
 *
 *       **Kriteria pengiriman:**
 *       - Perlu PRE: Status PENDING dan belum ada berat pre-weighing
 *       - Perlu POST: Status PROSES, semua item COMPLETED, dan belum ada berat post-weighing
 *
 *       **Data yang disediakan:**
 *       - Informasi pengiriman (ID, nomor, plat nomor)
 *       - Status kebutuhan penimbangan (needsPreWeighing, needsPostWeighing)
 *       - Informasi armada kendaraan
 *     tags:
 *       - Vendor Truck Weighing API
 *     parameters:
 *       - in: header
 *         name: x-auth
 *         required: true
 *         schema:
 *           type: string
 *           example: "vendor-api-key-12345"
 *         description: Kunci API vendor untuk autentikasi
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar pengiriman
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
 *                             description: Nomor pengiriman
 *                           plateNumber:
 *                             type: string
 *                             description: Plat nomor kendaraan
 *                           status:
 *                             type: string
 *                             enum: [PENDING, PROSES]
 *                             description: Status pengiriman saat ini
 *                           needsPreWeighing:
 *                             type: boolean
 *                             description: Apakah membutuhkan penimbangan PRE
 *                           needsPostWeighing:
 *                             type: boolean
 *                             description: Apakah membutuhkan penimbangan POST
 *                           armada:
 *                             type: object
 *                             nullable: true
 *                             properties:
 *                               model:
 *                                 type: string
 *                                 description: Model kendaraan
 *                               plateNumber:
 *                                 type: string
 *                                 description: Plat nomor armada
 *       401:
 *         description: Tidak diotorisasi - Kunci API vendor tidak valid atau hilang
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
 *                       example: "Kunci API vendor tidak valid"
 *                     errorCode:
 *                       type: string
 *                       example: "INVALID_VENDOR_KEY"
 *       500:
 *         description: Kesalahan server
 */
router.get('/shipments', truckWeighingController.getShipmentsForTruckWeighing);

/**
 * @openapi
 * /api/vendor/truck-weighing/shipments/{shipmentId}:
 *   get:
 *     summary: Dapatkan detail pengiriman untuk penimbangan truk
 *     description: |
 *       **Endpoint API Publik** - Tidak memerlukan autentikasi JWT, hanya header x-auth.
 *
 *       Mengembalikan detail pengiriman tertentu termasuk status penimbangan dan
 *       informasi berat yang sudah tercatat.
 *
 *       **Data yang disediakan:**
 *       - Informasi pengiriman lengkap
 *       - Status kebutuhan penimbangan
 *       - Berat PRE dan POST yang sudah tercatat
 *       - Waktu penimbangan
 *       - Progress item (completed vs total)
 *     tags:
 *       - Vendor Truck Weighing API
 *     parameters:
 *       - in: header
 *         name: x-auth
 *         required: true
 *         schema:
 *           type: string
 *           example: "vendor-api-key-12345"
 *         description: Kunci API vendor untuk autentikasi
 *       - in: path
 *         name: shipmentId
 *         required: true
 *         schema:
 *           type: string
 *           format: uuid
 *         description: ID pengiriman yang akan dilihat
 *     responses:
 *       200:
 *         description: Berhasil mengambil detail pengiriman
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
 *                         plateNumber:
 *                           type: string
 *                         status:
 *                           type: string
 *                           enum: [PENDING, PROSES]
 *                         needsPreWeighing:
 *                           type: boolean
 *                         needsPostWeighing:
 *                           type: boolean
 *                         preWeighingWeight:
 *                           type: number
 *                           nullable: true
 *                           description: Berat penimbangan PRE (kg)
 *                         preWeighingAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                           description: Waktu penimbangan PRE
 *                         postWeighingWeight:
 *                           type: number
 *                           nullable: true
 *                           description: Berat penimbangan POST (kg)
 *                         postWeighingAt:
 *                           type: string
 *                           format: date-time
 *                           nullable: true
 *                           description: Waktu penimbangan POST
 *                         armada:
 *                           type: object
 *                           nullable: true
 *                           properties:
 *                             model:
 *                               type: string
 *                             plateNumber:
 *                               type: string
 *                         itemsCompleted:
 *                           type: number
 *                           description: Jumlah item yang sudah COMPLETED
 *                         itemsTotal:
 *                           type: number
 *                           description: Total item (non-cancelled)
 *       401:
 *         description: Tidak diotorisasi - Kunci API vendor tidak valid atau hilang
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
 *                       example: "Kunci API vendor tidak valid"
 *                     errorCode:
 *                       type: string
 *                       example: "INVALID_VENDOR_KEY"
 *       404:
 *         description: Pengiriman tidak ditemukan
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
 *                       example: "Pengiriman tidak ditemukan"
 *                     errorCode:
 *                       type: string
 *                       example: "SHIPMENT_NOT_FOUND"
 *       500:
 *         description: Kesalahan server
 */
router.get('/shipments/:shipmentId', truckWeighingController.getShipmentDetailForTruckWeighing);

/**
 * @openapi
 * /api/vendor/truck-weighing/weigh:
 *   post:
 *     summary: Lakukan penimbangan truk (PRE atau POST)
 *     description: |
 *       **Endpoint API Publik** - Tidak memerlukan autentikasi JWT, hanya header x-auth.
 *
 *       Endpoint untuk mencatat berat penimbangan truk.
 *
 *       **Jenis penimbangan:**
 *       - **PRE**: Penimbangan truk kosong sebelum muat barang
 *         - Hanya untuk pengiriman dengan status PENDING
 *         - Mengubah status pengiriman ke PROSES
 *       - **POST**: Penimbangan truk setelah muat barang
 *         - Hanya untuk pengiriman dengan status PROSES
 *         - Semua item harus sudah COMPLETED
 *
 *       **Autentikasi**: Menggunakan header x-auth.
 *     tags:
 *       - Vendor Truck Weighing API
 *     parameters:
 *       - in: header
 *         name: x-auth
 *         required: true
 *         schema:
 *           type: string
 *           example: "vendor-api-key-12345"
 *         description: Kunci API vendor untuk autentikasi
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - shipmentId
 *               - type
 *               - weight
 *             properties:
 *               shipmentId:
 *                 type: string
 *                 format: uuid
 *                 description: ID pengiriman yang akan ditimbang
 *               type:
 *                 type: string
 *                 enum: [PRE, POST]
 *                 description: |
 *                   Jenis penimbangan:
 *                   - PRE: Penimbangan truk kosong
 *                   - POST: Penimbangan truk setelah muat
 *               weight:
 *                 type: number
 *                 minimum: 0.01
 *                 description: Berat penimbangan (kg)
 *           example:
 *             shipmentId: "123e4567-e89b-12d3-a456-426614174000"
 *             type: "PRE"
 *             weight: 5000
 *     responses:
 *       200:
 *         description: Berhasil mencatat penimbangan
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
 *                     shipmentId:
 *                       type: string
 *                       format: uuid
 *                       description: ID pengiriman
 *                     type:
 *                       type: string
 *                       enum: [PRE, POST]
 *                       description: Jenis penimbangan yang dilakukan
 *                     weight:
 *                       type: number
 *                       description: Berat yang tercatat (kg)
 *                     weighedAt:
 *                       type: string
 *                       format: date-time
 *                       description: Waktu penimbangan
 *       400:
 *         description: Permintaan tidak valid - kesalahan validasi
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
 *                       example: "type harus PRE atau POST"
 *                     errorCode:
 *                       type: string
 *                       example: "VALIDATION_ERROR"
 *       401:
 *         description: Tidak diotorisasi - Kunci API vendor tidak valid atau hilang
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
 *                       example: "Kunci API vendor tidak valid"
 *                     errorCode:
 *                       type: string
 *                       example: "INVALID_VENDOR_KEY"
 *       404:
 *         description: Pengiriman tidak ditemukan
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
 *                       example: "Pengiriman tidak ditemukan"
 *                     errorCode:
 *                       type: string
 *                       example: "SHIPMENT_NOT_FOUND"
 *       500:
 *         description: Kesalahan server
 */
router.post('/weigh', truckWeighingController.performTruckWeighing);

export default router;
