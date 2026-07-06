import { Navigate } from "react-router-dom"

const RutaProtegida = ({ children }: { children: React.ReactNode }) => {
    const token = localStorage.getItem("token")

    if (!token) return <Navigate to="/login" replace />

    // Verificar si el token está expirado (sin llamar al backend)
    try {
        const payload = JSON.parse(atob(token.split(".")[1]))
        const expirado = payload.exp * 1000 < Date.now()
        if (expirado) {
            localStorage.removeItem("token")
            return <Navigate to="/login" replace />
        }
    } catch {
        localStorage.removeItem("token")
        return <Navigate to="/login" replace />
    }

    return <>{children}</>
}

export default RutaProtegida