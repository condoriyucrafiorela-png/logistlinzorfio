import { useState, useEffect } from "react"

interface UsuarioToken {
    id: number
    primer_nombre: string
    primer_apellido: string
    rol: string
}

const useUsuario = (): UsuarioToken | null => {
    const [usuario, setUsuario] = useState<UsuarioToken | null>(null)

    useEffect(() => {
        const token = localStorage.getItem("token")
        if (!token) return

        try {
            const payload = token.split(".")[1]
            const decoded = JSON.parse(atob(payload))
            setUsuario(decoded as UsuarioToken)
        } catch {
            setUsuario(null)
        }
    }, [])

    return usuario
}

export default useUsuario