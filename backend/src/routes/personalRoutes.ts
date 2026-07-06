import { Router } from "express"
import { getPersonal, crearPersonal, actualizarPersonal, eliminarPersonal } from "../controllers/personalController.js"
import { verificarToken } from "../middlewares/authMiddleware.js"

const router = Router()
router.get("/", verificarToken, getPersonal)
router.post("/", verificarToken, crearPersonal)
router.put("/:id",    verificarToken, actualizarPersonal)
router.delete("/:id", verificarToken, eliminarPersonal)

export default router