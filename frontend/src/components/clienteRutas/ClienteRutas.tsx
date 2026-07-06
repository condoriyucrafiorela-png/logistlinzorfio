import { useState, useEffect } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import {
    faBuilding, faUsersLine, faChevronDown, faChevronUp,
    faPlus, faXmark, faFloppyDisk, faPencil, faTrash
} from "@fortawesome/free-solid-svg-icons"
import "./ClienteRutas.css"
import { API_URL } from "../../config/api"

interface Cliente {
    id: number
    nombre: string
    requerimientos: string[]
}

const ClienteRutas = () => {
    const [clientes, setClientes] = useState<Cliente[]>([])
    const [cargando, setCargando] = useState(true)
    const [busqueda, setBusqueda] = useState("")
    const [expandidos, setExpandidos] = useState<Set<number>>(new Set())

    // Modal añadir/editar
    const [modalAbierto, setModalAbierto] = useState(false)
    const [editando, setEditando] = useState<Cliente | null>(null)
    const [nombreNuevo, setNombreNuevo] = useState("")
    const [requerimientosNuevo, setRequerimientosNuevo] = useState<string[]>([""])
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Modal eliminar
    const [clienteEliminar, setClienteEliminar] = useState<Cliente | null>(null)
    const [eliminando, setEliminando] = useState(false)

    const token = localStorage.getItem("token")

    const cargarClientes = async () => {
        setCargando(true)
        try {
            const res = await fetch(`${API_URL}/api/clientes`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            setClientes(data.clientes)
        } catch {
            console.error("Error al cargar clientes")
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => { cargarClientes() }, [])

    const filtrado = clientes.filter(c =>
        c.nombre.toLowerCase().includes(busqueda.toLowerCase())
    )

    const toggleExpandido = (id: number) => {
        setExpandidos(prev => {
            const next = new Set(prev)
            next.has(id) ? next.delete(id) : next.add(id)
            return next
        })
    }

    // ── Modal añadir/editar ──
    const abrirModalNuevo = () => {
        setEditando(null)
        setNombreNuevo("")
        setRequerimientosNuevo([""])
        setError(null)
        setModalAbierto(true)
    }

    const abrirModalEditar = (c: Cliente) => {
        setEditando(c)
        setNombreNuevo(c.nombre)
        setRequerimientosNuevo(c.requerimientos.length > 0 ? [...c.requerimientos] : [""])
        setError(null)
        setModalAbierto(true)
    }

    const cerrarModal = () => setModalAbierto(false)

    const handleRequerimientoChange = (idx: number, valor: string) => {
        setRequerimientosNuevo(prev => prev.map((r, i) => i === idx ? valor : r))
    }

    const agregarRequerimiento = () => {
        setRequerimientosNuevo(prev => [...prev, ""])
    }

    const eliminarRequerimiento = (idx: number) => {
        setRequerimientosNuevo(prev => prev.filter((_, i) => i !== idx))
    }

    const handleGuardar = async () => {
        if (!nombreNuevo.trim()) return
        setGuardando(true)
        setError(null)
        try {
            const url = editando
                ? `${API_URL}/api/clientes/${editando.id}`
                : `${API_URL}/api/clientes`
            const method = editando ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    nombre: nombreNuevo,
                    requerimientos: requerimientosNuevo.filter(r => r.trim() !== "")
                })
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.mensaje)
                return
            }
            cerrarModal()
            cargarClientes()
        } catch {
            setError("Error al conectar con el servidor.")
        } finally {
            setGuardando(false)
        }
    }

    // ── Modal eliminar ──
    const handleEliminar = async () => {
        if (!clienteEliminar) return
        setEliminando(true)
        try {
            await fetch(`${API_URL}/api/clientes/${clienteEliminar.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            })
            setClienteEliminar(null)
            cargarClientes()
        } catch {
            console.error("Error al eliminar cliente")
        } finally {
            setEliminando(false)
        }
    }

    return (
        <div className="content">
            <h1>Información del Cliente</h1>

            <div className="cliente-toolbar">
                <input
                    type="text"
                    placeholder="Buscar empresa o cliente..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    className="cliente-buscar"
                />
                <div className="cliente-toolbar-right">
                    <span className="cliente-total">
                        <FontAwesomeIcon icon={faUsersLine} /> Total: <strong>{clientes.length}</strong>
                    </span>
                    <button className="btn-add-cliente" onClick={abrirModalNuevo} title="Añadir cliente">
                        <FontAwesomeIcon icon={faPlus} />
                    </button>
                </div>
            </div>

            {cargando && <p className="cliente-estado">Cargando clientes...</p>}

            {!cargando && filtrado.length === 0 && (
                <p className="cliente-estado">No se encontró ningún cliente con ese criterio.</p>
            )}

            <div className="cliente-grid">
                {filtrado.map(c => {
                    const abierto = expandidos.has(c.id)
                    return (
                        <div key={c.id} className="cliente-card">
                            <div className="cliente-card-header">
                                <div className="cliente-avatar">
                                    <FontAwesomeIcon icon={faBuilding} />
                                </div>
                                <h3>{c.nombre}</h3>
                                <div className="card-actions">
                                    <button className="btn-icon-card editar" title="Editar" onClick={() => abrirModalEditar(c)}>
                                        <FontAwesomeIcon icon={faPencil} />
                                    </button>
                                    <button className="btn-icon-card eliminar" title="Eliminar" onClick={() => setClienteEliminar(c)}>
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </div>
                            </div>

                            <button className="btn-ver-requerimientos" onClick={() => toggleExpandido(c.id)}>
                                <span>Ver Requerimientos</span>
                                <FontAwesomeIcon icon={abierto ? faChevronUp : faChevronDown} />
                            </button>

                            {abierto && (
                                <ul className="cliente-requerimientos-list">
                                    {c.requerimientos.length === 0
                                        ? <li className="cliente-req-empty">Sin requerimientos registrados.</li>
                                        : c.requerimientos.map((r, i) => <li key={i}>{r}</li>)
                                    }
                                </ul>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* ── Modal: Añadir/Editar Cliente ── */}
            {modalAbierto && (
                <div className="modal-overlay" onClick={cerrarModal}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <h3>{editando ? "Editar Cliente" : "Añadir Cliente"}</h3>

                        <div className="form-group">
                            <label>Nombre de la Empresa o Cliente:</label>
                            <input
                                type="text"
                                placeholder="Ej: Constructora Cumbres S.A.C."
                                value={nombreNuevo}
                                onChange={e => setNombreNuevo(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label>Requerimientos:</label>
                            <div className="requerimientos-edit-list">
                                {requerimientosNuevo.map((r, idx) => (
                                    <div key={idx} className="requerimiento-input-row">
                                        <input
                                            type="text"
                                            placeholder={`Requerimiento ${idx + 1}`}
                                            value={r}
                                            onChange={e => handleRequerimientoChange(idx, e.target.value)}
                                        />
                                        {requerimientosNuevo.length > 1 && (
                                            <button
                                                className="btn-eliminar-req"
                                                onClick={() => eliminarRequerimiento(idx)}
                                                title="Eliminar"
                                            >
                                                <FontAwesomeIcon icon={faXmark} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <button className="btn-add-requerimiento" onClick={agregarRequerimiento}>
                                <FontAwesomeIcon icon={faPlus} /> Añadir requerimiento
                            </button>
                        </div>

                        {error && <p className="cliente-error">{error}</p>}

                        <div className="modal-actions">
                            <button
                                className="btn-modal-guardar"
                                onClick={handleGuardar}
                                disabled={!nombreNuevo.trim() || guardando}
                            >
                                <FontAwesomeIcon icon={faFloppyDisk} />
                                {guardando ? "Guardando..." : editando ? "Guardar Cambios" : "Guardar Cliente"}
                            </button>
                            <button className="btn-modal-cancelar" onClick={cerrarModal}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Confirmar eliminación ── */}
            {clienteEliminar && (
                <div className="modal-overlay" onClick={() => setClienteEliminar(null)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <h3>Eliminar Cliente</h3>
                        <p className="modal-confirm-text">
                            ¿Seguro que deseas eliminar a <strong>{clienteEliminar.nombre}</strong>?
                            Se eliminarán también sus requerimientos. Esta acción no se puede deshacer.
                        </p>
                        <div className="modal-actions">
                            <button className="btn-modal-eliminar" onClick={handleEliminar} disabled={eliminando}>
                                {eliminando ? "Eliminando..." : "Sí, eliminar"}
                            </button>
                            <button className="btn-modal-cancelar" onClick={() => setClienteEliminar(null)}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default ClienteRutas