import pool from "../config/db.js"

// ── Sesión diaria ──────────────────────────────────────────

export const existeSesion = async (fecha: string): Promise<boolean> => {
    const r = await pool.query(
        "SELECT id FROM sesiones_diarias WHERE fecha = $1", [fecha]
    )
    return r.rows.length > 0
}

export const obtenerOCrearSesion = async (usuarioId: number): Promise<number> => {
    const ahora = new Date()
    const limaOffset = -5 * 60
    const limaTime = new Date(ahora.getTime() + (limaOffset - ahora.getTimezoneOffset()) * 60000)
    const hoy = limaTime.toISOString().split("T")[0]

    const existe = await pool.query(
        "SELECT id FROM sesiones_diarias WHERE fecha = $1", [hoy]
    )
    if (existe.rows.length > 0) return existe.rows[0].id

    const nueva = await pool.query(
        "INSERT INTO sesiones_diarias (fecha, usuario_id) VALUES ($1, $2) RETURNING id",
        [hoy, usuarioId]
    )
    return nueva.rows[0].id
}

// ── Guardar en lote (Importación desde Excel) ─────────────

export const guardarSesion = async (
    fecha: string,
    usuarioId: number,
    entregas: any[]
) => {
    const client = await pool.connect()
    try {
        await client.query("BEGIN")

        const sesion = await client.query(
            "INSERT INTO sesiones_diarias (fecha, usuario_id) VALUES ($1, $2) RETURNING id",
            [fecha, usuarioId]
        )
        const sesionId = sesion.rows[0].id

        const idsInsertados: number[] = []

        for (const e of entregas) {
            const r = await client.query(
                `INSERT INTO registros_entrega
                 (sesion_id, nro_guia, nro_pedido, nro_vale, razon_social, reporte, placa,
                  estado, motivo_rechazo, foto_rechazo)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                 RETURNING id`,
                [
                    sesionId,
                    e.nroGuia,
                    e.nroPedido,
                    e.nroVale,
                    e.razonSocial,
                    e.reporte,
                    e.placa,
                    e.estado,
                    e.motivoRechazo ?? null,
                    e.fotoRechazo ?? null
                ]
            )
            idsInsertados.push(r.rows[0].id)
        }

        await client.query("COMMIT")
        return { sesionId, ids: idsInsertados }
    } catch (err) {
        await client.query("ROLLBACK")
        throw err
    } finally {
        client.release()
    }
}

// ── Guardar registro individual (Tiempo Real) ─────────────

export const upsertRegistro = async (sesionId: number, entrega: any) => {
    await pool.query(
        `INSERT INTO registros_entrega
         (sesion_id, nro_guia, nro_pedido, nro_vale, razon_social, reporte, placa,
          estado, motivo_rechazo, foto_rechazo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (sesion_id, nro_guia)
         DO UPDATE SET
             estado         = EXCLUDED.estado,
             motivo_rechazo = EXCLUDED.motivo_rechazo,
             foto_rechazo   = EXCLUDED.foto_rechazo`,
        [
            sesionId, 
            entrega.nroGuia, 
            entrega.nroPedido, 
            entrega.nroVale ?? null, 
            entrega.razonSocial,
            entrega.reporte, 
            entrega.placa, 
            entrega.estado,
            entrega.motivoRechazo ?? null, 
            entrega.fotoRechazo ?? null
        ]
    )
}

// ── Consultas de reporte ───────────────────────────────────

export const listarFechas = async () => {
    const r = await pool.query(
        "SELECT fecha FROM sesiones_diarias ORDER BY fecha DESC"
    )
    return r.rows.map((row: any) => row.fecha)
}

export const obtenerReporte = async (fecha: string) => {
    const sesion = await pool.query(
        "SELECT id FROM sesiones_diarias WHERE fecha = $1", [fecha]
    )
    if (sesion.rows.length === 0) return null

    const sesionId = sesion.rows[0].id

    const registros = await pool.query(
        `SELECT re.id, re.sesion_id, re.nro_guia, re.nro_pedido, re.nro_vale, re.razon_social,
                re.reporte, re.placa, re.estado, re.motivo_rechazo,
                (gi.id IS NOT NULL) AS gestionado,
                gi.tipo_gestion,
                gi.descripcion AS descripcion_gestion,
                gi.chofer AS chofer_gestion
         FROM registros_entrega re
         LEFT JOIN gestiones_incidencia gi ON gi.registro_id = re.id
         WHERE re.sesion_id = $1
         ORDER BY re.id`,
        [sesionId]
    )

    const entregas = registros.rows || []
    return {
        fecha,
        total:          entregas.length,
        conformes:      entregas.filter((e: any) => e?.estado === "conforme").length,
        no_despachados: entregas.filter((e: any) => e?.estado === "no_despachado").length,
        entregas
    }
}

