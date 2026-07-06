import "dotenv/config"
import bcrypt from "bcryptjs"
import pool from "../config/db.js"

const crearUsuario = async () => {
    // ← EDITA ESTOS DATOS ANTES DE EJECUTAR
    const datos = {
        primer_nombre: "Nombre",
        segundo_nombre: null,
        primer_apellido: "Apellido",
        segundo_apellido: null,
        correo: "correo@gmail.com",
        password: "ContraseñaFuerte@2026",
        rol: "logistica"
    }

    const hash = await bcrypt.hash(datos.password, 10)

    await pool.query(
        `INSERT INTO usuarios
         (primer_nombre, segundo_nombre, primer_apellido, segundo_apellido, correo, password, rol)
         VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [datos.primer_nombre, datos.segundo_nombre, datos.primer_apellido,
        datos.segundo_apellido, datos.correo, hash, datos.rol]
    )

    console.log(`✅ Usuario ${datos.correo} creado correctamente.`)
    await pool.end()
}

crearUsuario().catch(console.error)