import { useRef, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faFilter, faCheck, faTimes, faCamera } from "@fortawesome/free-solid-svg-icons"
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

    const [filtroPlaca, setFiltroPlaca] = useState("todas")
    const [modalConfirmar, setModalConfirmar] = useState<string | null>(null)
    const [modalRechazar, setModalRechazar] = useState<string | null>(null)
    const [motivo, setMotivo] = useState("")
    const [foto, setFoto] = useState<string | null>(null)
    const fotoRef = useRef<HTMLInputElement>(null)

    const claveEntrega = (i: number) => {
    const fila = filas[i]
    if (!fila) return `entrega_${i}`

    const guiaValida = fila.nroGuia && fila.nroGuia.trim().toUpperCase() !== "SIN DATOS"
    const pedidoValido = fila.nroPedido && fila.nroPedido.trim().toUpperCase() !== "SIN DATOS"

    if (guiaValida) return `guia_${fila.nroGuia.trim()}_${i}`
    if (pedidoValido) return `pedido_${fila.nroPedido.trim()}_${i}`

    return `row_${i}`
}

    const placas = [...new Set(filas.map(f => configs[f.reporte]?.placa).filter(Boolean))]

    const filasFiltradas = filtroPlaca === "todas"
        ? filas
        : filas.filter(f => configs[f.reporte]?.placa === filtroPlaca)

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
                    nroGuia: fila.nroGuia,
                    nroPedido: fila.nroPedido,
                    nroVale: fila.nroVale,       
                    razonSocial: fila.razonSocial,
                    reporte: fila.reporte,
                    placa: configs[fila.reporte]?.placa ?? "",
                    estado: estadoFinal,
                    motivoRechazo: rec?.motivo ?? null,
                    fotoRechazo: rec?.foto ?? null,
                    fechaProceso
                })
            })
            const data = await res.json()
            console.log("Respuesta guardarRegistro:", res.status, data)
        } catch (err) {
            console.error("Error guardarRegistroAPI:", err)
        }
    }

    // Verifica si quedan pendientes después de un cambio de estado
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

        // Guardamos los datos de rechazo con foto opcional
        setRechazos(prev => ({ ...prev, [claveActual]: { motivo: motivoFinal, foto: foto ?? "" } }))
        setEstados(prev => ({ ...prev, [claveActual]: "no_despachado" }))

        // Cerramos el modal y limpiamos campos
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
                <div className="filtro-placa">
                    <FontAwesomeIcon icon={faFilter} className="filtro-icon" />
                    <label>Filtrar por Placa:</label>
                    <select value={filtroPlaca} onChange={e => setFiltroPlaca(e.target.value)}>
                        <option value="todas">Todas las placas</option>
                        {placas.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <span className="pedidos-pendientes">
                    Pedidos pendientes: <strong>{pendientes}</strong>
                </span>
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

            {/* ── Modal confirmar ── */}
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

            {/* ── Modal rechazar ── */}
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
