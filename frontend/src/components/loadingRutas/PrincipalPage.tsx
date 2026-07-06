import { useState, useRef } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { useRutas } from "../../context/RutasContext"
import { useNavigate } from "react-router-dom"
import { faFileExcel, faUpload, faCheckCircle, faTimesCircle, faGear } from "@fortawesome/free-solid-svg-icons"
import { faCircle } from "@fortawesome/free-regular-svg-icons"
import ExcelJS from "exceljs"
import "./PrincipalPage.css"

interface FilaRuta {
    reporte: string
    razonSocial: string
    nroVale: string
    nroPedido: string
    nroGuia: string
    direccion: string
    distrito: string
    valorTotal: string
}

const COLUMNAS = [
    { key: "reporte", label: "Reporte" },
    { key: "razonSocial", label: "Razón Social" },
    { key: "nroVale", label: "Nro Vale" },
    { key: "nroPedido", label: "Nro Pedido" },
    { key: "nroGuia", label: "Nro Guía" },
    { key: "direccion", label: "Dirección" },
    { key: "distrito", label: "Distrito" },
    { key: "valorTotal", label: "Valor Total" },
]

const PrincipalPage = () => {
    const { filas, setFilas, confirmarRutas } = useRutas()
    const navigate = useNavigate()
    const [nombreArchivo, setNombreArchivo] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Helper para formatear moneda PEN
    const formatearPEN = (valor: string): string => {
        const num = parseFloat(valor.replace(/,/g, ""))
        if (isNaN(num)) return valor
        return num.toLocaleString("es-PE", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 3,
        })
    }

    // Helper para detectar si es fila de total
    const esTotalRow = (fila: FilaRuta): boolean =>
        fila.reporte.toLowerCase().includes("total")

    const procesarExcel = async (file: File) => {
        setError(null)
        try {
            const buffer = await file.arrayBuffer()
            const workbook = new ExcelJS.Workbook()
            await workbook.xlsx.load(buffer)

            const worksheet = workbook.worksheets[0]

            // Buscar fila de encabezados (contiene "CHOFER")
            let headerRowNum = -1
            worksheet.eachRow((row, rowNum) => {
                if (headerRowNum !== -1) return
                const values = row.values as any[]
                const tieneChofer = values.some(
                    v => String(v ?? "").toUpperCase().includes("CHOFER")
                )
                if (tieneChofer) headerRowNum = rowNum
            })

            if (headerRowNum === -1) {
                setError("No se encontró la fila de encabezados (CHOFER). Verifica el formato del Excel.")
                return
            }

            const mapped: FilaRuta[] = []

            worksheet.eachRow((row, rowNum) => {
                if (rowNum <= headerRowNum) return
                const v = row.values as any[]  // índice 1-based en exceljs

                // Saltar filas completamente vacías
                const tieneData = v.slice(1).some(c => c != null && c !== "")
                if (!tieneData) return

                mapped.push({
                    reporte: String(v[1] ?? ""),
                    razonSocial: String(v[4] ?? ""),
                    nroVale: String(v[5] ?? ""),
                    nroPedido: String(v[6] ?? ""),
                    nroGuia: String(v[7] ?? ""),
                    direccion: String(v[8] ?? ""),
                    distrito: String(v[9] ?? ""),
                    valorTotal: String(v[11] ?? ""),
                })
            })

            setFilas(mapped)
            setNombreArchivo(file.name)

        } catch {
            setError("Error al leer el archivo. Asegúrate de que sea un Excel válido (.xlsx).")
        }
    }

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) await procesarExcel(file)
        e.target.value = ""
    }

    const limpiar = () => {
        setFilas([])
        setNombreArchivo(null)
        setError(null)
    }

    const [revisadas, setRevisadas] = useState<Set<number>>(new Set())

    const toggleRevisada = (i: number) => {
        setRevisadas(prev => {
            const next = new Set(prev)
            next.has(i) ? next.delete(i) : next.add(i)
            return next
        })
    }

    return (
        <div className="content">
            <h1>Cargar Rutas</h1>
            {/* Card de carga */}
            <div className="content-card">
                <div className="content-excel">
                    <FontAwesomeIcon icon={faFileExcel} className="excel-icon" />
                    <div className="content-title">
                        <h2>Cargar Programación de Rutas</h2>
                        <h3>Sube el archivo Excel con la programación del día</h3>
                    </div>
                </div>

                <div className="content-buttons">
                    {/* Input oculto */}
                    <input
                        ref={inputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        style={{ display: "none" }}
                        onChange={handleFileChange}
                    />
                    <button className="btn-excel" onClick={() => inputRef.current?.click()}>
                        <FontAwesomeIcon icon={faUpload} />
                        Seleccionar Archivo Excel
                    </button>
                    {filas.length > 0 && (
                        <button className="btn-limpiar" onClick={limpiar}>
                            <FontAwesomeIcon icon={faTimesCircle} />
                            Limpiar
                        </button>
                    )}
                </div>

                {/* Estado del archivo cargado */}
                {nombreArchivo && !error && (
                    <p className="archivo-ok">
                        <FontAwesomeIcon icon={faCheckCircle} /> Archivo cargado: {nombreArchivo}
                    </p>
                )}
                {error && (
                    <p className="archivo-error">
                        <FontAwesomeIcon icon={faTimesCircle} /> {error}
                    </p>
                )}
            </div>

            {/* Tabla */}
            {filas.length > 0 && (
                <div className="content-table-wrap">
                    <p className="total-pedidos">Totalidad de Pedidos: <strong>{filas.length}</strong></p>
                    <div className="table-scroll">
                        <table className="ruta-table">
                            <thead>
                                <tr>
                                    <th className="th-check"></th>   {/* ← celda vacía para el ícono */}
                                    <th>#</th>
                                    {COLUMNAS.map(c => <th key={c.key}>{c.label}</th>)}
                                </tr>
                            </thead>
                            <tbody>
                                {filas.map((fila, i) => {
                                    const esTotal = esTotalRow(fila)
                                    // Número de orden: solo cuenta filas que no son total
                                    const orden = filas.slice(0, i).filter(f => !esTotalRow(f)).length + 1

                                    return (
                                        <tr
                                            key={i}
                                            className={`fila-ruta ${revisadas.has(i) ? "fila-revisada" : ""} ${esTotal ? "fila-total" : ""}`}
                                        >
                                            {/* Celda check — deshabilitada en fila total */}
                                            <td className="td-check">
                                                {!esTotal && (
                                                    <button
                                                        className={`btn-check ${revisadas.has(i) ? "checked" : ""}`}
                                                        onClick={() => toggleRevisada(i)}
                                                        title={revisadas.has(i) ? "Desmarcar fila" : "Marcar como revisada"}
                                                    >
                                                        <FontAwesomeIcon icon={revisadas.has(i) ? faCheckCircle : faCircle} />
                                                    </button>
                                                )}
                                            </td>

                                            {/* Nro de orden — vacío en fila total */}
                                            <td>{!esTotal ? orden : ""}</td>

                                            {COLUMNAS.map(c => {
                                                const valor = (fila as any)[c.key]
                                                const vacio = valor === "" || valor === "undefined" || valor == null

                                                return (
                                                    <td key={c.key}>
                                                        {vacio
                                                            ? <span className="celda-vacia">sin datos</span>
                                                            : c.key === "valorTotal"
                                                                ? formatearPEN(valor)
                                                                : valor
                                                        }
                                                    </td>
                                                )
                                            })}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    {/* ← BOTÓN NUEVO al final */}
                    <div className="confirmar-rutas-wrap">
                        <button
                            className="btn-confirmar"
                            onClick={() => {
                                confirmarRutas()
                                navigate("/gestion/configurar")
                            }}
                        >
                            <FontAwesomeIcon icon={faGear} />
                            Confirmar Rutas
                        </button>
                    </div>
                </div>
            )}
        </div >
    )
}

export default PrincipalPage