import type { Request, Response, NextFunction } from "express"
import jwt from "jsonwebtoken"

export const verificarToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers["authorization"]
    const token = (authHeader && authHeader.split(" ")[1]) || (req.query.token as string)

    if (!token) {
        return res.status(401).json({ mensaje: "Acceso denegado, token requerido" })
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET ?? "secreto_jwt") as { id: number, rol: string, primer_nombre: string, primer_apellido: string }
        ;(req as any).usuario = decoded
        next()
    } catch {
        res.status(403).json({ mensaje: "Token inválido o expirado" })
    }
}