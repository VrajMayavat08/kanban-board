import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Boards from './pages/Boards';
import Board from './pages/Board';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/boards"
          element={
            <ProtectedRoute>
              <Boards />
            </ProtectedRoute>
          }
        />
        <Route
  path="/boards/:id"
  element={
    <ProtectedRoute>
      <Board />
    </ProtectedRoute>
  }
/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;