export const obtenerFoto = async (id: string) => {
    const r = await pool.query(
        "SELECT foto_rechazo FROM registros_entrega WHERE id = $1", [id]
    )
    return r.rows[0] ?? null
}

export const actualizarEstado = async (id: string, estado: string) => {
    await pool.query(
        "UPDATE registros_entrega SET estado = $1 WHERE id = $2",
        [estado, id]
    )
}

export const guardarGestion = async (gestion: any) => {
    await pool.query(
        `INSERT INTO gestiones_incidencia
         (registro_id, empresa_cliente, nro_vale, tipo_gestion, descripcion, chofer)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
            gestion.registroId, 
            gestion.empresaCliente,
            gestion.nroVale, 
            gestion.tipoGestion, 
            gestion.descripcion, 
            gestion.chofer ?? null
        ]
    )
}

export const contarPendientesGestion = async (fecha: string) => {
    const r = await pool.query(`
        SELECT COUNT(*) AS total
        FROM registros_entrega re
        JOIN sesiones_diarias sd ON sd.id = re.sesion_id
        LEFT JOIN gestiones_incidencia gi ON gi.registro_id = re.id
        WHERE re.estado = 'no_despachado' AND gi.id IS NULL AND sd.fecha = $1
    `, [fecha])
    return parseInt(r.rows[0].total)
}

export const listarGestiones = async (fecha: string) => {
    const r = await pool.query(`
        SELECT
            gi.id, 
            gi.empresa_cliente, 
            gi.nro_vale AS nro_vale,       
            gi.tipo_gestion,
            gi.descripcion, 
            gi.chofer, 
            gi.creado_en,
            re.nro_pedido AS nro_pedido,   
            re.nro_guia, 
            re.motivo_rechazo,
            sd.fecha
        FROM gestiones_incidencia gi
        JOIN registros_entrega re ON re.id = gi.registro_id
        JOIN sesiones_diarias sd ON sd.id = re.sesion_id
        WHERE sd.fecha = $1
        ORDER BY gi.creado_en DESC
    `, [fecha])
    return r.rows || []
}

export const listarPendientesGestion = async (fecha: string) => {
    const r = await pool.query(`
        SELECT re.id, re.nro_guia, re.nro_pedido, re.razon_social,
               re.reporte, re.motivo_rechazo
        FROM registros_entrega re
        JOIN sesiones_diarias sd ON sd.id = re.sesion_id
        LEFT JOIN gestiones_incidencia gi ON gi.registro_id = re.id
        WHERE re.estado = 'no_despachado' AND gi.id IS NULL AND sd.fecha = $1
        ORDER BY re.id
    `, [fecha])
    return r.rows
}

export const eliminarProcesoCompleto = async (fecha: string): Promise<void> => {
    const client = await pool.connect()
    try {
        await client.query("BEGIN")

        const sesionRes = await client.query(
            "SELECT id FROM sesiones_diarias WHERE fecha = $1", [fecha]
        )

        if (sesionRes.rows.length > 0) {
            const sesionId = sesionRes.rows[0].id

            await client.query(
                `DELETE FROM gestiones_incidencia 
                 WHERE registro_id IN (SELECT id FROM registros_entrega WHERE sesion_id = $1)`,
                [sesionId]
            )

            await client.query(
                "DELETE FROM registros_entrega WHERE sesion_id = $1",
                [sesionId]
            )

            await client.query(
                "DELETE FROM sesiones_diarias WHERE id = $1",
                [sesionId]
            )
        }

        await client.query("COMMIT")
    } catch (err) {
        await client.query("ROLLBACK")
        throw err
    } finally {
        client.release()
    }
}

export const obtenerOCrearSesionConFecha = async (usuarioId: number, fecha: string): Promise<number> => {
    const existe = await pool.query(
        "SELECT id FROM sesiones_diarias WHERE fecha = $1", [fecha]
    )
    if (existe.rows.length > 0) return existe.rows[0].id

    const nueva = await pool.query(
        "INSERT INTO sesiones_diarias (fecha, usuario_id) VALUES ($1, $2) RETURNING id",
        [fecha, usuarioId]
    )
    return nueva.rows[0].id
}

export const listarGestionesParaExcel = async (fecha: string) => listarGestiones(fecha)
