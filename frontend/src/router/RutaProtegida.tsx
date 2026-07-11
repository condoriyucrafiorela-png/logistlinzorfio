import { Navigate } from "react-router-dom"
import { useState, useEffect } from "react"
import { API_URL } from "../config/api"

const RutaProtegida = ({ children }: { children: React.ReactNode }) => {
    const [verificando, setVerificando] = useState(true)
    const [autorizado, setAutorizado] = useState(false)

    useEffect(() => {
        const verificarSesion = async () => {
            const token = localStorage.getItem("token")
            const refreshToken = localStorage.getItem("refreshToken")

            if (!token) {
                setAutorizado(false)
                setVerificando(false)
                return
            }

            try {
                const payload = JSON.parse(atob(token.split(".")[1]))
                const expirado = payload.exp * 1000 < Date.now()

                if (!expirado) {
                    setAutorizado(true)
                    setVerificando(false)
                    return
                }

                if (!refreshToken) throw new Error("Sin token de renovación")

                const res = await fetch(`${API_URL}/api/auth/refresh`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ refreshToken })
                })

                if (!res.ok) throw new Error("Fallo al renovar sesión")

                const data = await res.json()
                localStorage.setItem("token", data.token)
                localStorage.setItem("refreshToken", data.refreshToken)
                setAutorizado(true)
            } catch {
                localStorage.removeItem("token")
                localStorage.removeItem("refreshToken")
                setAutorizado(false)
            } finally {
                setVerificando(false)
            }
        }

        verificarSesion()
    }, [])

    if (verificando) {
        return (
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh", fontFamily: "sans-serif" }}>
                <h3>Verificando sesión activa...</h3>
            </div>
        )
    }

    if (!autorizado) return <Navigate to="/login" replace />

    return <>{children}</>
}

export default RutaProtegida