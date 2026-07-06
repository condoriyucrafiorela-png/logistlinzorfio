import type { Request, Response } from "express"
import pool from "../config/db.js"
import bcrypt from "bcryptjs"

export const crearUsuario = async (req: Request, res: Response) => {
    const solicitante = (req as any).usuario
    if (solicitante.rol !== "logistica") {
        return res.status(403).json({ mensaje: "No tienes permiso para crear usuarios." })
    }

    const { primer_nombre, primer_apellido, correo, password, rol } = req.body

    if (!correo || typeof correo !== "string" || !correo.includes("@")) {
        return res.status(400).json({ mensaje: "Correo inválido." })
    }
    if (!password || typeof password !== "string" || password.length < 8) {
        return res.status(400).json({ mensaje: "Contraseña debe tener al menos 8 caracteres." })
    }
    if (!primer_nombre?.trim() || !primer_apellido?.trim()) {
        return res.status(400).json({ mensaje: "Nombre y apellido son obligatorios." })
    }

    const rolesPermitidos = ["logistica"]
    if (!rolesPermitidos.includes(rol)) {
        return res.status(400).json({ mensaje: "Rol inválido." })
    }

    try {
        const passwordHash = await bcrypt.hash(password, 10)

        await pool.query(
            "INSERT INTO usuarios (primer_nombre, primer_apellido, correo, password, rol) VALUES ($1, $2, $3, $4, $5)",
            [primer_nombre.trim(), primer_apellido.trim(), correo.trim().toLowerCase(), passwordHash, rol]
        )

        res.status(201).json({ mensaje: "Usuario creado correctamente" })

    } catch (error: any) {
        if (error.code === "23505") {
            return res.status(409).json({ mensaje: "Ya existe un usuario con ese correo." })
        }
        console.error("ERROR crearUsuario:", error)
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
        console.error("ERROR obtenerPerfil:", error)
        res.status(500).json({ mensaje: "Error al obtener datos del perfil" })
    }
}