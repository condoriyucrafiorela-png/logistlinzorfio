import { Router } from "express"
import { crearUsuario, obtenerPerfil } from "../controllers/usuariosController.js"
import { verificarToken } from "../middlewares/authMiddleware.js"

const router = Router()

router.post("/crear", crearUsuario)
router.get("/perfil", verificarToken, obtenerPerfil)

export default router