import { useRef, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faFilter, faCheck, faTimes, faCamera, faSearch, faCheckDouble } from "@fortawesome/free-solid-svg-icons"
import { useRutas } from "../../context/RutasContext"
import { useNavigate } from "react-router-dom"
import "./entregasRuta.css"

import { API_URL, fetchConAuth } from "../../config/api"

const EntregasRuta = () => {

    const { filasConfirmadas, configs, estados, setEstados, rechazos, setRechazos, fechaProceso } = useRutas()
    const navigate = useNavigate()

    const filas = filasConfirmadas.filter(
        f => !f.reporte.toLowerCase().includes("total") && f.reporte.trim() !== ""
    )

    // ── Estados para los filtros ──
    const [filtroPlaca, setFiltroPlaca] = useState("todas")
    const [filtroGuia, setFiltroGuia] = useState("")
    const [filtroPedido, setFiltroPedido] = useState("")
    const [filtroVale, setFiltroVale] = useState("")

    // Modales individuales
    const [modalConfirmar, setModalConfirmar] = useState<string | null>(null)
    const [modalRechazar, setModalRechazar] = useState<string | null>(null)

    // ── Nuevo: Modal y estado para la confirmación masiva de pendientes ──
    const [modalBulk, setModalBulk] = useState(false)
    const [cargandoBulk, setCargandoBulk] = useState(false)

    const [motivo, setMotivo] = useState("")
    const [foto, setFoto] = useState<string | null>(null)
    const fotoRef = useRef<HTMLInputElement>(null)

    const claveEntrega = (i: number) => filas[i]?.filaId ?? `row_${i}`

    const placas = [...new Set(filas.map(f => configs[f.reporte]?.placa).filter(Boolean))]

    // ── Lógica de filtrado combinado ──
    const filasFiltradas = filas.filter(f => {
        const cumplePlaca = filtroPlaca === "todas" || configs[f.reporte]?.placa === filtroPlaca
        const cumpleGuia = f.nroGuia.toLowerCase().includes(filtroGuia.toLowerCase().trim())
        const cumplePedido = f.nroPedido.toLowerCase().includes(filtroPedido.toLowerCase().trim())
        const cumpleVale = (f.nroVale ?? "").toLowerCase().includes(filtroVale.toLowerCase().trim())

        return cumplePlaca && cumpleGuia && cumplePedido && cumpleVale
    })

    const pendientes = filas.filter((_, i) => {
        const k = claveEntrega(i)
        return !estados[k] || estados[k] === "pendiente"
    }).length

    // ── Guardar registro individual en backend ──
    const guardarRegistroAPI = async (
        fila: typeof filas[0],
        estadoFinal: "conforme" | "no_despachado",
        rec?: { motivo: string; foto?: string | null }
    ) => {
        try {
            const res = await fetchConAuth(`${API_URL}/api/entregas/registro`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    filaId: fila.filaId,
                    nroGuia: fila.nroGuia,
                    nroPedido: fila.nroPedido,
                    nroVale: fila.nroVale,
                    razonSocial: fila.razonSocial,
                    reporte: fila.reporte,
                    placa: configs[fila.reporte]?.placa ?? "",
                    chofer: configs[fila.reporte]?.conductor ?? "",
                    estado: estadoFinal,
                    motivoRechazo: rec?.motivo ?? null,
                    fotoRechazo: rec?.foto ?? null,
                    fechaProceso
                })
            })
            return res.ok
        } catch (err) {
            console.error("Error guardarRegistroAPI:", err)
            return false
        }
    }

    // ── LÓGICA MASIVA: Confirmar solo los pendientes restantes ──
    const handleConfirmarPendientesMasivo = async () => {
        // 1. Obtenemos ÚNICAMENTE las filas que siguen en estado 'pendiente'
        const pendientesFilas = filas.filter((_, i) => {
            const k = claveEntrega(i)
            return !estados[k] || estados[k] === "pendiente"
        })

        if (pendientesFilas.length === 0) return

        setCargandoBulk(true)

        try {
            const nuevosEstados = { ...estados }

            // 2. Disparamos la actualización en paralelo hacia la base de datos
            const peticiones = pendientesFilas.map(fila => {
                const idx = filas.indexOf(fila)
                const k = claveEntrega(idx)
                nuevosEstados[k] = "entregado"
                return guardarRegistroAPI(fila, "conforme")
            })

            await Promise.all(peticiones)

            // 3. Actualizamos el estado global en React
            setEstados(nuevosEstados)
            setModalBulk(false)

            // 4. Redirigimos a reportes
            navigate(`/gestion/reportes?fecha=${fechaProceso}`)
        } catch (error) {
            console.error("Error al procesar entregas masivas:", error)
            alert("Hubo un inconveniente procesando algunas entregas.")
        } finally {
            setCargandoBulk(false)
        }
    }

    const verificarYNavegar = (clave: string, nuevoEstado: "entregado" | "no_despachado") => {
        const nuevosEstados = { ...estados, [clave]: nuevoEstado }
        const quedanPendientes = filas.some((_, i) => {
            const k = claveEntrega(i)
            return !nuevosEstados[k] || nuevosEstados[k] === "pendiente"
        })
        if (!quedanPendientes) navigate(`/gestion/reportes?fecha=${fechaProceso}`)
    }

    const handleConfirmar = async (clave: string) => {
        const idx = filas.findIndex((_, i) => claveEntrega(i) === clave)
        const fila = filas[idx]

        setEstados(prev => ({ ...prev, [clave]: "entregado" }))
        setModalConfirmar(null)

        await guardarRegistroAPI(fila, "conforme")
        verificarYNavegar(clave, "entregado")
    }

    const handleFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const formData = new FormData()
        formData.append("foto", file)

        try {
            const res = await fetchConAuth(`${API_URL}/api/entregas/subir-foto`, {
                method: "POST",
                body: formData
            })
            const data = await res.json()
            setFoto(data.ruta)
        } catch {
            console.error("Error al subir foto")
        }
    }

    const handleGuardarRechazo = async () => {
        if (!motivo.trim() || !modalRechazar) return

        const claveActual = modalRechazar
        const motivoFinal = motivo.trim() + "TL"
        const idx = filas.findIndex((_, i) => claveEntrega(i) === claveActual)
        const fila = filas[idx]

        setRechazos(prev => ({ ...prev, [claveActual]: { motivo: motivoFinal, foto: foto ?? "" } }))
        setEstados(prev => ({ ...prev, [claveActual]: "no_despachado" }))

        setModalRechazar(null)
        setMotivo("")
        const fotoAEnviar = foto
        setFoto(null)

        if (fila) {
            await guardarRegistroAPI(fila, "no_despachado", { motivo: motivoFinal, foto: fotoAEnviar })
        }
        verificarYNavegar(claveActual, "no_despachado")
    }

    const abrirRechazar = (clave: string) => {
        setModalRechazar(clave)
        setMotivo("")
        setFoto(null)
    }

    return (
        <div className="content">
            <h1>Mis Entregas</h1>

            <div className="entregas-header">
                {/* Contenedor de Filtros */}
                <div className="filtros-busqueda-wrap">
                    <div className="filtro-item">
                        <FontAwesomeIcon icon={faFilter} className="filtro-icon" />
                        <label>Placa:</label>
                        <select value={filtroPlaca} onChange={e => setFiltroPlaca(e.target.value)}>
                            <option value="todas">Todas</option>
                            {placas.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    <div className="filtro-item">
                        <FontAwesomeIcon icon={faSearch} className="filtro-icon" />
                        <input
                            type="text"
                            placeholder="Buscar N° Guía..."
                            value={filtroGuia}
                            onChange={e => setFiltroGuia(e.target.value)}
                        />
                    </div>

                    <div className="filtro-item">
                        <FontAwesomeIcon icon={faSearch} className="filtro-icon" />
                        <input
                            type="text"
                            placeholder="Buscar N° Pedido..."
                            value={filtroPedido}
                            onChange={e => setFiltroPedido(e.target.value)}
                        />
                    </div>

                    <div className="filtro-item">
                        <FontAwesomeIcon icon={faSearch} className="filtro-icon" />
                        <input
                            type="text"
                            placeholder="Buscar N° Vale..."
                            value={filtroVale}
                            onChange={e => setFiltroVale(e.target.value)}
                        />
                    </div>
                </div>

                <div className="entregas-header-derecha">
                    <span className="pedidos-pendientes">
                        Pedidos pendientes: <strong>{pendientes}</strong>
                    </span>

                    {/* ── BOTÓN MASIVO PARA COMPLETAR PENDIENTES ── */}
                    {pendientes > 0 && (
                        <button
                            className="btn-confirmar-todos"
                            onClick={() => setModalBulk(true)}
                            title="Marcar todos los pedidos restantes como Entregados"
                        >
                            <FontAwesomeIcon icon={faCheckDouble} />
                            Entregar Pendientes ({pendientes})
                        </button>
                    )}
                </div>
            </div>

            <div className="entregas-list">
                {filasFiltradas.length === 0 && (
                    <p className="entregas-empty">No hay entregas para mostrar.</p>
                )}
                {filasFiltradas.map((fila) => {
                    const idx = filas.indexOf(fila)
                    const clave = claveEntrega(idx)
                    const estado = estados[clave] ?? "pendiente"
                    const placa = configs[fila.reporte]?.placa ?? "—"

                    return (
                        <div key={clave} className={`entrega-card estado-${estado}`}>
                            <div className="entrega-body">
                                <div className="entrega-row">
                                    <div className="entrega-field">
                                        <span className="field-label">Guía:</span>
                                        <span className="field-value">{fila.nroGuia}</span>
                                    </div>
                                    <div className="entrega-field">
                                        <span className="field-label">Pedido:</span>
                                        <span className="field-value">{fila.nroPedido}</span>
                                    </div>
                                </div>
                                <div className="entrega-field">
                                    <span className="field-label">Cliente:</span>
                                    <span className="field-value bold">{fila.razonSocial}</span>
                                </div>
                                <div className="entrega-field">
                                    <span className="field-label">Dirección:</span>
                                    <span className="field-value">{fila.direccion}</span>
                                </div>
                                <div className="entrega-row">
                                    <div className="entrega-field">
                                        <span className="field-label">Reporte:</span>
                                        <span className="field-value">{fila.reporte}</span>
                                    </div>
                                    <div className="entrega-field">
                                        <span className="field-label">Placa:</span>
                                        <span className="field-value">{placa}</span>
                                    </div>
                                </div>
                                {estado === "no_despachado" && rechazos[clave] && (
                                    <div className="rechazo-tag">
                                        Motivo: <strong>{rechazos[clave].motivo}</strong>
                                    </div>
                                )}
                            </div>

                            <div className="entrega-actions">
                                {estado === "pendiente" && (
                                    <>
                                        <button className="btn-entregar" onClick={() => setModalConfirmar(clave)}>
                                            <FontAwesomeIcon icon={faCheck} />
                                        </button>
                                        <button className="btn-rechazar" onClick={() => abrirRechazar(clave)}>
                                            <FontAwesomeIcon icon={faTimes} />
                                        </button>
                                    </>
                                )}
                                {estado === "entregado" && <span className="badge badge-ok">Entregado</span>}
                                {estado === "no_despachado" && <span className="badge badge-ko">No Despachado</span>}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* ── Modal Confirmación Masiva de Pendientes ── */}
            {modalBulk && (
                <div className="modal-overlay" onClick={() => !cargandoBulk && setModalBulk(false)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <h3 style={{ color: "#1e293b", fontSize: "1.2rem", marginBottom: "12px" }}>
                            ⚠️ Confirmación Masiva
                        </h3>

                        <p style={{ fontSize: "1rem", color: "#334155", lineHeight: "1.5" }}>
                            ¿Estás seguro/a de definir los <strong>{pendientes} pedidos pendientes</strong> como <strong>ENTREGADOS</strong>?
                        </p>

                        <div style={{
                            background: "#f1f5f9",
                            borderLeft: "4px solid #2563eb",
                            padding: "10px 12px",
                            borderRadius: "6px",
                            marginTop: "12px",
                            fontSize: "0.82rem",
                            color: "#475569"
                        }}>
                            💡 <strong>Nota:</strong> Los pedidos que ya marcaste como <em>"NO DESPACHADO"</em> no sufrirán ningún cambio y mantendrán su incidencia guardada.
                        </div>

                        <div className="modal-actions" style={{ marginTop: "20px" }}>
                            <button
                                className="btn-modal-ok"
                                style={{ background: "#2563eb", fontWeight: "600" }}
                                onClick={handleConfirmarPendientesMasivo}
                                disabled={cargandoBulk}
                            >
                                {cargandoBulk ? "Procesando..." : "Sí, marcar como ENTREGADOS"}
                            </button>
                            <button
                                className="btn-modal-cancelar"
                                onClick={() => setModalBulk(false)}
                                disabled={cargandoBulk}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal confirmar individual ── */}
            {modalConfirmar !== null && (
                <div className="modal-overlay" onClick={() => setModalConfirmar(null)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <h3>Confirmar Entrega</h3>
                        <p>¿El pedido fue entregado correctamente?</p>
                        <div className="modal-actions">
                            <button className="btn-modal-ok" onClick={() => handleConfirmar(modalConfirmar)}>
                                Confirmar
                            </button>
                            <button className="btn-modal-cancelar" onClick={() => setModalConfirmar(null)}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal rechazar individual ── */}
            {modalRechazar !== null && (
                <div className="modal-overlay" onClick={() => { setModalRechazar(null); setMotivo(""); setFoto(null) }}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <h3>Pedido No Despachado</h3>
                        <div className="form-group">
                            <label>Motivo (Ej: 01, 02, 03)</label>
                            <input
                                type="text"
                                placeholder="Ingrese el código de motivo"
                                value={motivo}
                                onChange={e => setMotivo(e.target.value)}
                            />
                            <small>Se agregará "TL" automáticamente (Ej: 03TL)</small>
                        </div>
                        <div className="form-group">
                            <label>Fotografía (Opcional)</label>
                            <input
                                ref={fotoRef}
                                type="file"
                                accept="image/*"
                                style={{ display: "none" }}
                                onChange={handleFoto}
                            />
                            <button className="btn-foto" onClick={() => fotoRef.current?.click()}>
                                <FontAwesomeIcon icon={faCamera} /> Tomar/Subir Foto
                            </button>
                            {foto && (
                                <img
                                    src={foto}
                                    className="foto-preview"
                                    alt="preview"
                                />
                            )}
                        </div>
                        <div className="modal-actions">
                            <button
                                type="button"
                                className="btn-modal-guardar"
                                onClick={handleGuardarRechazo}
                                disabled={!motivo.trim()}
                            >
                                Guardar
                            </button>
                            <button type="button" className="btn-modal-cancelar" onClick={() => { setModalRechazar(null); setMotivo(""); setFoto(null) }}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default EntregasRuta