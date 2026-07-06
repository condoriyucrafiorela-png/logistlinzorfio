import { useState, useEffect } from "react"

const useFecha = () => {
    const [fecha, setFecha] = useState("")

    useEffect(() => {
        const actualizar = () => {
            const d = new Date()
            const opts: Intl.DateTimeFormatOptions = {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric"
            }
            setFecha(d.toLocaleDateString("es-PE", opts))
        }

        actualizar()

        const intervalo = setInterval(actualizar, 60000)

        return () => clearInterval(intervalo)
    }, [])

    return fecha
}

export default useFecha