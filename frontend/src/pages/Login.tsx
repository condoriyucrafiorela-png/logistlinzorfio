import "../components/loginStructure/Login.css"
import LoginBody from "../components/loginStructure/LoginBody"
import LoginCard from "../components/loginStructure/LoginCard"

import "../components/loginStructure/Login.css"

const Login = () => {
    return (
        <div className="login-page">
            <LoginBody>
                <LoginCard />
            </LoginBody>
        </div>

    )
}

export default Login