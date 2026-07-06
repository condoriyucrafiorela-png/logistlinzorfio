import type { Request, Response } from "express"
import * as entregasService from "../services/entregasService.js"

export const guardarEntregas = async (req: Request, res: Response) => {
    try {
        const { fecha, entregas } = req.body
        const usuarioId = (req as any).usuario?.id

        // Fecha en zona horaria de Lima (UTC-5)
        const ahora = new Date()
        const limaOffset = -5 * 60
        const limaTime = new Date(ahora.getTime() + (limaOffset - ahora.getTimezoneOffset()) * 60000)
        const hoy = limaTime.toISOString().split("T")[0]

        if (fecha !== hoy) {
            return res.status(403).json({ mensaje: "Solo puedes guardar el proceso del día de hoy." })
        }

        const yaExiste = await entregasService.existeSesion(fecha)
        if (yaExiste) {
            return res.status(409).json({ mensaje: "Ya existe un registro guardado para hoy." })
        }

        const sesionId = await entregasService.guardarSesion(fecha, usuarioId, entregas)
        res.status(201).json({ mensaje: "Guardado correctamente.", sesionId })

    } catch (error) {
        console.error("❌ ERROR guardarEntregas:", error)
        res.status(500).json({ mensaje: "Error del servidor." })
    }
}

export const getFechas = async (_req: Request, res: Response) => {
    try {
        const fechas = await entregasService.listarFechas()
        res.json({ fechas })
    } catch (error) {
        console.error("ERROR getFechas:", error)
        res.status(500).json({ mensaje: "Error del servidor." })
    }
}

export const getReportePorFecha = async (req: Request, res: Response) => {
    try {
        const fecha = req.params.fecha as string
        const reporte = await entregasService.obtenerReporte(fecha)

        if (!reporte) {
            return res.status(404).json({ mensaje: "No hay datos para esa fecha." })
        }

        res.json(reporte)
    } catch (error) {
        console.error("ERROR getReportePorFecha:", error)
        res.status(500).json({ mensaje: "Error del servidor." })
    }
}

export const guardarRegistro = async (req: Request, res: Response) => {
    try {
        const usuarioId = (req as any).usuario?.id
        const entrega   = req.body

        const sesionId = await entregasService.obtenerOCrearSesion(usuarioId)
        await entregasService.upsertRegistro(sesionId, entrega)

        res.status(200).json({ mensaje: "Registro guardado." })
    } catch (error) {
        console.error("ERROR guardarRegistro:", error)
        res.status(500).json({ mensaje: "Error del servidor." })
    }
}

export const getFoto = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string
        const registro = await entregasService.obtenerFoto(id)
        if (!registro) return res.status(404).json({ mensaje: "No encontrado" })
        res.json({ foto: registro.foto_rechazo })
    } catch (error) {
        console.error("ERROR getFoto:", error)
        res.status(500).json({ mensaje: "Error del servidor." })
    }
}

export const subirFotoEvidencia = async (req: Request, res: Response) => {
    try {
        // cast para acceder a req.file que agrega multer en runtime
        const file = (req as any).file as Express.Multer.File | undefined
        if (!file) {
            return res.status(400).json({ mensaje: "No se recibió ningún archivo." })
        }
        const ruta = `uploads/evidencias/${file.filename}`
        res.status(201).json({ ruta })
    } catch (error) {
        console.error("ERROR subirFotoEvidencia:", error)
        res.status(500).json({ mensaje: "Error del servidor." })
    }
}

export const actualizarEstado = async (req: Request, res: Response) => {
    try {
        const id     = req.params.id as string
        const { estado } = req.body
        const estadosValidos = ["conforme", "no_despachado"]
        if (!estadosValidos.includes(estado)) {
            return res.status(400).json({ mensaje: "Estado no válido." })
        }
        await entregasService.actualizarEstado(id, estado)
        res.json({ mensaje: "Estado actualizado." })
    } catch (error) {
        console.error("ERROR actualizarEstado:", error)
        res.status(500).json({ mensaje: "Error del servidor." })
    }
}

export const crearGestion = async (req: Request, res: Response) => {
    try {
        await entregasService.guardarGestion(req.body)
        res.status(201).json({ mensaje: "Gestión guardada." })
    } catch (error) {
        console.error("ERROR crearGestion:", error)
        res.status(500).json({ mensaje: "Error del servidor." })
    }
}

export const getPendientesGestion = async (req: Request, res: Response) => {
    try {
        const fecha = (req.query.fecha as string) ?? new Date().toISOString().split("T")[0]
        const pendientes = await entregasService.listarPendientesGestion(fecha)
        res.json({ total: pendientes.length, pendientes })
    } catch (error) {
        console.error("ERROR getPendientesGestion:", error)
        res.status(500).json({ mensaje: "Error del servidor." })
    }
}

export const getGestiones = async (req: Request, res: Response) => {
    try {
        const fecha = (req.query.fecha as string) ?? new Date().toISOString().split("T")[0]
        const gestiones = await entregasService.listarGestiones(fecha)
        res.json({ gestiones })
    } catch (error) {
        console.error("❌ ERROR getGestiones:", error)
        res.status(500).json({ mensaje: "Error del servidor." })
    }
}

export const descargarGestionesExcel = async (req: Request, res: Response) => {
    try {
        const fecha = (req.query.fecha as string) ?? new Date().toISOString().split("T")[0]
        const gestiones = await entregasService.listarGestiones(fecha)

        const ExcelJS = (await import("exceljs")).default
        const workbook = new ExcelJS.Workbook()
        const sheet = workbook.addWorksheet("Incidencias")

        sheet.columns = [
            { header: "Fecha de Creación",  key: "fecha",           width: 16 },
            { header: "En relación con",    key: "empresa_cliente", width: 28 },
            { header: "N Vale",             key: "nro_vale",        width: 12 },
            { header: "NRO Pedido",         key: "nro_pedido",      width: 12 },
            { header: "Número de Guías",    key: "nro_guia",        width: 14 },
            { header: "Clase",              key: "tipo_gestion",    width: 18 },
            { header: "Descripción",        key: "descripcion",     width: 35 },
            { header: "Chofer",             key: "motivo_rechazo",  width: 12 }, // ← cambiado
        ]

        sheet.getRow(1).font = { bold: true }

        gestiones.forEach((g: any) => {
            sheet.addRow({
                fecha:           new Date(g.fecha).toLocaleDateString("es-PE"),
                empresa_cliente: g.empresa_cliente,
                nro_vale:        g.nro_vale,
                nro_pedido:      g.nro_pedido,
                nro_guia:        g.nro_guia,
                tipo_gestion:    g.tipo_gestion,
                descripcion:     g.descripcion,
                motivo_rechazo:  g.motivo_rechazo ?? "—",  // ← cambiado
            })
        })

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        res.setHeader("Content-Disposition", `attachment; filename="Incidencias ${fecha}.xlsx"`)

        await workbook.xlsx.write(res)
        res.end()
    } catch (error) {
        console.error("❌ ERROR descargarGestionesExcel:", error)
        res.status(500).json({ mensaje: "Error del servidor." })
    }
}