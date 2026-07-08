import { createContext, useContext, useState } from "react"

export interface FilaRuta {
    reporte: string; razonSocial: string; nroVale: string
    nroPedido: string; nroGuia: string; direccion: string
    distrito: string; valorTotal: string
}

export interface Configuracion {
    conductor: string; auxiliar: string; placa: string
}

export type EstadoEntrega = "pendiente" | "entregado" | "no_despachado"

export interface RechazoData { motivo: string; foto: string }

interface RutasContextType {
    filas: FilaRuta[]
    setFilas: (f: FilaRuta[]) => void
    filasConfirmadas: FilaRuta[]
    confirmarRutas: () => void
    configs: Record<string, Configuracion>
    setConfigs: (c: Record<string, Configuracion>) => void
    estados: Record<string, EstadoEntrega>      // ← nuevo
    setEstados: React.Dispatch<React.SetStateAction<Record<string, EstadoEntrega>>>
    rechazos: Record<string, RechazoData>        // ← nuevo
    setRechazos: React.Dispatch<React.SetStateAction<Record<string, RechazoData>>>
    fechaProceso: string
    setFechaProceso: (f: string) => void
}

const RutasContext = createContext<RutasContextType | null>(null)

export const RutasProvider = ({ children }: { children: React.ReactNode }) => {
    const [filas, setFilas] = useState<FilaRuta[]>([])
    const [filasConfirmadas, setFilasConfirmadas] = useState<FilaRuta[]>([])
    const [configs, setConfigs] = useState<Record<string, Configuracion>>({})
    const [estados, setEstados] = useState<Record<string, EstadoEntrega>>({})
    const [rechazos, setRechazos] = useState<Record<string, RechazoData>>({})

    const confirmarRutas = () => setFilasConfirmadas(filas)

    const ahora = new Date()
    const limaTime = new Date(ahora.getTime() + (-5 * 60 - ahora.getTimezoneOffset()) * 60000)
    const hoyLima = limaTime.toISOString().split("T")[0]

    const [fechaProceso, setFechaProceso] = useState(hoyLima)

    return (
        <RutasContext.Provider value={{
            filas, setFilas,
            filasConfirmadas, confirmarRutas,
            configs, setConfigs,
            estados, setEstados,
            rechazos, setRechazos,
            fechaProceso, setFechaProceso
        }}>
            {children}
        </RutasContext.Provider>
    )
}

export const useRutas = () => {
    const ctx = useContext(RutasContext)
    if (!ctx) throw new Error("useRutas debe usarse dentro de RutasProvider")
    return ctx
}