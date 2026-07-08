import { Router } from "express"
import type { FileFilterCallback } from "multer"
import multer from "multer"

import { verificarToken } from "../middlewares/authMiddleware.js"
import {
    guardarEntregas, getFechas, getReportePorFecha,
    guardarRegistro, getFoto, subirFotoEvidencia,
    actualizarEstado, crearGestion,
    getPendientesGestion, getGestiones, descargarGestionesExcel,
    reiniciarProcesoPorFecha
} from "../controllers/entregasController.js"

// ── Multer con memoria: el archivo llega como buffer, Cloudinary lo sube directo ──
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter(_req, file: Express.Multer.File, cb: FileFilterCallback) {
        /jpeg|jpg|png|webp/.test(file.mimetype)
            ? cb(null, true)
            : cb(new Error("Solo imágenes"))
    }
})

const router = Router()

router.post("/guardar",       verificarToken, guardarEntregas)
router.get("/fechas",         verificarToken, getFechas)
router.get("/reporte/:fecha", verificarToken, getReportePorFecha)
router.get("/foto/:id",       verificarToken, getFoto)
router.post("/registro",      verificarToken, guardarRegistro)
router.post("/subir-foto",    verificarToken, upload.single("foto"), subirFotoEvidencia)
router.put("/registro/:id/estado",  verificarToken, actualizarEstado)
router.post("/gestion",             verificarToken, crearGestion)
router.get("/gestion/pendientes", verificarToken, getPendientesGestion)
router.get("/gestion/listar",     verificarToken, getGestiones)
router.get("/gestion/excel",      verificarToken, descargarGestionesExcel)

router.delete("/reporte/:fecha/reiniciar", verificarToken, reiniciarProcesoPorFecha)

export default router