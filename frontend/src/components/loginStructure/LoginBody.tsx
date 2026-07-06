import "./loginBody.css"

const LoginBody = ({ children }: { children: React.ReactNode }) => {
    return (
        <div className="general-page">
            {children}
        </div>
    )
}

export default LoginBody