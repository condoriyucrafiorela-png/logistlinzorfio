import pool from "../config/db.js"

export const listarPersonal = async () => {
    const r = await pool.query(
        "SELECT id, nombre, apellido, dni FROM personal ORDER BY apellido, nombre"
    )
    return r.rows
}

export const crearPersonal = async (nombre: string, apellido: string, dni: string) => {
    const r = await pool.query(
        "INSERT INTO personal (nombre, apellido, dni) VALUES ($1, $2, $3) RETURNING id, nombre, apellido, dni",
        [nombre, apellido, dni]
    )
    return r.rows[0]
}

export const actualizarPersonal = async (id: string, nombre: string, apellido: string, dni: string) => {
    const r = await pool.query(
        "UPDATE personal SET nombre=$1, apellido=$2, dni=$3 WHERE id=$4 RETURNING id, nombre, apellido, dni",
        [nombre, apellido, dni, id]
    )
    return r.rows[0]
}

export const eliminarPersonal = async (id: string) => {
    await pool.query("DELETE FROM personal WHERE id=$1", [id])
}