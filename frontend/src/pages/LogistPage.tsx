import { Outlet } from "react-router-dom"
import MenuBar from "../components/MenuBar"

import "../components/LogistPage.css"

const PrincipalPage = () => {
    return (
        <div className="logist-page">
            <MenuBar />
                <div className="logist-content-area">
                    <Outlet />
                </div>
        </div>
    )
}

export default PrincipalPage;