import React from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
    faTimes, faChartPie, faTriangleExclamation,
    faTruck, faCheckCircle, faLightbulb
} from "@fortawesome/free-solid-svg-icons"
import "./ModalEfectividad.css"

interface RegistroEntrega {
    id: number
    nro_guia: string
    nro_pedido: string
    razon_social: string
    reporte: string
    placa: string
    chofer: string | null
    estado: "conforme" | "no_despachado"
    motivo_rechazo: string | null
    gestionado: boolean
    tipo_gestion: string | null
}

interface ReporteData {
    fecha: string
    total: number
    conformes: number
    no_despachados: number
    entregas: RegistroEntrega[]
}

interface Props {
    reporte: ReporteData
    onClose: () => void
}

export const ModalEfectividad: React.FC<Props> = ({ reporte, onClose }) => {
    const total = reporte.total || 1
    const conformes = reporte.conformes || 0
    const noDespachados = reporte.no_despachados || 0
    const pctConforme = Math.round((conformes / total) * 100)
    const pctNoDespachado = 100 - pctConforme

    // ── 1. Agrupar Incidencias por Código / Motivo ──
    const conteoMotivos: Record<string, number> = {}
    reporte.entregas
        .filter(e => e.estado === "no_despachado")
        .forEach(e => {
            const motivo = e.motivo_rechazo?.trim() || "Sin Código"
            conteoMotivos[motivo] = (conteoMotivos[motivo] || 0) + 1
        })

    const listaMotivos = Object.entries(conteoMotivos)
        .map(([motivo, cantidad]) => ({ motivo, cantidad }))
        .sort((a, b) => b.cantidad - a.cantidad)

    const mayorIncidencia = listaMotivos.length > 0 ? listaMotivos[0] : null
    const maxCantidadMotivo = mayorIncidencia ? mayorIncidencia.cantidad : 1

    // ── 2. Rendimiento por Placa ──
    const conteoPlacas: Record<string, { total: number; conformes: number; rechazados: number }> = {}
    reporte.entregas.forEach(e => {
        const placa = e.placa?.trim() || "Sin Placa"
        if (!conteoPlacas[placa]) {
            conteoPlacas[placa] = { total: 0, conformes: 0, rechazados: 0 }
        }
        conteoPlacas[placa].total += 1
        if (e.estado === "conforme") conteoPlacas[placa].conformes += 1
        else conteoPlacas[placa].rechazados += 1
    })

    const listaPlacas = Object.entries(conteoPlacas).map(([placa, datos]) => ({
        placa,
        ...datos,
        efectividad: Math.round((datos.conformes / datos.total) * 100)
    })).sort((a, b) => b.rechazados - a.rechazados)

    const peorPlaca = listaPlacas.find(p => p.rechazados > 0)

    // ── 3. Cálculo para gráfico Donut SVG ──
    const radius = 40
    const circumference = 2 * Math.PI * radius
    const strokeDashoffset = circumference - (pctConforme / 100) * circumference

    const formatFecha = (f: string) =>
        new Date(f + "T00:00:00").toLocaleDateString("es-PE", {
            day: "2-digit", month: "2-digit", year: "numeric"
        })

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-efectividad-card" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="modal-efectividad-header">
                    <div>
                        <h2><FontAwesomeIcon icon={faChartPie} /> Dashboard de Efectividad y Analítica</h2>
                        <p>Análisis detallado de entregas del <strong>{formatFecha(reporte.fecha)}</strong></p>
                    </div>
                    <button className="btn-cerrar-modal" onClick={onClose}>
                        <FontAwesomeIcon icon={faTimes} />
                    </button>
                </div>

                {/* KPIs Destacados */}
                <div className="kpi-grid">
                    <div className="kpi-card verde">
                        <span className="kpi-label"><FontAwesomeIcon icon={faCheckCircle} /> Efectividad Global</span>
                        <span className="kpi-value">{pctConforme}%</span>
                        <span className="kpi-subtext">{conformes} de {total} pedidos entregados</span>
                    </div>

                    <div className="kpi-card rojo">
                        <span className="kpi-label"><FontAwesomeIcon icon={faTriangleExclamation} /> Mayor Incidencia</span>
                        <span className="kpi-value-sm">{mayorIncidencia ? mayorIncidencia.motivo : "Ninguna"}</span>
                        <span className="kpi-subtext">
                            {mayorIncidencia ? `${mayorIncidencia.cantidad} pedido(s) afectado(s)` : "100% de entregas conformes"}
                        </span>
                    </div>

                    <div className="kpi-card naranja">
                        <span className="kpi-label"><FontAwesomeIcon icon={faTruck} /> Unidad con Más Rechazos</span>
                        <span className="kpi-value-sm">{peorPlaca ? peorPlaca.placa : "Todas Conformes"}</span>
                        <span className="kpi-subtext">
                            {peorPlaca ? `${peorPlaca.rechazados} no despachado(s) (${peorPlaca.efectividad}% efectividad)` : "Sin incidencias registradas"}
                        </span>
                    </div>
                </div>

                {/* Cuerpo de Gráficos */}
                <div className="graficos-grid">
                    {/* Gráfico Donut - Distribución General */}
                    <div className="grafico-card">
                        <h3>Distribución de Despachos</h3>
                        <div className="donut-wrapper">
                            <svg className="donut-chart" viewBox="0 0 100 100">
                                <circle
                                    cx="50" cy="50" r={radius}
                                    className="donut-bg"
                                />
                                <circle
                                    cx="50" cy="50" r={radius}
                                    className="donut-segment"
                                    strokeDasharray={circumference}
                                    strokeDashoffset={strokeDashoffset}
                                />
                            </svg>
                            <div className="donut-text">
                                <span className="donut-pct">{pctConforme}%</span>
                                <span className="donut-lbl">Conforme</span>
                            </div>
                        </div>
                        <div className="donut-leyenda">
                            <div className="leyenda-item">
                                <span className="dot verde"></span>
                                <span>Conformes ({conformes})</span>
                            </div>
                            <div className="leyenda-item">
                                <span className="dot rojo"></span>
                                <span>No Despachados ({noDespachados})</span>
                            </div>
                        </div>
                    </div>

                    {/* Gráfico de Barras - Motivos de Incidencia */}
                    <div className="grafico-card">
                        <h3>Ranking de Incidencias / Rechazos</h3>
                        {listaMotivos.length === 0 ? (
                            <p className="sin-incidencias-text">¡Excelente! No se registraron incidencias en esta fecha.</p>
                        ) : (
                            <div className="barras-list">
                                {listaMotivos.map((m, idx) => {
                                    const pctBarra = Math.round((m.cantidad / maxCantidadMotivo) * 100)
                                    return (
                                        <div key={idx} className="barra-item">
                                            <div className="barra-info">
                                                <span className="barra-label">{m.motivo}</span>
                                                <span className="barra-count">{m.cantidad} pedido(s)</span>
                                            </div>
                                            <div className="barra-track">
                                                <div
                                                    className="barra-fill rojo"
                                                    style={{ width: `${pctBarra}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Gráfico de Rendimiento por Placa */}
                <div className="grafico-card-full">
                    <h3>Efectividad por Placa de Unidad</h3>
                    <div className="placas-barras-grid">
                        {listaPlacas.map(p => (
                            <div key={p.placa} className="placa-barra-card">
                                <div className="placa-header">
                                    <span className="placa-nombre"><FontAwesomeIcon icon={faTruck} /> {p.placa}</span>
                                    <span className={`placa-pct ${p.efectividad >= 90 ? "text-verde" : "text-rojo"}`}>
                                        {p.efectividad}%
                                    </span>
                                </div>
                                <div className="barra-track">
                                    <div
                                        className={`barra-fill ${p.efectividad >= 90 ? "verde" : "naranja"}`}
                                        style={{ width: `${p.efectividad}%` }}
                                    ></div>
                                </div>
                                <div className="placa-sub">
                                    <span>✔ {p.conformes} OK</span>
                                    <span>✖ {p.rechazados} Fallidos</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recomendación Gerencial */}
                <div className="diagnostico-card">
                    <FontAwesomeIcon icon={faLightbulb} className="diag-icon" />
                    <div>
                        <h4>Diagnóstico para Toma de Decisiones</h4>
                        <p>
                            {mayorIncidencia
                                ? `La causa principal de baja efectividad hoy es "${mayorIncidencia.motivo}". Se recomienda revisar la coordinación previa con el cliente o las rutas de los chóferes en unidades con menor porcentaje.`
                                : "El nivel de servicio del día cumplió con las metas operativas óptimas (100% de efectividad)."}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}