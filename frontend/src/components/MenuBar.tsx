import { NavLink, useNavigate } from "react-router-dom"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUpload, faInfoCircle, faUsersLine, faBox, faFileLines, faGear, faRightFromBracket, faTriangleExclamation } from "@fortawesome/free-solid-svg-icons";
import iconImg from "../assets/images/Logo.png";
import useUsuario from "../hooks/useUsuario";
import "./MenuBar.css";

const getNavClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? "nav-item active" : "nav-item"

const MenuBar = () => {

    const usuario = useUsuario();
    const navigate = useNavigate();

    const nombreCompleto = [usuario?.primer_apellido, usuario?.primer_nombre]
        .filter(Boolean)
        .join(" ")

    const iniciales = nombreCompleto
        ? nombreCompleto.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
        : "?"

    const inicialApellido = usuario?.primer_apellido
        ?.split(" ")
        .map(n => n[0] + ".")
        .join(" ")

    const mayusRol = usuario?.rol
        ? usuario.rol.charAt(0)
            .toUpperCase() + usuario.rol.slice(1).toLowerCase()
        : "";

    const cerrarSesion = () => {
        localStorage.removeItem("token");
        navigate("/login");
    }

    return (
        <aside className="menu-bar">
            <NavLink className="mb-content" to={"/gestion/cargar"}>
                <img src={iconImg} className="icon" />
                <span className="title">Gestión Linzor</span>
            </NavLink>
            <div className="mb-nav">
                <span>Menu</span>
                <NavLink className={getNavClass} to={"/gestion"} end><FontAwesomeIcon icon={faUsersLine} />Personal</NavLink> {/*POR HACER*/}
                <NavLink className={getNavClass} to={"/gestion/informacion"}><FontAwesomeIcon icon={faInfoCircle} />Información del Cliente</NavLink> {/*DESPUES*/}
                <NavLink className={getNavClass} to={"/gestion/cargar"}><FontAwesomeIcon icon={faUpload} />Cargar Rutas</NavLink> {/*HECHO*/}
                <NavLink className={getNavClass} to={"/gestion/configurar"}><FontAwesomeIcon icon={faGear} />Configurar Rutas</NavLink> {/*HECHO*/}
                <NavLink className={getNavClass} to={"/gestion/entregas"}><FontAwesomeIcon icon={faBox} />Mis Entregas</NavLink> {/*HECHO*/}
                <NavLink className={getNavClass} to={"/gestion/reportes"}><FontAwesomeIcon icon={faFileLines} />Reportes</NavLink> {/*HECHO*/}
                <NavLink className={getNavClass} to={"/gestion/incidencias"}>
                    <FontAwesomeIcon icon={faTriangleExclamation} />Gestión Incidencias
                </NavLink> {/*HECHO*/}
            </div>
            <div className="ft-nav">
                <div className="mb-footer">
                    <div className="user-row">
                        <div className="avatar">{iniciales}</div>
                        <div className="user-info">
                            <div className="user-name">{inicialApellido ?? "..."} {usuario?.primer_nombre ?? "..."}</div>
                            <div className="user-role">Rol: {mayusRol ?? "..."}</div>
                        </div>
                    </div>
                </div>
                <div className="footer-menu">
                    <button className="footer-menu-item danger" onClick={cerrarSesion}>
                        <FontAwesomeIcon icon={faRightFromBracket} />Cerrar sesión
                    </button>
                </div>
            </div>
        </aside>
    )
}

export default MenuBar;