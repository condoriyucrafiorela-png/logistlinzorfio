import { useState, useEffect } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faIdCard, faUsersLine, faPlus, faFloppyDisk, faPencil, faTrash } from "@fortawesome/free-solid-svg-icons"
import "./PersonalRutas.css"

interface Persona {
    id: number
    nombre: string
    apellido: string
    dni: string
}

const PersonalRutas = () => {
    const [personal, setPersonal] = useState<Persona[]>([])
    const [cargando, setCargando] = useState(true)
    const [busqueda, setBusqueda] = useState("")

    // Modal añadir/editar
    const [modalAbierto, setModalAbierto] = useState(false)
    const [editando, setEditando] = useState<Persona | null>(null)
    const [nombreNuevo, setNombreNuevo] = useState("")
    const [apellidoNuevo, setApellidoNuevo] = useState("")
    const [dniNuevo, setDniNuevo] = useState("")
    const [guardando, setGuardando] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Modal eliminar
    const [personaEliminar, setPersonaEliminar] = useState<Persona | null>(null)
    const [eliminando, setEliminando] = useState(false)

    const token = localStorage.getItem("token")

    const fetchPersonal = async () => {
        try {
            const res = await fetch("http://localhost:3000/api/personal", {
                headers: { Authorization: `Bearer ${token}` }
            })
            const data = await res.json()
            setPersonal(data.personal)
        } catch {
            console.error("Error al cargar personal")
        } finally {
            setCargando(false)
        }
    }

    useEffect(() => { fetchPersonal() }, [])

    const filtrado = personal.filter(p => {
        const texto = `${p.nombre} ${p.apellido} ${p.dni}`.toLowerCase()
        return texto.includes(busqueda.toLowerCase())
    })

    const iniciales = (nombre: string, apellido: string) =>
        `${nombre[0] ?? ""}${apellido[0] ?? ""}`.toUpperCase()

    // ── Modal añadir/editar ──
    const abrirModalNuevo = () => {
        setEditando(null)
        setNombreNuevo("")
        setApellidoNuevo("")
        setDniNuevo("")
        setError(null)
        setModalAbierto(true)
    }

    const abrirModalEditar = (p: Persona) => {
        setEditando(p)
        setNombreNuevo(p.nombre)
        setApellidoNuevo(p.apellido)
        setDniNuevo(p.dni)
        setError(null)
        setModalAbierto(true)
    }

    const cerrarModal = () => setModalAbierto(false)

    const handleDniChange = (valor: string) => {
        const limpio = valor.replace(/\D/g, "").slice(0, 8)
        setDniNuevo(limpio)
    }

    const handleGuardar = async () => {
        if (!nombreNuevo.trim() || !apellidoNuevo.trim() || dniNuevo.length !== 8) return
        setGuardando(true)
        setError(null)
        try {
            const url = editando
                ? `http://localhost:3000/api/personal/${editando.id}`
                : "http://localhost:3000/api/personal"
            const method = editando ? "PUT" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                body: JSON.stringify({
                    nombre: nombreNuevo,
                    apellido: apellidoNuevo,
                    dni: dniNuevo
                })
            })
            const data = await res.json()
            if (!res.ok) {
                setError(data.mensaje)
                return
            }
            cerrarModal()
            fetchPersonal()
        } catch {
            setError("Error al conectar con el servidor.")
        } finally {
            setGuardando(false)
        }
    }

    // ── Modal eliminar ──
    const handleEliminar = async () => {
        if (!personaEliminar) return
        setEliminando(true)
        try {
            await fetch(`http://localhost:3000/api/personal/${personaEliminar.id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${token}` }
            })
            setPersonaEliminar(null)
            fetchPersonal()
        } catch {
            console.error("Error al eliminar personal")
        } finally {
            setEliminando(false)
        }
    }

    return (
        <div className="content">
            <h1>Personal</h1>

            <div className="personal-toolbar">
                <input
                    type="text"
                    placeholder="Buscar por nombre, apellido o DNI..."
                    value={busqueda}
                    onChange={e => setBusqueda(e.target.value)}
                    className="personal-buscar"
                />
                <div className="personal-toolbar-right">
                    <span className="personal-total">
                        <FontAwesomeIcon icon={faUsersLine} /> Total: <strong>{personal.length}</strong>
                    </span>
                    <button className="btn-add-personal" onClick={abrirModalNuevo} title="Añadir personal">
                        <FontAwesomeIcon icon={faPlus} />
                    </button>
                </div>
            </div>

            {cargando && <p className="personal-estado">Cargando personal...</p>}

            {!cargando && filtrado.length === 0 && (
                <p className="personal-estado">No se encontró personal con ese criterio.</p>
            )}

            <div className="personal-grid">
                {filtrado.map(p => (
                    <div key={p.id} className="personal-card">
                        <div className="personal-avatar">{iniciales(p.nombre, p.apellido)}</div>
                        <div className="personal-info">
                            <h3>{p.nombre} {p.apellido}</h3>
                            <div className="personal-detail">
                                <FontAwesomeIcon icon={faIdCard} />
                                <span>DNI: {p.dni}</span>
                            </div>
                        </div>
                        <div className="card-actions">
                            <button className="btn-icon-card editar" title="Editar" onClick={() => abrirModalEditar(p)}>
                                <FontAwesomeIcon icon={faPencil} />
                            </button>
                            <button className="btn-icon-card eliminar" title="Eliminar" onClick={() => setPersonaEliminar(p)}>
                                <FontAwesomeIcon icon={faTrash} />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* ── Modal: Añadir/Editar Personal ── */}
            {modalAbierto && (
                <div className="modal-overlay" onClick={cerrarModal}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <h3>{editando ? "Editar Personal" : "Añadir Personal"}</h3>

                        <div className="form-group">
                            <label>Nombre:</label>
                            <input
                                type="text"
                                placeholder="Ej: Juan"
                                value={nombreNuevo}
                                onChange={e => setNombreNuevo(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label>Apellido:</label>
                            <input
                                type="text"
                                placeholder="Ej: García López"
                                value={apellidoNuevo}
                                onChange={e => setApellidoNuevo(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label>DNI:</label>
                            <input
                                type="text"
                                placeholder="8 dígitos"
                                value={dniNuevo}
                                onChange={e => handleDniChange(e.target.value)}
                                maxLength={8}
                            />
                        </div>

                        {error && <p className="personal-error">{error}</p>}

                        <div className="modal-actions">
                            <button
                                className="btn-modal-guardar"
                                onClick={handleGuardar}
                                disabled={!nombreNuevo.trim() || !apellidoNuevo.trim() || dniNuevo.length !== 8 || guardando}
                            >
                                <FontAwesomeIcon icon={faFloppyDisk} />
                                {guardando ? "Guardando..." : editando ? "Guardar Cambios" : "Guardar Personal"}
                            </button>
                            <button className="btn-modal-cancelar" onClick={cerrarModal}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Modal: Confirmar eliminación ── */}
            {personaEliminar && (
                <div className="modal-overlay" onClick={() => setPersonaEliminar(null)}>
                    <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <h3>Eliminar Personal</h3>
                        <p className="modal-confirm-text">
                            ¿Seguro que deseas eliminar a <strong>{personaEliminar.nombre} {personaEliminar.apellido}</strong>?
                            Esta acción no se puede deshacer.
                        </p>
                        <div className="modal-actions">
                            <button className="btn-modal-eliminar" onClick={handleEliminar} disabled={eliminando}>
                                {eliminando ? "Eliminando..." : "Sí, eliminar"}
                            </button>
                            <button className="btn-modal-cancelar" onClick={() => setPersonaEliminar(null)}>
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

export default PersonalRutas