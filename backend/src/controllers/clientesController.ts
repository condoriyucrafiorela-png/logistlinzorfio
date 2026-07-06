import type { Request, Response } from "express"
import * as clientesService from "../services/clientesService.js"

const esIdValido = (id: string) => /^\d+$/.test(id)

export const getClientes = async (_req: Request, res: Response) => {
    try {
        const clientes = await clientesService.listarClientes()
        res.json({ clientes })
    } catch (error) {
        console.error("ERROR getClientes:", error)
        res.status(500).json({ mensaje: "Error del servidor." })
    }
}

export const crearCliente = async (req: Request, res: Response) => {
    try {
        const { nombre, requerimientos } = req.body
        if (!nombre?.trim()) {
            return res.status(400).json({ mensaje: "El nombre es obligatorio." })
        }
        const id = await clientesService.crearCliente(nombre.trim(), requerimientos ?? [])
        res.status(201).json({ mensaje: "Cliente creado.", id })
    } catch (error: any) {
        if (error.code === "23505") {
            return res.status(409).json({ mensaje: "Ya existe un cliente con ese nombre." })
        }
        console.error("ERROR crearCliente:", error)
        res.status(500).json({ mensaje: "Error del servidor." })
    }
}

export const actualizarCliente = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string
        const { nombre, requerimientos } = req.body

        if (!esIdValido(id)) {
            return res.status(400).json({ mensaje: "ID inválido." })
        }
        if (!nombre?.trim()) {
            return res.status(400).json({ mensaje: "El nombre es obligatorio." })
        }
        await clientesService.actualizarCliente(id, nombre.trim(), requerimientos ?? [])
        res.json({ mensaje: "Cliente actualizado." })
    } catch (error: any) {
        if (error.code === "23505") {
            return res.status(409).json({ mensaje: "Ya existe un cliente con ese nombre." })
        }
        console.error("ERROR actualizarCliente:", error)
        res.status(500).json({ mensaje: "Error del servidor." })
    }
}

export const eliminarCliente = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string

        if (!esIdValido(id)) {
            return res.status(400).json({ mensaje: "ID inválido." })
        }

        await clientesService.eliminarCliente(id)
        res.json({ mensaje: "Cliente eliminado." })
    } catch (error) {
        console.error("ERROR eliminarCliente:", error)
        res.status(500).json({ mensaje: "Error del servidor." })
    }
}