import type { Request, Response } from "express"
import pool from "../config/db.js"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

export const login = async (req: Request, res: Response) => {
    const { correo, password } = req.body

    if (!correo || typeof correo !== "string" || !correo.includes("@")) {
        return res.status(400).json({ mensaje: "Correo inválido." })
    }
    if (!password || typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ mensaje: "Contraseña inválida." })
    }

    try {
        const result = await pool.query(
            "SELECT * FROM usuarios WHERE LOWER(correo) = LOWER($1)",
            [correo.trim()]
        )

        const usuario = result.rows[0]

        if (!usuario) {
            return res.status(401).json({ mensaje: "Credenciales incorrectas" })
        }

        if (usuario.rol !== "logistica") {
            return res.status(403).json({ mensaje: "No tienes permiso para acceder" })
        }

        const passwordValida = await bcrypt.compare(password, usuario.password)
        if (!passwordValida) {
            return res.status(401).json({ mensaje: "Credenciales incorrectas" })
        }

        const jwtSecret = process.env.JWT_SECRET
        if (!jwtSecret) {
            throw new Error("JWT_SECRET no está configurado")
        }

        const token = jwt.sign(
            {
                id: usuario.id,
                rol: usuario.rol,
                primer_nombre: usuario.primer_nombre,
                primer_apellido: usuario.primer_apellido
            },
            jwtSecret,
            { expiresIn: "8h" }
        )

        res.json({ token, rol: usuario.rol })

    } catch (error) {
        console.error("ERROR LOGIN:", error)
        res.status(500).json({ mensaje: "Error del servidor" })
    }
}