import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Dashboard } from "./pages/Dashboard";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/entrar" replace />} />
        <Route path="/entrar" element={<Login />} />
        <Route path="/registrar" element={<Register />} />
        <Route path="/painel" element={<Dashboard />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
