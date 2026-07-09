import type { Request, Response } from "express"
import * as entregasService from "../services/entregasService.js"
import cloudinary from "../config/cloudinary.js"
import streamifier from "streamifier"

// ── Helpers de validación ──────────────────────────────────
const esFechaValida = (fecha: string) => /^\d{4}-\d{2}-\d{2}$/.test(fecha)
const esIdValido = (id: string) => /^\d+$/.test(id)

const sanitizarCeldaExcel = (valor: any): string => {
    const texto = String(valor ?? "")
    if (/^[=+\-@]/.test(texto)) {
        return `'${texto}` // el apóstrofe fuerza a Excel a tratarlo como texto, no fórmula
    }
    return texto
}

export const guardarEntregas = async (req: Request, res: Response) => {
    try {
        const { fecha, entregas } = req.body
        const usuarioId = (req as any).usuario?.id

        if (!fecha || !esFechaValida(fecha)) {
            return res.status(400).json({ mensaje: "Formato de fecha inválido." })
        }
        if (!Array.isArray(entregas)) {
            return res.status(400).json({ mensaje: "Formato de entregas inválido." })
        }

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
        console.error("ERROR guardarEntregas:", error)
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

        if (!esFechaValida(fecha)) {
            return res.status(400).json({ mensaje: "Formato de fecha inválido." })
        }

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
        const entrega = req.body

        if (!entrega || typeof entrega !== "object") {
            return res.status(400).json({ mensaje: "Datos de entrega inválidos." })
        }

        // Usa fechaProceso si viene, si no usa hoy Lima
        const fechaParam = entrega.fechaProceso
        const ahora = new Date()
        const limaTime = new Date(ahora.getTime() + (-5 * 60 - ahora.getTimezoneOffset()) * 60000)
        const fechaUsar = (fechaParam && esFechaValida(fechaParam))
            ? fechaParam
            : limaTime.toISOString().split("T")[0]

        const sesionId = await entregasService.obtenerOCrearSesionConFecha(usuarioId, fechaUsar)
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

        if (!esIdValido(id)) {
            return res.status(400).json({ mensaje: "ID inválido." })
        }

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
        const file = (req as any).file as Express.Multer.File | undefined
        if (!file) {
            return res.status(400).json({ mensaje: "No se recibió ningún archivo." })
        }

        const resultado = await new Promise<any>((resolve, reject) => {
            const stream = cloudinary.uploader.upload_stream(
                {
                    folder: "logistlinzor/evidencias",
                    public_id: `evidencia_${Date.now()}`,
                    resource_type: "image"
                },
                (error, result) => {
                    if (error) reject(error)
                    else resolve(result)
                }
            )
            streamifier.createReadStream(file.buffer).pipe(stream)
        })

        res.status(201).json({ ruta: resultado.secure_url })

    } catch (error) {
        console.error("ERROR subirFotoEvidencia:", error)
        res.status(500).json({ mensaje: "Error al subir la imagen." })
    }
}

export const actualizarEstado = async (req: Request, res: Response) => {
    try {
        const id = req.params.id as string
        const { estado } = req.body

        if (!esIdValido(id)) {
            return res.status(400).json({ mensaje: "ID inválido." })
        }

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
        const { registroId, empresaCliente, nroVale, tipoGestion, descripcion, chofer } = req.body

        if (!registroId || !Number.isInteger(Number(registroId))) {
            return res.status(400).json({ mensaje: "registroId inválido." })
        }
        if (!empresaCliente?.trim() || !tipoGestion?.trim() || !descripcion?.trim()) {
            return res.status(400).json({ mensaje: "Empresa, tipo de gestión y descripción son obligatorios." })
        }
        if (descripcion.length > 1000) {
            return res.status(400).json({ mensaje: "Descripción demasiado larga." })
        }

        await entregasService.guardarGestion({
            registroId,
            empresaCliente: empresaCliente.trim(),
            nroVale,
            tipoGestion: tipoGestion.trim(),
            descripcion: descripcion.trim(),
            chofer
        })
        res.status(201).json({ mensaje: "Gestión guardada." })
    } catch (error) {
        console.error("ERROR crearGestion:", error)
        res.status(500).json({ mensaje: "Error del servidor." })
    }
}

