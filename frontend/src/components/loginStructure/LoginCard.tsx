import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEye, faEyeSlash } from "@fortawesome/free-regular-svg-icons";
import { useNavigate } from "react-router-dom";
import "./loginCard.css"
import iconImg from "../../assets/images/Logo.png"

import { API_URL } from "../../config/api"

const LoginCard = () => {
    const [showPassword, setShowPassword] = useState(false)
    const [correo, setCorreo] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [cargando, setCargando] = useState(false)

    const navigate = useNavigate()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError("")
        setCargando(true)

        try {
            const res = await fetch(`${API_URL}/api/auth/login`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    correo: correo.trim(),
                    password
                })
            })

            const data = await res.json()

            if (!res.ok) {
                setError(data.mensaje)
                return
            }

            localStorage.setItem("token", data.token)
            navigate("/gestion/cargar")

        } catch {
            setError("Error al conectar con el servidor")
        } finally {
            setCargando(false)
        }
    }

    return (
        <div className="loginCard">
            <div className="container-form">
                <div className="login-headerForm">
                    <div className="login-header">
                        <img src={iconImg} alt="Icono representativo de la imagen Transporte Linzor" />
                        <h1>Gestión Linzor</h1>
                    </div>
                    <h2>INICIAR SESIÓN</h2>
                    <p>Ingrese sus datos para ingresar a la página.</p>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="input-container">
                        <label htmlFor="correo">Correo Electrónico:</label>
                        <input
                            type="email"
                            id="correo"
                            placeholder="Email"
                            autoComplete="username"
                            value={correo}
                            onChange={e => setCorreo(e.target.value)}
                            disabled={cargando}
                        />
                    </div>
                    <div className="input-container">
                        <label htmlFor="password">Contraseña:</label>
                        <div className="password-wrapper">
                            <input
                                type={showPassword ? "text" : "password"}
                                id="password"
                                placeholder="Contraseña"
                                autoComplete="current-password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                disabled={cargando}
                            />
                            <span className="toggle-password" onClick={() => setShowPassword(!showPassword)}>
                                <FontAwesomeIcon icon={showPassword ? faEyeSlash : faEye} />
                            </span>
                        </div>
                    </div>

                    {error && <p className="error-msg">{error}</p>}

                    <button type="submit" className="btn-submit" disabled={cargando}>
                        {cargando ? "Iniciando sesión..." : "Iniciar Sesión"}
                    </button>
                    <div className="line-div"></div>
                    <p className="signature-text">© 2026 Logístlinzor</p>
                </form>
            </div>
        </div>
    )
}

export default LoginCard