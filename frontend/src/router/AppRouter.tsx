import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import Login from "../pages/Login.tsx"
import PrincipalPage from "../pages/LogistPage"
import RutaProtegida from "./RutaProtegida"
import LogistBody from "../components/loadingRutas/PrincipalPage.tsx"
import PersonalRutas from "../components/personalRutas/PersonalRutas.tsx"
import ClienteRutas from "../components/clienteRutas/ClienteRutas.tsx"
import ConfigRuta from "../components/configRutas/ConfigRuta.tsx"
import EntregasRuta from "../components/entregasRutas/entregasRuta.tsx"
import ReporteRutas from "../components/reportesRutas/ReporteRutas.tsx"
import GestionIncidencias from "../components/gestionIncidencias/GestionIncidencias.tsx"
import { RutasProvider } from "../context/RutasContext"

const AppRouter = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Navigate to="/login" />} />
                <Route path="/login" element={<Login />} />
                {/* POR HACER (EL APARTADO GESTION ES EL APARTADO LLAMADO "PERSONAL") */}
                <Route path="/gestion" element={
                    <RutaProtegida>
                        <RutasProvider>          {/* ← contexto compartido */}
                            <PrincipalPage />
                        </RutasProvider>
                    </RutaProtegida>
                }>
                    <Route index element={<PersonalRutas />} />
                    {/* DESPUES */}
                    <Route path="informacion" element={<ClienteRutas />} />
                    {/* HECHO */}
                    <Route path="cargar"      element={<LogistBody />} />
                    {/* HECHO */}
                    <Route path="configurar"  element={<ConfigRuta />} />
                    {/* HECHO */}
                    <Route path="entregas" element={<EntregasRuta />} />
                    {/* HECHO */}
                    <Route path="reportes" element={<ReporteRutas />} />
                    {/* HECHO */}
                    <Route path="incidencias" element={<GestionIncidencias />} />
                </Route>
            </Routes>
        </BrowserRouter>
    )
}

export default AppRouter