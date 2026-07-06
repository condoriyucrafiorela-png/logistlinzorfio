import pool from "../config/db.js"

export const listarClientes = async () => {
    const clientes = await pool.query("SELECT id, nombre FROM clientes ORDER BY nombre")
    const requerimientos = await pool.query(
        "SELECT id, cliente_id, requerimiento FROM cliente_requerimientos ORDER BY id"
    )

    return clientes.rows.map((c: any) => ({
        ...c,
        requerimientos: requerimientos.rows
            .filter((r: any) => r.cliente_id === c.id)
            .map((r: any) => r.requerimiento)
    }))
}

export const crearCliente = async (nombre: string, requerimientos: string[]) => {
    const client = await pool.connect()
    try {
        await client.query("BEGIN")

        const res = await client.query(
            "INSERT INTO clientes (nombre) VALUES ($1) RETURNING id",
            [nombre]
        )
        const clienteId = res.rows[0].id

        for (const req of requerimientos) {
            if (req.trim()) {
                await client.query(
                    "INSERT INTO cliente_requerimientos (cliente_id, requerimiento) VALUES ($1, $2)",
                    [clienteId, req.trim()]
                )
            }
        }

        await client.query("COMMIT")
        return clienteId
    } catch (err) {
        await client.query("ROLLBACK")
        throw err
    } finally {
        client.release()
    }
}

export const actualizarCliente = async (id: string, nombre: string, requerimientos: string[]) => {
    const client = await pool.connect()
    try {
        await client.query("BEGIN")
        await client.query("UPDATE clientes SET nombre=$1 WHERE id=$2", [nombre, id])
        await client.query("DELETE FROM cliente_requerimientos WHERE cliente_id=$1", [id])
        for (const req of requerimientos) {
            if (req.trim()) {
                await client.query(
                    "INSERT INTO cliente_requerimientos (cliente_id, requerimiento) VALUES ($1, $2)",
                    [id, req.trim()]
                )
            }
        }
        await client.query("COMMIT")
    } catch (err) {
        await client.query("ROLLBACK")
        throw err
    } finally {
        client.release()
    }
}

export const eliminarCliente = async (id: string) => {
    await pool.query("DELETE FROM clientes WHERE id=$1", [id])
}