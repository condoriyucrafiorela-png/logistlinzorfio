import type { Request, Response } from "express"
import pool from "../config/db.js"
import bcrypt from "bcryptjs"

export const crearUsuario = async (req: Request, res: Response) => {
    const { primer_nombre, primer_apellido, correo, password, rol } = req.body

    try {
        const passwordHash = await bcrypt.hash(password, 10)

        await pool.query(
            "INSERT INTO usuarios (primer_nombre, primer_apellido, correo, password, rol) VALUES ($1, $2, $3, $4, $5)",
            [primer_nombre, primer_apellido, correo, passwordHash, rol]
        )

        res.status(201).json({ mensaje: "Usuario creado correctamente" })

    } catch (error) {
        res.status(500).json({ mensaje: "Error al crear usuario" })
    }
}

export const obtenerPerfil = async (req: Request, res: Response) => {
    const usuarioId = (req as any).usuario.id

    try {
        const result = await pool.query(
            "SELECT id, primer_nombre, primer_apellido, correo, rol FROM usuarios WHERE id = $1",
            [usuarioId]
        )
        res.json(result.rows[0])
    } catch (error) {
        res.status(500).json({ mensaje: "Error al obtener datos del perfil" })
    }
}