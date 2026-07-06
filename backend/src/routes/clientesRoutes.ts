import { Router } from "express"
import { getClientes, crearCliente, actualizarCliente, eliminarCliente } from "../controllers/clientesController.js"
import { verificarToken } from "../middlewares/authMiddleware.js"

const router = Router()
router.get("/",  verificarToken, getClientes)
router.post("/", verificarToken, crearCliente)
router.put("/:id",    verificarToken, actualizarCliente)
router.delete("/:id", verificarToken, eliminarCliente)

export default router