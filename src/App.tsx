import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ThemeProvider } from "./contexts/ThemeContext";
import { Dashboard } from "./pages/Dashboard";
import { Friends } from "./pages/Friends";
import { GroupDetail } from "./pages/GroupDetail";
import { Groups } from "./pages/Groups";
import { JoinGroup } from "./pages/JoinGroup";
import { Login } from "./pages/Login";
import { Register } from "./pages/Register";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/painel" replace />} />
          <Route path="/entrar" element={<Login />} />
          <Route path="/registrar" element={<Register />} />
          <Route path="/painel" element={<Dashboard />} />
          <Route path="/grupos" element={<Groups />} />
          <Route path="/grupos/:id" element={<GroupDetail />} />
          <Route path="/amigos" element={<Friends />} />
          <Route path="/join-group/:public_id" element={<JoinGroup />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
