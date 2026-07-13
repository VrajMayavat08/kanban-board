import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

function Boards() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchBoards();
  }, []);

  const fetchBoards = async () => {
    try {
      const res = await api.get('/boards');
      setBoards(res.data);
    } catch (err) {
      console.error('Failed to fetch boards', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/boards', { title: newTitle });
      setBoards([res.data, ...boards]);
      setNewTitle('');
    } catch (err) {
      console.error('Failed to create board', err);
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="font-[var(--font-display)] text-xl">Your boards</h1>
            <p className="text-[var(--color-text-secondary)] text-sm">
              {user?.name}
            </p>
          </div>
          <button onClick={handleLogout}
            className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
            Log out
          </button>
        </div>

        <form onSubmit={handleCreate} className="flex gap-2 mb-8">
          <input
            type="text"
            placeholder="New board name..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 max-w-xs bg-white/5 border border-[var(--color-glass-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-[var(--color-violet)]"
          />
          <button type="submit" disabled={creating}
            className="bg-[var(--color-violet)] hover:bg-[var(--color-violet-light)] text-white text-sm font-medium rounded-lg px-4 py-2 transition-colors">
            {creating ? 'Creating...' : 'Create board'}
          </button>
        </form>

        {loading ? (
          <p className="text-[var(--color-text-secondary)] text-sm">Loading...</p>
        ) : boards.length === 0 ? (
          <div className="glass-card rounded-2xl p-10 text-center">
            <p className="text-[var(--color-text-secondary)] text-sm">
              No boards yet — create one above to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {boards.map((board) => (
              <div
                key={board._id}
                onClick={() => navigate(`/boards/${board._id}`)}
                className="glass-card rounded-xl p-5 cursor-pointer hover:border-[var(--color-violet)]/40"
              >
                <p className="font-[var(--font-display)] text-base mb-1">{board.title}</p>
                <p className="text-xs text-[var(--color-text-secondary)]">
                  {board.members?.length || 1} member{board.members?.length !== 1 ? 's' : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Boards;