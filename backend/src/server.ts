import "dotenv/config"
import express from "express"
import cors from "cors"
import path from "path"
import helmet from "helmet"
import rateLimit from "express-rate-limit"

import authRoutes from "./routes/authRoutes.js"
import usuariosRoutes from "./routes/usuariosRoutes.js"
import dashboardRoutes from "./routes/dashboardRoutes.js"
import entregasRoutes from "./routes/entregasRoutes.js"
import personalRoutes from "./routes/personalRoutes.js"
import clientesRoutes from "./routes/clientesRoutes.js"
import { verificarToken } from "./middlewares/authMiddleware.js"

const app = express()

// ── Seguridad HTTP ──
app.use(helmet())

// ── Rate limit general (todas las rutas) ──
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,   // 15 minutos
    max: 200,                    // máx 200 requests por IP cada 15 min
    message: { mensaje: "Demasiadas solicitudes, intente más tarde." }
}))

// ── CORS: ahora acepta local Y producción ──
app.use(cors({
    origin: [
        "http://localhost:5173",
        process.env.FRONTEND_URL || ""
    ],
    credentials: true
}))

app.use(express.json({ limit: "10mb" }))

// Rutas públicas
app.use("/api/auth",     authRoutes)
app.use("/api/usuarios", usuariosRoutes)

// Rutas protegidas
app.use("/api/dashboard",  verificarToken, dashboardRoutes)
app.use("/api/entregas",   verificarToken, entregasRoutes)
app.use("/api/personal",   verificarToken, personalRoutes)
app.use("/api/clientes",   verificarToken, clientesRoutes)

app.use("/uploads", express.static(path.join(process.cwd(), "uploads")))

// ── Puerto dinámico para Railway ──
const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`))