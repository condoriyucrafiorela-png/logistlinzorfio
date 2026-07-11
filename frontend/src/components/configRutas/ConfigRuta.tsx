import { useState, useEffect, useRef } from "react"
import { useNavigate } from "react-router-dom"
import { API_URL, fetchConAuth } from "../../config/api"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faUser, faUsers, faTruck, faFloppyDisk, faCircleCheck } from "@fortawesome/free-solid-svg-icons"
import { useRutas } from "../../context/RutasContext"
import "./ConfigRuta.css"
interface Persona {
    id: number
    nombre: string
    apellido: string
    dni: string
    telefono: string
}

const ConfigRuta = () => {

    const { filasConfirmadas, configs, setConfigs } = useRutas()
    const navigate = useNavigate()

    const reportes = [...new Set(
        filasConfirmadas
            .filter(f => !f.reporte.toLowerCase().includes("total") && f.reporte.trim() !== "")
            .map(f => f.reporte)
    )]

    const [reporteSeleccionado, setReporteSeleccionado] = useState("")
    const [conductor, setConductor] = useState("")
    const [auxiliar, setAuxiliar] = useState("")
    const [placa, setPlaca] = useState("")

    // ── Autocompletado ──
    const [personal, setPersonal] = useState<Persona[]>([])
    const [sugerenciasConductor, setSugerenciasConductor] = useState<string[]>([])
    const [sugerenciasAuxiliar, setSugerenciasAuxiliar] = useState<string[]>([])
    const [mostrarSugConductor, setMostrarSugConductor] = useState(false)
    const [mostrarSugAuxiliar, setMostrarSugAuxiliar] = useState(false)

    const conductorRef = useRef<HTMLDivElement>(null)
    const auxiliarRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const fetchPersonal = async () => {
            try {
                // Cambiado a fetchConAuth y removida la lectura manual del token
                const res = await fetchConAuth(`${API_URL}/api/personal`)
                const data = await res.json()
                setPersonal(data.personal)
            } catch {
                console.error("Error al cargar personal")
            }
        }
        fetchPersonal()
    }, [])

    // Cierra dropdowns al hacer click afuera
    useEffect(() => {
        const handleClickFuera = (e: MouseEvent) => {
            if (conductorRef.current && !conductorRef.current.contains(e.target as Node)) {
                setMostrarSugConductor(false)
            }
            if (auxiliarRef.current && !auxiliarRef.current.contains(e.target as Node)) {
                setMostrarSugAuxiliar(false)
            }
        }
        document.addEventListener("mousedown", handleClickFuera)
        return () => document.removeEventListener("mousedown", handleClickFuera)
    }, [])

    // Genera combinaciones nombre/apellido para buscar
    const obtenerCoincidencias = (texto: string): string[] => {
        if (!texto.trim()) return []
        const t = texto.toLowerCase().trim()

        const combinaciones = new Set<string>()
        personal.forEach(p => {
            const completo = `${p.nombre} ${p.apellido}`
            if (completo.toLowerCase().includes(t)) combinaciones.add(completo)
        })
        return [...combinaciones].slice(0, 6)
    }

    const handleConductorChange = (valor: string) => {
        setConductor(valor)
        setSugerenciasConductor(obtenerCoincidencias(valor))
        setMostrarSugConductor(true)
    }

    const handleAuxiliarChange = (valor: string) => {
        setAuxiliar(valor)
        setSugerenciasAuxiliar(obtenerCoincidencias(valor))
        setMostrarSugAuxiliar(true)
    }

    const seleccionarConductor = (nombre: string) => {
        setConductor(nombre)
        setMostrarSugConductor(false)
    }

    const seleccionarAuxiliar = (nombre: string) => {
        setAuxiliar(nombre)
        setMostrarSugAuxiliar(false)
    }

    // ── Resto de la lógica original ──
    const handleSelectReporte = (valor: string) => {
        setReporteSeleccionado(valor)
        if (configs[valor]) {
            setConductor(configs[valor].conductor)
            setAuxiliar(configs[valor].auxiliar)
            setPlaca(configs[valor].placa)
        } else {
            setConductor("")
            setAuxiliar("")
            setPlaca("")
        }
    }

    const handleGuardar = () => {
        if (!reporteSeleccionado) return
        setConfigs({
            ...configs,
            [reporteSeleccionado]: { conductor, auxiliar, placa }
        })
        setReporteSeleccionado("")
        setConductor("")
        setAuxiliar("")
        setPlaca("")
    }

    const totalConfigurados = Object.keys(configs).length

    const formatearPlaca = (valor: string): string => {
        const limpio = valor.replace(/-/g, "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase()
        if (limpio.length <= 3) return limpio
        return limpio.slice(0, 3) + "-" + limpio.slice(3, 6)
    }

    const todosConfigurados = reportes.length > 0 && totalConfigurados === reportes.length

    return (
        <div className="content">
            <h1>Configurar Rutas</h1>

            <div className="config-layout">
                {/* Panel izquierdo — formulario */}
                <div className="config-form-card">
                    <h2>Asignar Personal y Unidad</h2>

                    <div className="form-group">
                        <label>Seleccionar Reporte</label>
                        <select
                            value={reporteSeleccionado}
                            onChange={e => handleSelectReporte(e.target.value)}
                            className={reporteSeleccionado ? "select-activo" : ""}
                        >
                            <option value="">-- Seleccione un reporte --</option>
                            {reportes.map(r => (
                                <option key={r} value={r}>
                                    {r} {configs[r] ? "✓" : ""}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Conductor con autocompletado */}
                    <div className="form-group" ref={conductorRef}>
                        <label>
                            <FontAwesomeIcon icon={faUser} /> Conductor
                        </label>
                        <div className="autocomplete-wrap">
                            <input
                                type="text"
                                placeholder="Nombre del conductor"
                                value={conductor}
                                onChange={e => handleConductorChange(e.target.value)}
                                onFocus={() => setMostrarSugConductor(true)}
                                autoComplete="off"
                            />
                            {mostrarSugConductor && sugerenciasConductor.length > 0 && (
                                <ul className="autocomplete-list">
                                    {sugerenciasConductor.map(s => (
                                        <li key={s} onClick={() => seleccionarConductor(s)}>
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Auxiliar con autocompletado */}
                    <div className="form-group" ref={auxiliarRef}>
                        <label>
                            <FontAwesomeIcon icon={faUsers} /> Auxiliar de Apoyo
                        </label>
                        <div className="autocomplete-wrap">
                            <input
                                type="text"
                                placeholder="Nombre del auxiliar"
                                value={auxiliar}
                                onChange={e => handleAuxiliarChange(e.target.value)}
                                onFocus={() => setMostrarSugAuxiliar(true)}
                                autoComplete="off"
                            />
                            {mostrarSugAuxiliar && sugerenciasAuxiliar.length > 0 && (
                                <ul className="autocomplete-list">
                                    {sugerenciasAuxiliar.map(s => (
                                        <li key={s} onClick={() => seleccionarAuxiliar(s)}>
                                            {s}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    <div className="form-group">
                        <label>
                            <FontAwesomeIcon icon={faTruck} /> Placa de Unidad
                        </label>
                        <input
                            type="text"
                            placeholder="ABC-123"
                            value={placa}
                            maxLength={7}
                            onChange={e => setPlaca(formatearPlaca(e.target.value))}
                        />
                    </div>

                    <button
                        className="btn-guardar"
                        onClick={handleGuardar}
                        disabled={!reporteSeleccionado || !conductor.trim() || !auxiliar.trim() || !placa.trim()}
                    >
                        <FontAwesomeIcon icon={faFloppyDisk} />
                        Guardar Configuración
                    </button>
                </div>

                {/* Panel derecho — reportes configurados */}
                <div className="config-reportes-card">
                    <h2>
                        Reportes Configurados
                        {totalConfigurados > 0 && (
                            <span className="badge-configurados">{totalConfigurados}/{reportes.length}</span>
                        )}
                    </h2>

                    {reportes.length === 0 ? (
                        <p className="config-empty">
                            Carga un Excel en "Cargar Rutas" primero.
                        </p>
                    ) : (
                        <div className="reportes-list">
                            {reportes.map(r => {
                                const cfg = configs[r]
                                return (
                                    <div
                                        key={r}
                                        className={`reporte-card ${cfg ? "configurado" : ""}`}
                                        onClick={() => handleSelectReporte(r)}
                                    >
                                        <div className="reporte-card-header">
                                            <span className="reporte-nombre">Reporte {r}</span>
                                            {cfg && <FontAwesomeIcon icon={faCircleCheck} className="icon-check" />}
                                        </div>
                                        {cfg && (
                                            <div className="reporte-card-datos">
                                                <span><FontAwesomeIcon icon={faUser} /> Conductor: {cfg.conductor}</span>
                                                <span><FontAwesomeIcon icon={faUsers} /> Auxiliar: {cfg.auxiliar || "—"}</span>
                                                <span><FontAwesomeIcon icon={faTruck} /> Placa: {cfg.placa || "—"}</span>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                    {todosConfigurados && (
                        <button
                            className="btn-continuar"
                            onClick={() => navigate("/gestion/entregas")}
                        >
                            Continuar a Mis Entregas
                        </button>
                    )}
                </div>
            </div>
        </div>
    )
}

export default ConfigRuta