export const getPendientesGestion = async (req: Request, res: Response) => {
    try {
        const fecha = (req.query.fecha as string) || new Date().toISOString().split("T")[0]

        if (!esFechaValida(fecha)) {
            return res.status(400).json({ mensaje: "Formato de fecha inválido." })
        }

        const pendientes = await entregasService.listarPendientesGestion(fecha)
        res.json({ total: pendientes.length, pendientes })
    } catch (error) {
        console.error("ERROR getPendientesGestion:", error)
        res.status(500).json({ mensaje: "Error del servidor." })
    }
}

export const getGestiones = async (req: Request, res: Response) => {
    try {
        const fecha = (req.query.fecha as string) || new Date().toISOString().split("T")[0]
        
        if (!esFechaValida(fecha)) {
            return res.status(400).json({ mensaje: "Formato de fecha inválido." })
        }

        const gestiones = await entregasService.listarGestiones(fecha)
        res.json({ gestiones })
    } catch (error) {
        console.error("ERROR getGestiones:", error)
        res.status(500).json({ mensaje: "Error del servidor." })
    }
}

export const descargarGestionesExcel = async (req: Request, res: Response) => {
    try {
        const fecha = (req.query.fecha as string) ?? new Date().toISOString().split("T")[0]

        if (!esFechaValida(fecha)) {
            return res.status(400).json({ mensaje: "Formato de fecha inválido." })
        }

        const gestiones = await entregasService.listarGestiones(fecha)

        const ExcelJS = (await import("exceljs")).default
        const workbook = new ExcelJS.Workbook()
        const sheet = workbook.addWorksheet("Incidencias")

        sheet.columns = [
            { header: "Fecha de Creación", key: "fecha", width: 16 },
            { header: "En relación con", key: "empresa_cliente", width: 28 },
            { header: "N Vale", key: "nro_vale", width: 12 },
            { header: "NRO Pedido", key: "nro_pedido", width: 12 },
            { header: "Número de Guías", key: "nro_guia", width: 14 },
            { header: "Clase", key: "tipo_gestion", width: 18 },
            { header: "Descripción", key: "descripcion", width: 35 },
            { header: "Chofer", key: "motivo_rechazo", width: 12 },
        ]

        sheet.getRow(1).font = { bold: true }

        gestiones.forEach((g: any) => {
            sheet.addRow({
                fecha: new Date(g.fecha).toLocaleDateString("es-PE"),
                empresa_cliente: sanitizarCeldaExcel(g.empresa_cliente),
                nro_vale: sanitizarCeldaExcel(g.nro_vale),
                nro_pedido: sanitizarCeldaExcel(g.nro_pedido),
                nro_guia: sanitizarCeldaExcel(g.nro_guia),
                tipo_gestion: sanitizarCeldaExcel(g.tipo_gestion),
                descripcion: sanitizarCeldaExcel(g.descripcion),
                motivo_rechazo: sanitizarCeldaExcel(g.motivo_rechazo ?? "—"),
            })
        })

        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
        res.setHeader("Content-Disposition", `attachment; filename="Incidencias ${fecha}.xlsx"`)

        await workbook.xlsx.write(res)
        res.end()
    } catch (error) {
        console.error("ERROR descargarGestionesExcel:", error)
        res.status(500).json({ mensaje: "Error del servidor." })
    }
}

export const reiniciarProcesoPorFecha = async (req: Request, res: Response) => {
    try {
        // Forzamos que sea tratado estrictamente como string para solucionar los errores de tipado
        const fecha = req.params.fecha as string

        if (!fecha || !esFechaValida(fecha)) {
            return res.status(400).json({ mensaje: "Formato de fecha inválido." })
        }

        // 1. Verificar si existe la sesión para esa fecha
        const yaExiste = await entregasService.existeSesion(fecha)
        if (!yaExiste) {
            return res.status(404).json({ mensaje: "No se encontró ningún proceso registrado para esta fecha." })
        }

        // 2. Ejecutar la eliminación en el servicio
        await entregasService.eliminarProcesoCompleto(fecha)

        res.json({ mensaje: "El proceso ha sido reiniciado y los registros eliminados correctamente." })
    } catch (error) {
        console.error("ERROR reiniciarProcesoPorFecha:", error)
        res.status(500).json({ mensaje: "Error del servidor al reiniciar el proceso." })
    }
}
