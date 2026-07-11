import type { Request, Response } from "express"
import pool from "../config/db.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import crypto from "crypto"

const TIEMPOS_BLOQUEO = [
    5 * 60 * 1000,       
    15 * 60 * 1000,      
    30 * 60 * 1000,      
    60 * 60 * 1000,      
    2 * 60 * 60 * 1000,  
    24 * 60 * 60 * 1000  
]

const MAX_INTENTOS = 5

const obtenerIp = (req: Request): string =>
    (req.headers["x-forwarded-for"] as string)?.split(",")[0] ?? req.ip ?? "unknown"

const generarAccessToken = (usuario: any): string => {
    const jwtSecret = process.env.JWT_SECRET || "secreto_jwt"
    return jwt.sign(
        { 
            id: usuario.id, 
            rol: usuario.rol, 
            primer_nombre: usuario.primer_nombre, 
            primer_apellido: usuario.primer_apellido 
        },
        jwtSecret,
        { expiresIn: "15m" }
    )
}

const generarRefreshToken = (): string => crypto.randomBytes(64).toString("hex")

export const login = async (req: Request, res: Response) => {
    const { correo, password } = req.body
    const ip = obtenerIp(req)

    if (!correo || typeof correo !== "string" || !correo.includes("@")) {
        return res.status(400).json({ mensaje: "Correo inválido." })
    }
    if (!password || typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ mensaje: "Contraseña inválida." })
    }

    try {
        const ultimoExito = await pool.query(
            "SELECT creado_en FROM login_intentos WHERE ip = $1 AND exitoso = true ORDER BY creado_en DESC LIMIT 1",
            [ip]
        )
        const fechaLimite = ultimoExito.rows[0]?.creado_en || new Date(0)

        const fallosRecientes = await pool.query(
            "SELECT creado_en FROM login_intentos WHERE ip = $1 AND exitoso = false AND creado_en > $2 ORDER BY creado_en DESC",
            [ip, fechaLimite]
        )

        const totalFallos = fallosRecientes.rows.length

        if (totalFallos >= MAX_INTENTOS) {
            const ultimoFallo = new Date(fallosRecientes.rows[0].creado_en).getTime()
            const nivel = totalFallos - MAX_INTENTOS
            const tiempoBloqueoActual = TIEMPOS_BLOQUEO[Math.min(nivel, TIEMPOS_BLOQUEO.length - 1)] ?? (24 * 60 * 60 * 1000)
            const msRestantes = tiempoBloqueoActual - (Date.now() - ultimoFallo)

            if (msRestantes > 0) {
                if (tiempoBloqueoActual >= 60 * 60 * 1000) {
                    const horasRestantes = Math.ceil(msRestantes / (1000 * 60 * 60))
                    return res.status(429).json({ 
                        mensaje: `Demasiados intentos fallidos. Su acceso ha sido suspendido por ${horasRestantes} horas.` 
                    })
                } else {
                    const minutosRestantes = Math.ceil(msRestantes / 60000)
                    return res.status(429).json({ 
                        mensaje: `Demasiados intentos fallidos. Su acceso ha sido suspendido por ${minutosRestantes} minutos.` 
                    })
                }
            }
        }

        const result = await pool.query(
            "SELECT * FROM usuarios WHERE LOWER(correo) = LOWER($1)",
            [correo.trim()]
        )

        const usuario = result.rows[0]

        if (!usuario) {
            await pool.query(
                "INSERT INTO login_intentos (correo, ip, exitoso) VALUES ($1, $2, false)",
                [correo.trim(), ip]
            )
            return res.status(401).json({ mensaje: "Credenciales incorrectas" })
        }

        if (usuario.rol !== "logistica") {
            await pool.query(
                "INSERT INTO login_intentos (correo, ip, exitoso) VALUES ($1, $2, false)",
                [correo.trim(), ip]
            )
            return res.status(403).json({ mensaje: "No tienes permiso para acceder" })
        }

        const passwordValida = await bcrypt.compare(password, usuario.password)
        if (!passwordValida) {
            await pool.query(
                "INSERT INTO login_intentos (correo, ip, exitoso) VALUES ($1, $2, false)",
                [correo.trim(), ip]
            )

            const intentosRestantes = MAX_INTENTOS - (totalFallos + 1)

            return res.status(401).json({ 
                mensaje: intentosRestantes > 0 
                    ? `Credenciales incorrectas. Te quedan ${intentosRestantes} intentos.`
                    : `Demasiados intentos fallidos.`
            })
        }

        const accessToken = generarAccessToken(usuario)
        const refreshToken = generarRefreshToken()
        const expiraEn = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

        await pool.query(
            "INSERT INTO refresh_tokens (usuario_id, token, expira_en) VALUES ($1, $2, $3)",
            [usuario.id, refreshToken, expiraEn]
        )

        await pool.query(
            "INSERT INTO login_intentos (correo, ip, exitoso) VALUES ($1, $2, true)",
            [correo.trim(), ip]
        )

        res.json({ token: accessToken, refreshToken, rol: usuario.rol })

    } catch (error) {
        console.error("ERROR LOGIN:", error)
        res.status(500).json({ mensaje: "Error del servidor" })
    }
}

export const refresh = async (req: Request, res: Response) => {
    const { refreshToken } = req.body
    if (!refreshToken) return res.status(400).json({ mensaje: "Refresh token requerido" })

    try {
        const result = await pool.query(
            `SELECT rt.*, u.id as uid, u.rol, u.primer_nombre, u.primer_apellido 
             FROM refresh_tokens rt 
             INNER JOIN usuarios u ON u.id = rt.usuario_id 
             WHERE rt.token = $1`,
            [refreshToken]
        )
        const tokenData = result.rows[0]

        if (!tokenData) return res.status(403).json({ mensaje: "Refresh token inválido" })

        if (new Date() > new Date(tokenData.expira_en)) {
            await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [refreshToken])
            return res.status(403).json({ mensaje: "Sesión expirada, inicie sesión nuevamente" })
        }

        const nuevoRefreshToken = generarRefreshToken()
        const nuevaExpiracion = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

        await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [refreshToken])
        await pool.query(
            "INSERT INTO refresh_tokens (usuario_id, token, expira_en) VALUES ($1, $2, $3)",
            [tokenData.uid, nuevoRefreshToken, nuevaExpiracion]
        )

        const nuevoAccessToken = generarAccessToken({
            id: tokenData.uid,
            rol: tokenData.rol,
            primer_nombre: tokenData.primer_nombre,
            primer_apellido: tokenData.primer_apellido
        })

        res.json({ token: nuevoAccessToken, refreshToken: nuevoRefreshToken })

    } catch (error) {
        console.error("ERROR REFRESH:", error)
        res.status(500).json({ mensaje: "Error del servidor" })
    }
}

export const logout = async (req: Request, res: Response) => {
    const { refreshToken } = req.body
    if (!refreshToken) return res.status(400).json({ mensaje: "Refresh token requerido" })

    try {
        await pool.query("DELETE FROM refresh_tokens WHERE token = $1", [refreshToken])
        res.json({ mensaje: "Sesión cerrada correctamente" })
    } catch (error) {
        console.error("ERROR LOGOUT:", error)
        res.status(500).json({ mensaje: "Error del servidor" })
    }
}