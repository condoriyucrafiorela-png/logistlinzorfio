import { Router } from "express"
import rateLimit from "express-rate-limit"
import { login } from "../controllers/authController.js"

const loginLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { mensaje: "Demasiados intentos de inicio de sesión. Intente en 15 minutos." },
    standardHeaders: true,
    legacyHeaders: false,
})

const router = Router()
router.post("/login", loginLimit, login)

export default router