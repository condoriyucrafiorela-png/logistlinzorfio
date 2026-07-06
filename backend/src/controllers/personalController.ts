import type { Request, Response } from "express"
import * as personalService from "../services/personalService.js"

export const getPersonal = async (_req: Request, res: Response) => {
    try {
        const personal = await personalService.listarPersonal()
        res.json({ personal })
    } catch (error) {
        console.error("ERROR getPersonal:", error)
        res.status(500).json({ mensaje: "Error del servidor." })
    }
}

export const crearPersonal = async (req: Request, res: Response) => {
    try {
        const { nombre, apellido, dni } = req.body
        if (!nombre?.trim() || !apellido?.trim() || !dni?.trim()) {
            return res.status(400).json({ mensaje: "Todos los campos son obligatorios." })
        }
        const nuevo = await personalService.crearPersonal(nombre.trim(), apellido.trim(), dni.trim())
        res.status(201).json({ mensaje: "Personal creado.", personal: nuevo })
    } catch (error: any) {
        if (error.code === "23505") {
            return res.status(409).json({ mensaje: "Ya existe personal con ese DNI." })
        }
        console.error("ERROR crearPersonal:", error)
        res.status(500).json({ mensaje: "Error del servidor." })
    }
}

export const actualizarPersonal = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string
        const { nombre, apellido, dni } = req.body
        if (!nombre?.trim() || !apellido?.trim() || !dni?.trim()) {
            return res.status(400).json({ mensaje: "Todos los campos son obligatorios." })
        }
        const actualizado = await personalService.actualizarPersonal(id, nombre.trim(), apellido.trim(), dni.trim())
        res.json({ mensaje: "Personal actualizado.", personal: actualizado })
    } catch (error: any) {
        if (error.code === "23505") {
            return res.status(409).json({ mensaje: "Ya existe personal con ese DNI." })
        }
        console.error("❌ ERROR actualizarPersonal:", error)
        res.status(500).json({ mensaje: "Error del servidor." })
    }
}

export const eliminarPersonal = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string
        await personalService.eliminarPersonal(id)
        res.json({ mensaje: "Personal eliminado." })
    } catch (error) {
        console.error("❌ ERROR eliminarPersonal:", error)
        res.status(500).json({ mensaje: "Error del servidor." })
    }
}