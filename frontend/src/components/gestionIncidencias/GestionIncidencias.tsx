import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useSearchParams } from "react-router-dom"
import { faCircleExclamation, faPenToSquare, faDownload, faCalendarDays, faChevronDown, faChevronUp } from "@fortawesome/free-solid-svg-icons"
import "./GestionIncidencias.css"

import { API_URL } from "../../config/api"

interface Gestion {
    id: number
    empresa_cliente: string
    nro_vale: string
    nro_pedido: string
    nro_guia: string
    tipo_gestion: string
    descripcion: string
    chofer: string | null
    motivo_rechazo: string | null
    fecha: string
}

interface Pendiente {
    id: number
    nro_guia: string
    nro_pedido: string
    razon_social: string
    reporte: string
    motivo_rechazo: string | null
}

const GestionIncidencias = () => {

    const ahora = new Date()
    const limaTime = new Date(ahora.getTime() + (-5 * 60 - ahora.getTimezoneOffset()) * 60000)
    const hoy = limaTime.toISOString().split("T")[0]

    const [searchParams] = useSearchParams()

    const [fecha, setFecha] = useState(searchParams.get("fecha") ?? hoy)
    const [pendientes, setPendientes] = useState(0)
    const [pendientesData, setPendientesData] = useState<Pendiente[]>([])
    const [gestiones, setGestiones] = useState<Gestion[]>([])
    const [expandido, setExpandido] = useState(false)
    const [cargando, setCargando] = useState(true)
    const [paginaPendientes, setPaginaPendientes] = useState(1)
    const POR_PAGINA = 3

    const totalPaginas = Math.ceil(pendientesData.length / POR_PAGINA)
    const pendientesPagina = pendientesData.slice(
        (paginaPendientes - 1) * POR_PAGINA,
        paginaPendientes * POR_PAGINA
    )
    const navigate = useNavigate()
    const token = localStorage.getItem("token")

    const cargarDatos = async (f: string) => {
    setCargando(true)
    try {
        const [resPend, resList] = await Promise.all([
            fetch(`${API_URL}/api/entregas/gestion/pendientes?fecha=${f}`, {
                headers: { Authorization: `Bearer ${token}` }
            }),
            fetch(`${API_URL}/api/entregas/gestion/listar?fecha=${f}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
        ])

        if (!resPend.ok || !resList.ok) {
            setPendientes(0)
            setPendientesData([])
            setGestiones([])
            return
        }
        
            const dataPend = await resPend.json()
            const dataList = await resList.json()
        
            setPendientes(dataPend.total ?? 0)
            setPaginaPendientes(1)
            setExpandido(false)
        
            setPendientesData(dataPend.pendientes || [])
            setGestiones(dataList.gestiones || [])
        
        } catch (error) {
        console.error("Error al cargar datos de gestión", error)
        
        setPendientesData([])
        setGestiones([])
    } finally {
        setCargando(false)
    }
}

    useEffect(() => { cargarDatos(fecha) }, [fecha])

    useEffect(() => {
        const fechaParam = searchParams.get("fecha")
        if (fechaParam) setFecha(fechaParam)
    }, [searchParams])

    const formatFecha = (f: string) =>
        new Date(f).toLocaleDateString("es-PE", { day: "numeric", month: "numeric", year: "numeric" })

    const handleDescargar = () => {
        window.open(`${API_URL}/api/entregas/gestion/excel?fecha=${fecha}&token=${token}`, "_blank")
    }

    const claseStyle = (clase: string) => {
        switch (clase.toUpperCase()) {
            case "REPROGRAMAR": return "clase-reprogramar"
            case "ANULACIÓN":
            case "ANULACION": return "clase-anulacion"
            case "NOTA DE CRÉDITO (NC)":
            case "NOTA DE CREDITO (NC)": return "clase-nc"
            default: return ""
        }
    }

    return (
        <div className="content">
            <h1>Gestión de Incidencias</h1>

            {/* Filtro fecha */}
            <div className="gi-fecha">
                <FontAwesomeIcon icon={faCalendarDays} className="gi-fecha-icon" />
                <span>Filtrar por Fecha:</span>
                <input
                    type="date"
                    value={fecha}
                    max={hoy}
                    onChange={e => setFecha(e.target.value)}
                />
            </div>

            {/* Pendientes */}
            <div className="gi-card gi-pendientes">
                <div className="gi-header">
                    <div className="gi-header-left">
                        <FontAwesomeIcon icon={faCircleExclamation} className="gi-icon rojo" />
                        <span>Incidencias Pendientes de Gestión</span>
                    </div>
                    <span className={`gi-badge ${pendientes > 0 ? "rojo" : "gris"}`}>{pendientes}</span>
                </div>

                {!cargando && pendientes === 0 && (
                    <p className="gi-empty">No hay incidencias pendientes de gestionar</p>
                )}

                {!cargando && pendientes > 0 && (
                    <>
                        <div className="gi-pendiente-aviso">
                            <p>
                                Tienes <strong>{pendientes}</strong> incidencia{pendientes > 1 ? "s" : ""} sin gestionar.
                            </p>
                            <div className="gi-aviso-acciones">
                                <button className="btn-ir-reportes" onClick={() => navigate("/gestion/reportes")}>
                                    <FontAwesomeIcon icon={faPenToSquare} /> Empezar Edición
                                </button>
                                <button className="btn-expandir" onClick={() => setExpandido(!expandido)}>
                                    <FontAwesomeIcon icon={expandido ? faChevronUp : faChevronDown} />
                                    {expandido ? "Ocultar" : "Ver"} incidencias
                                </button>
                            </div>
                        </div>

                        {expandido && (
                            <>
                                <div className="gi-pendientes-list">
                                    {pendientesPagina.map(p => (
                                        <div key={p.id} className="gi-pendiente-card">
                                            <div className="gi-pendiente-row">
                                                <div className="gi-pendiente-field">
                                                    <span className="gi-pendiente-label">Nº Guía:</span>
                                                    <span className="gi-pendiente-value bold">{p.nro_guia}</span>
                                                </div>
                                                <div className="gi-pendiente-field">
                                                    <span className="gi-pendiente-label">Nº Pedido:</span>
                                                    <span className="gi-pendiente-value bold">{p.nro_pedido}</span>
                                                </div>
                                                <div className="gi-pendiente-field">
                                                    <span className="gi-pendiente-label">Cliente:</span>
                                                    <span className="gi-pendiente-value bold">{p.razon_social}</span>
                                                </div>
                                            </div>
                                            <div className="gi-pendiente-row">
                                                <div className="gi-pendiente-field">
                                                    <span className="gi-pendiente-label">Reporte:</span>
                                                    <span className="gi-pendiente-value bold">{p.reporte}</span>
                                                </div>
                                                <div className="gi-pendiente-field">
                                                    <span className="gi-pendiente-label">Código Incidencia:</span>
                                                    <span className="gi-pendiente-value red bold">{p.motivo_rechazo}</span>
                                                </div>
                                                <div className="gi-pendiente-field">
                                                    <span className="gi-pendiente-label">Estado:</span>
                                                    <span className="gi-pendiente-value red bold">Pendiente de Gestión</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {totalPaginas > 1 && (
                                    <div className="gi-paginacion">
                                        <span className="gi-pag-info">
                                            Mostrando {(paginaPendientes - 1) * POR_PAGINA + 1}–{Math.min(paginaPendientes * POR_PAGINA, pendientesData.length)} de {pendientesData.length}
                                        </span>
                                        <div className="gi-pag-botones">
                                            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map(num => (
                                                <button
                                                    key={num}
                                                    className={`gi-pag-btn ${num === paginaPendientes ? "activo" : ""}`}
                                                    onClick={() => setPaginaPendientes(num)}
                                                >
                                                    {num}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </>
                )}
            </div>

            {/* Gestionadas */}
            <div className="gi-card gi-gestionadas">
                <div className="gi-header">
                    <div className="gi-header-left">
                        <FontAwesomeIcon icon={faPenToSquare} className="gi-icon verde" />
                        <span>Incidencias Gestionadas</span>
                    </div>
                    <div className="gi-header-right">
                        <span className="gi-badge verde">{gestiones?.length || 0}</span>
                        <button className="btn-descargar" onClick={handleDescargar} disabled={gestiones.length === 0}>
                            <FontAwesomeIcon icon={faDownload} /> Descargar Incidencias
                        </button>
                    </div>
                </div>

                {gestiones.length === 0
                    ? <p className="gi-empty">No hay incidencias gestionadas para {formatFecha(fecha)}.</p>
                    : (
                        <div className="gi-table-scroll">
                            <table className="gi-table">
                                <thead>
                                    <tr>
                                        <th>Fecha de Creación</th>
                                        <th>Razón Social</th>
                                        <th>NRO Vale</th>
                                        <th>NRO Pedido</th>
                                        <th>NRO Guías</th>
                                        <th>Clase</th>
                                        <th>Descripción</th>
                                        <th>Chofer</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {gestiones.map(g => (
                                        <tr key={g.id}>
                                            <td>{formatFecha(g.fecha)}</td>
                                            <td>{g.empresa_cliente}</td>
                                            <td>{g.nro_vale}</td>
                                            <td className="bold">{g.nro_pedido}</td>
                                            <td>{g.nro_guia}</td>
                                            <td>
                                                <span className={`gi-clase ${claseStyle(g.tipo_gestion)}`}>
                                                    {g.tipo_gestion.toUpperCase()}
                                                </span>
                                            </td>
                                            <td>{g.descripcion}</td>
                                            <td>{g.motivo_rechazo ?? "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )
                }
            </div>
        </div>
    )
}

export default GestionIncidencias
