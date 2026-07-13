import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axios';

function Board() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newListTitle, setNewListTitle] = useState('');

  useEffect(() => {
    fetchBoard();
  }, [id]);

  const fetchBoard = async () => {
    try {
      const res = await api.get(`/boards/${id}`);
      setBoard(res.data.board);
      setLists(res.data.lists);
      setCards(res.data.cards);
    } catch (err) {
      console.error('Failed to fetch board', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddList = async (e) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    try {
      const res = await api.post('/lists', {
        title: newListTitle,
        board: id,
        position: lists.length,
      });
      setLists([...lists, res.data]);
      setNewListTitle('');
    } catch (err) {
      console.error('Failed to create list', err);
    }
  };

  const handleAddCard = async (listId, title) => {
    if (!title.trim()) return;
    const cardsInList = cards.filter((c) => c.list === listId);
    try {
      const res = await api.post('/cards', {
        title,
        list: listId,
        board: id,
        position: cardsInList.length,
      });
      setCards([...cards, res.data]);
    } catch (err) {
      console.error('Failed to create card', err);
    }
  };

  if (loading) return <p className="p-8 text-[var(--color-text-secondary)]">Loading...</p>;
  if (!board) return <p className="p-8 text-[var(--color-text-secondary)]">Board not found.</p>;

  return (
    <div className="min-h-screen px-6 py-8">
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/boards')}
          className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
        >
          ← Boards
        </button>
        <h1 className="font-[var(--font-display)] text-xl">{board.title}</h1>
      </div>

      <div className="flex gap-4 items-start overflow-x-auto pb-4">
        {lists.map((list) => (
          <ListColumn
            key={list._id}
            list={list}
            cards={cards.filter((c) => c.list === list._id)}
            onAddCard={handleAddCard}
          />
        ))}

        {/* Add new list */}
        <form onSubmit={handleAddList} className="glass-card rounded-xl p-3 w-64 flex-shrink-0">
          <input
            type="text"
            placeholder="+ Add a list"
            value={newListTitle}
            onChange={(e) => setNewListTitle(e.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--color-text-secondary)]"
          />
        </form>
      </div>
    </div>
  );
}

// List column component
function ListColumn({ list, cards, onAddCard }) {
  const [newCardTitle, setNewCardTitle] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddCard(list._id, newCardTitle);
    setNewCardTitle('');
  };

  return (
    <div className="glass-card rounded-xl p-3 w-64 flex-shrink-0">
      <div className="flex justify-between items-center mb-3 px-1">
        <p className="text-sm font-medium">{list.title}</p>
        <span className="text-xs text-[var(--color-text-secondary)]">{cards.length}</span>
      </div>

      <div className="flex flex-col gap-2 mb-3">
        {cards.map((card) => (
          <div
            key={card._id}
            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm"
          >
            {card.title}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="+ Add a card"
          value={newCardTitle}
          onChange={(e) => setNewCardTitle(e.target.value)}
          className="w-full bg-transparent text-xs outline-none placeholder:text-[var(--color-text-secondary)] px-1 py-1"
        />
      </form>
    </div>
  );
}

export default Board;