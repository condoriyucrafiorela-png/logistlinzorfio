import { Router } from "express"
import type { StorageEngine, FileFilterCallback } from "multer"
import multer from "multer"
import path from "path"
import fs from "fs"

import { verificarToken } from "../middlewares/authMiddleware.js"
import {
    guardarEntregas, getFechas, getReportePorFecha,
    guardarRegistro, getFoto, subirFotoEvidencia,
    actualizarEstado, crearGestion,
    getPendientesGestion, getGestiones, descargarGestionesExcel
} from "../controllers/entregasController.js"

const dirEvidencias = path.join(process.cwd(), "uploads", "evidencias")
if (!fs.existsSync(dirEvidencias)) fs.mkdirSync(dirEvidencias, { recursive: true })

const storage: StorageEngine = multer.diskStorage({
    destination(_req, _file, cb) { cb(null, dirEvidencias) },
    filename(_req, file, cb) {
        const ext    = path.extname(file.originalname)
        const nombre = `evidencia_${Date.now()}${ext}`
        cb(null, nombre)
    }
})

const upload = multer({
    storage,
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

export default router