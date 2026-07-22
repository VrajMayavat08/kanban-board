import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  DndContext,
  useDraggable,
  useDroppable,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import api from '../api/axios';
import socket from '../api/socket';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

const listAccents = ['#14E0C4', '#3B82F6', '#9C8CFF', '#F5A623', '#EC5B87'];

function Board() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [cards, setCards] = useState([]);
  const [allBoards, setAllBoards] = useState([]);
  const [activity, setActivity] = useState([]);
  const [presentUsers, setPresentUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newListTitle, setNewListTitle] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const logActivity = (text) => {
    setActivity((prev) =>
      [{ id: Date.now() + Math.random(), text, time: new Date() }, ...prev].slice(0, 12)
    );
  };

  useEffect(() => {
    fetchBoard();
    fetchAllBoards();
  }, [id]);

  useEffect(() => {
    socket.connect();
    socket.emit('joinBoard', {
      boardId: id,
      user: { _id: user?._id, name: user?.name },
    });

    socket.on('presenceUpdate', (users) => setPresentUsers(users));

    socket.on('cardCreated', (card) => {
      setCards((prev) => (prev.some((c) => c._id === card._id) ? prev : [...prev, card]));
      logActivity(`New card "${card.title}" added`);
    });

    socket.on('cardMoved', (movedCard) => {
      setCards((prev) => prev.map((c) => (c._id === movedCard._id ? movedCard : c)));
      logActivity(`Card "${movedCard.title}" moved`);
    });

    socket.on('listCreated', (list) => {
      setLists((prev) => (prev.some((l) => l._id === list._id) ? prev : [...prev, list]));
      logActivity(`New list "${list.title}" created`);
    });

    socket.on('cardDeleted', (cardId) => {
      setCards((prev) => prev.filter((c) => c._id !== cardId));
      logActivity('A card was deleted');
    });

    socket.on('listDeleted', (listId) => {
      setLists((prev) => prev.filter((l) => l._id !== listId));
      setCards((prev) => prev.filter((c) => c.list !== listId));
      logActivity('A list was deleted');
    });

    return () => {
      socket.emit('leaveBoard', id);
      socket.off('presenceUpdate');
      socket.off('cardCreated');
      socket.off('cardMoved');
      socket.off('listCreated');
      socket.off('cardDeleted');
      socket.off('listDeleted');
      socket.disconnect();
    };
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

  const fetchAllBoards = async () => {
    try {
      const res = await api.get('/boards');
      setAllBoards(res.data);
    } catch (err) {
      console.error('Failed to fetch boards', err);
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
      logActivity(`You created list "${res.data.title}"`);
      socket.emit('listCreated', { boardId: id, list: res.data });
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
      logActivity(`You added card "${res.data.title}"`);
      socket.emit('cardCreated', { boardId: id, card: res.data });
    } catch (err) {
      console.error('Failed to create card', err);
    }
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    const cardId = active.id;
    const targetListId = over.id;
    const card = cards.find((c) => c._id === cardId);
    if (!card || card.list === targetListId) return;

    const newPosition = cards.filter((c) => c.list === targetListId).length;

    setCards((prev) =>
      prev.map((c) =>
        c._id === cardId ? { ...c, list: targetListId, position: newPosition } : c
      )
    );

    try {
      await api.put(`/cards/${cardId}`, { list: targetListId, position: newPosition });
      const updatedCard = { ...card, list: targetListId, position: newPosition };
      logActivity(`You moved "${card.title}"`);
      socket.emit('cardMoved', { boardId: id, card: updatedCard });
    } catch (err) {
      console.error('Failed to move card', err);
      fetchBoard();
    }
  };

  const handleDeleteCard = async (cardId) => {
    const card = cards.find((c) => c._id === cardId);
    setCards((prev) => prev.filter((c) => c._id !== cardId));
    try {
      await api.delete(`/cards/${cardId}`);
      logActivity(`You deleted "${card?.title}"`);
      socket.emit('cardDeleted', { boardId: id, cardId });
    } catch (err) {
      console.error('Failed to delete card', err);
      fetchBoard();
    }
  };

  const handleDeleteList = async (listId) => {
    if (!window.confirm('Delete this list and all its cards?')) return;
    const list = lists.find((l) => l._id === listId);
    setLists((prev) => prev.filter((l) => l._id !== listId));
    setCards((prev) => prev.filter((c) => c.list !== listId));
    try {
      await api.delete(`/lists/${listId}`);
      logActivity(`You deleted list "${list?.title}"`);
      socket.emit('listDeleted', { boardId: id, listId });
    } catch (err) {
      console.error('Failed to delete list', err);
      fetchBoard();
    }
  };

  const handleDeleteBoard = async () => {
    if (!window.confirm(`Delete "${board.title}" and everything in it? This cannot be undone.`))
      return;
    try {
      await api.delete(`/boards/${id}`);
      navigate('/boards');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete board');
    }
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviteMsg('');
    try {
      const res = await api.post(`/boards/${id}/members`, { email: inviteEmail });
      setInviteMsg(res.data.message);
      setInviteEmail('');
      fetchBoard();
      setTimeout(() => {
        setShowInvite(false);
        setInviteMsg('');
      }, 1500);
    } catch (err) {
      setInviteMsg(err.response?.data?.message || 'Failed to add member');
    }
  };

  const timeAgo = (t) => {
    const s = Math.floor((Date.now() - new Date(t)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[var(--color-teal)] border-t-transparent rounded-full animate-spin" />
          <p className="text-[var(--color-text-secondary)] text-sm">Loading board...</p>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-[var(--color-text-secondary)] text-sm">Board not found.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex relative overflow-hidden">
      {/* Ambient glows */}
      <div
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(20,224,196,0.10) 0%, rgba(20,224,196,0) 70%)',
          filter: 'blur(90px)',
          top: '-250px',
          left: '100px',
        }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, rgba(59,130,246,0.09) 0%, rgba(59,130,246,0) 70%)',
          filter: 'blur(90px)',
          bottom: '-300px',
          right: '-180px',
        }}
      />

      {/* ---------- SIDEBAR ---------- */}
      <aside className={`${sidebarOpen ? 'w-64' : 'w-14'} flex-shrink-0 border-r border-white/8 p-3 flex flex-col gap-6 relative z-10 min-h-screen transition-all duration-200`}>
      <div className="flex items-center justify-between gap-2 px-1">
        {sidebarOpen && (
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--color-teal-dim)] flex items-center justify-center">
           <span className="w-2.5 h-2.5 rounded-full bg-[var(--color-teal)]" />
          </div>
          <span className="font-[var(--font-display)] font-semibold text-sm">Kanban</span>
        </div>
      )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors text-sm px-1"
          title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
           >
          {sidebarOpen ? '«' : '»'}
        </button>
      </div>

      {sidebarOpen && (
      <>

        {/* Boards list */}
        <div>
          <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
            Boards
          </p>
          <div className="flex flex-col gap-0.5">
            {allBoards.map((b) => (
              <button
                key={b._id}
                onClick={() => navigate(`/boards/${b._id}`)}
                className={`text-left text-sm px-2.5 py-1.5 rounded-lg transition-colors truncate ${
                  b._id === id
                    ? 'bg-white/8 text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-white/5'
                }`}
              >
                {b.title}
              </button>
            ))}
          </div>
        </div>

        {/* Members + invite */}
        <div>
          <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
            Members
          </p>
          <div className="flex items-center gap-1.5 flex-wrap mb-2">
            {board.members?.map((m) => {
              const isOnline = presentUsers.some((p) => p._id === m._id);
              return <Avatar key={m._id} name={m.name} size={30} live={isOnline} />;
            })}
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="w-[30px] h-[30px] rounded-full border border-dashed border-white/20 text-[var(--color-text-secondary)] text-sm hover:border-white/40 hover:text-[var(--color-text-primary)] transition-colors flex items-center justify-center"
            >
              +
            </button>
          </div>

          {showInvite && (
            <form onSubmit={handleInvite} className="mt-2">
              <input
                type="email"
                placeholder="Email to invite..."
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                autoFocus
                className="w-full bg-white/5 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-[var(--color-teal)]"
              />
              {inviteMsg && (
                <p className="text-[10px] mt-1.5 text-[var(--color-text-secondary)]">
                  {inviteMsg}
                </p>
              )}
            </form>
          )}
        </div>

        {/* Activity feed */}
        <div className="flex-1 min-h-0 flex flex-col">
          <p className="font-[var(--font-mono)] text-[10px] uppercase tracking-wider text-[var(--color-text-secondary)] mb-2">
            Activity
          </p>
          <div className="flex flex-col gap-2 overflow-y-auto">
            {activity.length === 0 ? (
              <p className="text-xs text-[var(--color-text-secondary)]/50">
                No activity yet. Start moving cards.
              </p>
            ) : (
              activity.map((a) => (
                <div
                  key={a.id}
                  className="text-xs text-[var(--color-text-secondary)] leading-snug"
                >
                  <span className="text-[var(--color-text-primary)]/80">{a.text}</span>
                  <span className="block text-[10px] text-[var(--color-text-secondary)]/50 font-[var(--font-mono)]">
                    {timeAgo(a.time)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] text-left transition-colors"
        >
          Log out
        </button>
        </>
        )}
      </aside>

      {/* ---------- MAIN ---------- */}
      <div className="flex-1 flex flex-col relative z-10 min-w-0">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-white/8">
          <div className="flex items-center gap-3">
            <h1 className="font-[var(--font-display)] font-semibold text-xl">
              {board.title}
            </h1>
            <span className="flex items-center gap-1.5 text-xs text-[var(--color-teal)] bg-[var(--color-teal-dim)] px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-teal)] live-dot" />
              {presentUsers.length} online
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-[var(--font-mono)] text-xs text-[var(--color-text-secondary)]">
              {lists.length} lists · {cards.length} cards
            </span>
            <button
              onClick={handleDeleteBoard}
              className="text-xs text-[var(--color-text-secondary)] hover:text-[#EC5B87] transition-colors"
            >
              Delete board
            </button>
            <div className="flex -space-x-2">
              {presentUsers.slice(0, 4).map((u, i) => (
                <div
                  key={u._id + i}
                  className="ring-2 ring-[var(--color-bg-deep)] rounded-full"
                >
                  <Avatar name={u.name} size={30} live />
                </div>
              ))}
              {presentUsers.length > 4 && (
                <div className="w-[30px] h-[30px] rounded-full bg-white/10 ring-2 ring-[var(--color-bg-deep)] flex items-center justify-center text-[10px] text-[var(--color-text-secondary)]">
                  +{presentUsers.length - 4}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Board area */}
        <div className="flex-1 px-8 py-6 overflow-x-auto">
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="flex gap-4 items-start">
              {lists.map((list, i) => (
                <ListColumn
                  key={list._id}
                  list={list}
                  accent={listAccents[i % listAccents.length]}
                  cards={cards.filter((c) => c.list === list._id)}
                  onAddCard={handleAddCard}
                  onDeleteCard={handleDeleteCard}
                  onDeleteList={handleDeleteList}
                />
              ))}

              <form
                onSubmit={handleAddList}
                className="glass-card rounded-2xl p-3 w-72 flex-shrink-0"
              >
                <input
                  type="text"
                  placeholder="+ Add a list"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--color-text-secondary)] px-1 py-1"
                />
              </form>
            </div>
          </DndContext>
        </div>
      </div>
    </div>
  );
}

/* ---------- List column (droppable) ---------- */
function ListColumn({ list, cards, accent, onAddCard, onDeleteCard, onDeleteList }) {
  const [newCardTitle, setNewCardTitle] = useState('');
  const { setNodeRef, isOver } = useDroppable({ id: list._id });

  const handleSubmit = (e) => {
    e.preventDefault();
    onAddCard(list._id, newCardTitle);
    setNewCardTitle('');
  };

  return (
    <div
      ref={setNodeRef}
      className={`glass-card rounded-2xl w-72 flex-shrink-0 overflow-hidden transition-all ${
        isOver ? 'ring-1 ring-white/25' : ''
      }`}
    >
      <div
        className="h-1"
        style={{ background: `linear-gradient(90deg, ${accent}, transparent)` }}
      />

      <div className="p-3">
        <div className="flex justify-between items-center mb-3 px-1">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ background: accent }} />
            <p className="text-sm font-medium">{list.title}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-[var(--font-mono)] text-xs text-[var(--color-text-secondary)] bg-white/5 px-2 py-0.5 rounded-full">
              {cards.length}
            </span>
            <button
              onClick={() => onDeleteList(list._id)}
              className="text-[var(--color-text-secondary)] hover:text-[#EC5B87] transition-colors text-xs"
              title="Delete list"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2 mb-2 min-h-[48px]">
          {cards.length === 0 && (
            <div
              className={`text-xs text-center py-4 rounded-lg border border-dashed transition-colors ${
                isOver
                  ? 'border-white/25 text-[var(--color-text-secondary)]'
                  : 'border-white/8 text-[var(--color-text-secondary)]/50'
              }`}
            >
              {isOver ? 'Release to drop' : 'No cards yet'}
            </div>
          )}
          {cards.map((card) => (
            <DraggableCard
              key={card._id}
              card={card}
              accent={accent}
              onDelete={onDeleteCard}
            />
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="+ Add a card"
            value={newCardTitle}
            onChange={(e) => setNewCardTitle(e.target.value)}
            className="w-full bg-transparent text-xs outline-none placeholder:text-[var(--color-text-secondary)] px-1 py-1.5 rounded hover:bg-white/5 transition-colors"
          />
        </form>
      </div>
    </div>
  );
}

/* ---------- Draggable card ---------- */
function DraggableCard({ card, accent, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: card._id,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`card-item card-enter rounded-lg px-3 py-2.5 text-sm group relative ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        <span
          className="w-1 self-stretch rounded-full flex-shrink-0"
          style={{ background: accent, minHeight: '16px' }}
        />
        <span
          {...listeners}
          {...attributes}
          className="flex-1 cursor-grab active:cursor-grabbing"
        >
          {card.title}
        </span>
        <button
          onClick={() => onDelete(card._id)}
          className="opacity-0 group-hover:opacity-100 text-[var(--color-text-secondary)] hover:text-[#EC5B87] transition-all text-xs flex-shrink-0"
          title="Delete card"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

export default Board;