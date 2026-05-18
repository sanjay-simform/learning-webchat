import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { SocketProvider } from "./context/SocketContext";
import { PresenceProvider } from "./context/PresenceContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { SignIn } from "./modules/auth/pages/SignIn";
import { SignUp } from "./modules/auth/pages/SignUp";
import { Home } from "./pages/Home";
import { ChatPage, ChatDetailPage } from "./modules/chatlist";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <PresenceProvider>
            <Routes>
              {/* Auth Routes */}
              <Route path="/signin" element={<SignIn />} />
              <Route path="/signup" element={<SignUp />} />

              {/* Protected Routes */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Home />
                  </ProtectedRoute>
                }
              />

              {/* Chat Routes */}
              <Route
                path="/chat"
                element={
                  <ProtectedRoute>
                    <ChatPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/chat/:chatId"
                element={
                  <ProtectedRoute>
                    <ChatDetailPage />
                  </ProtectedRoute>
                }
              />

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </PresenceProvider>
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
