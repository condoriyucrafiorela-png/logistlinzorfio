const rawUrl = import.meta.env.VITE_API_URL || "http://localhost:3000"
export const API_URL = rawUrl.replace(/\/+$/, "")

export const fetchConAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
    let token = localStorage.getItem("token")
    
    const headers = new Headers(options.headers || {})
    if (token && !headers.has("Authorization")) {
        headers.set("Authorization", `Bearer ${token}`)
    }
    
    let res = await fetch(url, { ...options, headers })
    
    if (res.status === 403 || res.status === 401) {
        const refreshToken = localStorage.getItem("refreshToken")
        if (!refreshToken) return res 
        
        try {
            const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refreshToken })
            })
            
            if (refreshRes.ok) {
                const data = await refreshRes.json()
                localStorage.setItem("token", data.token)
                localStorage.setItem("refreshToken", data.refreshToken)
                
                headers.set("Authorization", `Bearer ${data.token}`)
                res = await fetch(url, { ...options, headers })
            }
        } catch (err) {
            console.error("Error en la renovación automática de peticiones:", err)
        }
    }
    
    return res
}