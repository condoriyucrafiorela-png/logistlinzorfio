import { useState, useEffect } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faCalendarDays, faPencil, faCircleCheck } from "@fortawesome/free-solid-svg-icons"
import "./ReporteRutas.css"
import { useRutas } from "../../context/RutasContext"

import { API_URL } from "../../config/api"

interface RegistroEntrega {
    id: number
    nro_guia: string
    nro_pedido: string
    razon_social: string
    reporte: string
    placa: string
    estado: "conforme" | "no_despachado"
    motivo_rechazo: string | null
    foto_rechazo: string | null
    gestionado: boolean
    tipo_gestion: string | null
    descripcion_gestion: string | null
    chofer_gestion: string | null
}

interface ReporteData {
    fecha: string
    total: number
    conformes: number
    no_despachados: number
    entregas: RegistroEntrega[]
}

interface Persona {
    id: number
    nombre: string
    apellido: string
    dni: string
}

const ReporteRutas = () => {

    const ahora = new Date()
    const limaTime = new Date(ahora.getTime() + (-5 * 60 - ahora.getTimezoneOffset()) * 60000)
    const hoy = limaTime.toISOString().split("T")[0]
    const { configs } = useRutas()

    const [tab, setTab] = useState<"efectividad" | "estados">("efectividad")
    const [fecha, setFecha] = useState(hoy)
    const [reporte, setReporte] = useState<ReporteData | null>(null)
    const [cargando, setCargando] = useState(false)
    const [sinDatos, setSinDatos] = useState(false)
    const [fotosCache, setFotosCache] = useState<Record<number, string>>({})

    // Modal gestionar incidencia
    const [modalGestion, setModalGestion] = useState<RegistroEntrega | null>(null)
    const [tipoGestion, setTipoGestion] = useState("Reprogramar")
    const [descripcionGestion, setDescripcionGestion] = useState("")
    const [guardandoGestion, setGuardandoGestion] = useState(false)
    const [chofer, setChofer] = useState("")
    const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)

    // Modal modificar estado
    const [modalEstado, setModalEstado] = useState<RegistroEntrega | null>(null)
    const [nuevoEstado, setNuevoEstado] = useState("")
    const [guardandoEstado, setGuardandoEstado] = useState(false)

    // Autocompletado chofer
    const [personal, setPersonal] = useState<Persona[]>([])

    const token = localStorage.getItem("token")

    useEffect(() => {
        const fetchPersonal = async () => {
            try {
                const res = await fetch(`${API_URL}/api/personal`, {
                    headers: { Authorization: `Bearer ${token}` }
                })
                const data = await res.json()
                setPersonal(data.personal)
            } catch {
                console.error("Error al cargar personal")
            }
        }
        fetchPersonal()
    }, [])

    const fetchReporte = async (f: string) => {
        setCargando(true)
        setSinDatos(false)
        setReporte(null)
        setFotosCache({})
        try {
            const res = await fetch(`${API_URL}/api/entregas/reporte/${f}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.status === 404) { setSinDatos(true); return }
            const data = await res.json()
            setReporte(data)
        } catch {
            setSinDatos(true)
        } finally {
            setCargando(false)
        }
    }

    const cargarFoto = async (id: number) => {
        if (fotosCache[id]) return
        try {
            const res = await fetch(`${API_URL}/api/entregas/foto/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            setFotosCache(prev => ({ ...prev, [id]: data.foto }))
        } catch {
            console.error("Error al cargar foto", id)
        }
    }

    useEffect(() => { fetchReporte(fecha) }, [fecha])

    const efectividad = reporte
        ? ((reporte.conformes / reporte.total) * 100).toFixed(1)
        : "0.0"

    const incidencias = reporte?.entregas.filter(e => e.estado === "no_despachado") ?? []

    const formatFecha = (f: string) =>
        new Date(f + "T00:00:00").toLocaleDateString("es-PE", {
            day: "2-digit", month: "2-digit", year: "numeric"
        })

    const abrirGestion = (e: RegistroEntrega) => {
        setModalGestion(e)
        setTipoGestion("Reprogramar")
        setDescripcionGestion("")
        const conductorReporte = configs[e.reporte]?.conductor ?? ""
        setChofer(conductorReporte)
        setMostrarConfirmacion(false)
    }

    const cerrarModalGestion = () => {
        setModalGestion(null)
        setMostrarConfirmacion(false)
    }

    // Guarda en backend y actualiza estado local
    const handleGuardarGestion = async () => {
        if (!descripcionGestion.trim() || !modalGestion) return
        setGuardandoGestion(true)
        try {
            await fetch(`${API_URL}/api/entregas/gestion`, {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    registroId: modalGestion.id,
                    empresaCliente: modalGestion.razon_social,
                    nroVale: modalGestion.nro_pedido,
                    tipoGestion,
                    descripcion: descripcionGestion,
                    chofer
                })
            })

            // Actualiza el registro localmente sin recargar
            setReporte(prev => {
                if (!prev) return prev
                return {
                    ...prev,
                    entregas: prev.entregas.map(e =>
                        e.id === modalGestion.id
                            ? {
                                ...e,
                                gestionado: true,
                                tipo_gestion: tipoGestion,
                                descripcion_gestion: descripcionGestion,
                                chofer_gestion: chofer
                            }
                            : e
                    )
                }
            })

            cerrarModalGestion()
        } catch {
            console.error("Error al guardar gestión")
        } finally {
            setGuardandoGestion(false)
        }
    }

    const abrirModalEstado = (e: RegistroEntrega) => {
        setModalEstado(e)
        setNuevoEstado(e.estado)
    }

    const handleGuardarEstado = async () => {
        if (!modalEstado || !nuevoEstado) return
        setGuardandoEstado(true)
        try {
            await fetch(`${API_URL}/api/entregas/registro/${modalEstado.id}/estado`, {
                method: "PUT",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({ estado: nuevoEstado })
            })
            setReporte(prev => {
                if (!prev) return prev
                return {
                    ...prev,
                    entregas: prev.entregas.map(e =>
                        e.id === modalEstado.id
                            ? { ...e, estado: nuevoEstado as "conforme" | "no_despachado" }
                            : e
                    ),
                    conformes: prev.entregas.filter(e =>
                        e.id === modalEstado.id ? nuevoEstado === "conforme" : e.estado === "conforme"
                    ).length,
                    no_despachados: prev.entregas.filter(e =>
                        e.id === modalEstado.id ? nuevoEstado === "no_despachado" : e.estado === "no_despachado"
                    ).length,
                }
            })
            setModalEstado(null)
        } catch {
            console.error("Error al actualizar estado")
        } finally {
            setGuardandoEstado(false)
        }
    }

    return (
        <div className="content">
            <h1>Reportes</h1>

            <div className="report-tabs">
                <button className={`report-tab ${tab === "efectividad" ? "active" : ""}`} onClick={() => setTab("efectividad")}>
                    Efectividad de Entregas
                </button>
                <button className={`report-tab ${tab === "estados" ? "active" : ""}`} onClick={() => setTab("estados")}>
                    Estados de Rutas
                </button>
            </div>

            <div className="report-body">
                <div className="report-fecha">
                    <FontAwesomeIcon icon={faCalendarDays} className="fecha-icon" />
                    <span>Filtrar por Fecha:</span>
                    <input type="date" value={fecha} max={hoy} onChange={e => setFecha(e.target.value)} />
                </div>

                {cargando && <p className="report-estado">Cargando...</p>}
                {sinDatos && !cargando && (
                    <p className="report-estado sin-datos">
                        No hubo datos registrados el {formatFecha(fecha)}.
                    </p>
                )}

                {/* TAB 1: Efectividad */}
                {tab === "efectividad" && reporte && !cargando && (
                    <>
                        <div className="report-cards">
                            <div className="report-card azul">
                                <span className="card-label">Total Procesados</span>
                                <span className="card-value">{reporte.total}</span>
                            </div>
                            <div className="report-card verde">
                                <span className="card-label">Conformes</span>
                                <span className="card-value">{reporte.conformes}</span>
                            </div>
                            <div className="report-card rojo">
                                <span className="card-label">No Despachados</span>
                                <span className="card-value">{reporte.no_despachados}</span>
                            </div>
                            <div className="report-card rosa">
                                <span className="card-label">Efectividad</span>
                                <span className="card-value">{efectividad}%</span>
                            </div>
                        </div>

                        <h3 className="report-section-title">
                            Incidencias (Ordenadas por Programación)
                        </h3>

                        {incidencias.length === 0
                            ? <p className="report-estado">No hay incidencias para esta fecha.</p>
                            : (
                                <div className="incidencias-list">
                                    {incidencias.map(e => (
                                        <div key={e.id} className="incidencia-card">
                                            <div className="inc-row">
                                                <div className="inc-field">
                                                    <span className="inc-label">Nº Guía:</span>
                                                    <span className="inc-value">{e.nro_guia}</span>
                                                </div>
                                                <div className="inc-field">
                                                    <span className="inc-label">Nº Pedido:</span>
                                                    <span className="inc-value">{e.nro_pedido}</span>
                                                </div>
                                                {e.gestionado ? (
                                                    <span className="badge-gestionado">
                                                        <FontAwesomeIcon icon={faCircleCheck} /> Gestionado
                                                    </span>
                                                ) : (
                                                    <button className="btn-editar" title="Gestionar incidencia" onClick={() => abrirGestion(e)}>
                                                        <FontAwesomeIcon icon={faPencil} />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="inc-field">
                                                <span className="inc-label">Cliente:</span>
                                                <span className="inc-value bold">{e.razon_social}</span>
                                            </div>
                                            <div className="inc-row">
                                                <div className="inc-field">
                                                    <span className="inc-label">Código Incidencia:</span>
                                                    <span className="inc-value red">{e.motivo_rechazo}</span>
                                                </div>
                                                <div className="inc-field">
                                                    <span className="inc-label">Motivo:</span>
                                                    <span className="inc-value">
                                                        {e.motivo_rechazo?.replace("TL", "") ?? "—"}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="inc-field">
                                                <span className="inc-label">Evidencia:</span>
                                                {fotosCache[e.id]
                                                    ? <img src={`${API_URL}/${fotosCache[e.id]}`} className="inc-foto" alt="evidencia" />
                                                    : <button className="btn-ver-foto" onClick={() => cargarFoto(e.id)}>Ver foto</button>
                                                }
                                            </div>

                                            {/* ── Datos de la gestión, si ya fue editada ── */}
                                            {e.gestionado && (
                                                <>
                                                    <div className="inc-row">
                                                        <div className="inc-field">
                                                            <span className="inc-label">Gestión:</span>
                                                            <span className="inc-value bold">{e.tipo_gestion}</span>
                                                        </div>
                                                        <div className="inc-field">
                                                            <span className="inc-label">Chofer:</span>
                                                            <span className="inc-value">{e.chofer_gestion || "—"}</span>
                                                        </div>
                                                    </div>
                                                    <div className="inc-field">
                                                        <span className="inc-label">Comentario Gestión:</span>
                                                        <span className="inc-value">{e.descripcion_gestion}</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )
                        }
                    </>
                )}

                {/* TAB 2: Estados */}
                {tab === "estados" && reporte && !cargando && (
                    <>
                        <h3 className="report-section-title">
                            Todos los Pedidos — Modificar Estados
                        </h3>
                        <div className="estados-list">
                            {reporte.entregas.map(e => (
                                <div key={e.id} className="estado-card">
                                    <div className="estado-row">
                                        <div className="inc-field">
                                            <span className="inc-label">Guía:</span>
                                            <span className="inc-value">{e.nro_guia}</span>
                                        </div>
                                        <div className="inc-field">
                                            <span className="inc-label">Pedido:</span>
                                            <span className="inc-value">{e.nro_pedido}</span>
                                        </div>
                                        <div className="inc-field">
                                            <span className="inc-label">Cliente:</span>
                                            <span className="inc-value bold">{e.razon_social}</span>
                                        </div>
                                        <button className="btn-editar azul" title="Modificar estado" onClick={() => abrirModalEstado(e)}>
                                            <FontAwesomeIcon icon={faPencil} />
                                        </button>
                                    </div>
                                    <div className="estado-row">
                                        <div className="inc-field">
                                            <span className="inc-label">Reporte:</span>
                                            <span className="inc-value">{e.reporte}</span>
                                        </div>
                                        <div className="inc-field">
                                            <span className="inc-label">Estado:</span>
                                            <span className={`estado-badge ${e.estado}`}>
                                                {e.estado === "conforme" ? "Conforme" : "No Despachado"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </div>

            {/* ── Modal: Gestionar Incidencia ── */}
            {modalGestion !== null && !mostrarConfirmacion && (
                <div className="modal-overlay" onClick={cerrarModalGestion}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <h3>Gestionar Incidencia</h3>

                        <div className="modal-grid">
                            <div className="form-group">
                                <label>Empresa Cliente:</label>
                                <input
                                    type="text"
                                    value={modalGestion.razon_social}
                                    readOnly
                                    className="input-readonly"
                                />
                            </div>
                            <div className="form-group">
                                <label>N° Vale:</label>
                                <input
                                    type="text"
                                    value={modalGestion.nro_pedido}
                                    readOnly
                                    className="input-readonly"
                                />
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Tipo de Gestión:</label>
                            <select value={tipoGestion} onChange={e => setTipoGestion(e.target.value)}>
                                <option>Reprogramar</option>
                                <option>Anulación</option>
                                <option>Nota de Crédito (NC)</option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>Chofer:</label>
                            <input
                                type="text"
                                value={modalGestion?.motivo_rechazo ?? "—"}
                                readOnly
                                className="input-readonly"
                            />
                        </div>

                        <div className="form-group">
                            <label>Descripción (Obligatorio):</label>
                            <select
                                value={descripcionGestion}
                                onChange={e => setDescripcionGestion(e.target.value)}
                            >
                                <option value="">-- Seleccione el motivo --</option>
                                <option value="Demoras en ruta: El chofer se retrasa con los primeros clientes y no llega a tiempo a los demás.">
                                    1. Demoras en ruta
                                </option>
                                <option value="Falta de coordinación ATC: No gestionan a tiempo las citas ni los correos de autorización para ingresar a planta.">
                                    2. Falta de coordinación ATC
                                </option>
                                <option value="Carga incompleta: Olvidos en el almacén que dejan mercadería en tierra o generan entregas parciales.">
                                    3. Carga incompleta
                                </option>
                                <option value="Error de códigos: El producto físico no coincide con el código de la Orden de Compra y lo rechazan.">
                                    4. Error de códigos
                                </option>
                                <option value="Problemas de caducidad: Rechazo por productos sin fecha de vencimiento o con vencimiento muy corto.">
                                    5. Problemas de caducidad
                                </option>
                                <option value="Errores de facturación: Documentos mal emitidos que obligan a anular el pedido para refacturar.">
                                    6. Errores de facturación
                                </option>
                                <option value="Exceso de volumen: La mercadería asignada no entra físicamente en la unidad de transporte.">
                                    7. Exceso de volumen
                                </option>
                                <option value="Anulación del cliente: El comprador cancela la orden cuando la unidad ya va en camino.">
                                    8. Anulación del cliente
                                </option>
                                <option value="Falta de accesorios: Despachos incompletos por olvidar herramientas o piezas menores del pedido.">
                                    9. Falta de accesorios
                                </option>
                                <option value="Rechazo por normativa: Incumplimiento de protocolos de seguridad o exigencias técnicas en la descarga.">
                                    10. Rechazo por normativa
                                </option>
                            </select>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn-modal-guardar"
                                onClick={() => setMostrarConfirmacion(true)}
                                disabled={!descripcionGestion.trim() || guardandoGestion}
                            >
                                Guardar Gestión
                            </button>
                            <button className="btn-modal-cancelar" onClick={cerrarModalGestion}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Confirmación antes de guardar ── */}
            {modalGestion !== null && mostrarConfirmacion && (
                <div className="modal-overlay" onClick={() => setMostrarConfirmacion(false)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <h3>¿Los datos están correctos?</h3>

                        <div className="confirmacion-resumen">
                            <div className="confirmacion-item">
                                <span className="inc-label">Gestión:</span>
                                <span className="inc-value bold">{tipoGestion}</span>
                            </div>
                            <div className="confirmacion-item">
                                <span className="inc-label">Chofer:</span>
                                <span className="inc-value">{chofer || "—"}</span>
                            </div>
                            <div className="confirmacion-item">
                                <span className="inc-label">Descripción:</span>
                                <span className="inc-value">{descripcionGestion}</span>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn-modal-ok"
                                onClick={handleGuardarGestion}
                                disabled={guardandoGestion}
                            >
                                {guardandoGestion ? "Guardando..." : "Sí, guardar"}
                            </button>
                            <button className="btn-modal-cancelar" onClick={() => setMostrarConfirmacion(false)}>
                                Volver a editar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Modificar Estado ── */}
            {modalEstado !== null && (
                <div className="modal-overlay" onClick={() => setModalEstado(null)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <h3>Modificar Estado del Pedido</h3>

                        <div className="form-group">
                            <label>Nuevo Estado:</label>
                            <select value={nuevoEstado} onChange={e => setNuevoEstado(e.target.value)}>
                                <option value="conforme">Conforme</option>
                                <option value="no_despachado">No Despachado</option>
                            </select>
                        </div>

                        <div className="modal-actions">
                            <button
                                className="btn-modal-ok"
                                onClick={handleGuardarEstado}
                                disabled={guardandoEstado}
                            >
                                {guardandoEstado ? "Guardando..." : "Guardar"}
                            </button>
                            <button className="btn-modal-cancelar" onClick={() => setModalEstado(null)}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ReporteRutas