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

function Board() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [board, setBoard] = useState(null);
  const [lists, setLists] = useState([]);
  const [cards, setCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newListTitle, setNewListTitle] = useState('');

  // Require a small drag distance before activating, so clicks still work
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  useEffect(() => {
    fetchBoard();
  }, [id]);

  useEffect(() => {
  // Connect and join this board's room
  socket.connect();
  socket.emit('joinBoard', id);

  // Listen for changes from other users
  socket.on('cardCreated', (card) => {
    setCards((prev) => {
      // Guard against duplicates
      if (prev.some((c) => c._id === card._id)) return prev;
      return [...prev, card];
    });
  });

  socket.on('cardMoved', (movedCard) => {
    setCards((prev) =>
      prev.map((c) => (c._id === movedCard._id ? movedCard : c))
    );
  });

  socket.on('listCreated', (list) => {
    setLists((prev) => {
      if (prev.some((l) => l._id === list._id)) return prev;
      return [...prev, list];
    });
  });

  // Cleanup when leaving the board
  return () => {
    socket.emit('leaveBoard', id);
    socket.off('cardCreated');
    socket.off('cardMoved');
    socket.off('listCreated');
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
      socket.emit('listCreated', { boardId: id, list: res.data });
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
      socket.emit('cardCreated', { boardId: id, card: res.data });
    } catch (err) {
      console.error('Failed to create card', err);
    }
  };

  // Called when a card is dropped
  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over) return;

    const cardId = active.id;
    const targetListId = over.id;

    const card = cards.find((c) => c._id === cardId);
    if (!card || card.list === targetListId) return; // no change

    const newPosition = cards.filter((c) => c.list === targetListId).length;

    // Optimistic update — update UI immediately
    setCards((prev) =>
      prev.map((c) =>
        c._id === cardId ? { ...c, list: targetListId, position: newPosition } : c
      )
    );

    // Persist to backend
    try {
      await api.put(`/cards/${cardId}`, {
        list: targetListId,
        position: newPosition,
      });
      const updatedCard = { ...card, list: targetListId, position: newPosition };
      socket.emit('cardMoved', { boardId: id, card: updatedCard });
    } catch (err) {
      console.error('Failed to move card', err);
      fetchBoard(); // revert by refetching if it failed
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

      <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 items-start overflow-x-auto pb-4">
          {lists.map((list) => (
            <ListColumn
              key={list._id}
              list={list}
              cards={cards.filter((c) => c.list === list._id)}
              onAddCard={handleAddCard}
            />
          ))}

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
      </DndContext>
    </div>
  );
}

// Droppable list column
function ListColumn({ list, cards, onAddCard }) {
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
      className={`glass-card rounded-xl p-3 w-64 flex-shrink-0 transition-colors ${
        isOver ? 'border-[var(--color-violet)]' : ''
      }`}
    >
      <div className="flex justify-between items-center mb-3 px-1">
        <p className="text-sm font-medium">{list.title}</p>
        <span className="text-xs text-[var(--color-text-secondary)]">{cards.length}</span>
      </div>

      <div className="flex flex-col gap-2 mb-3 min-h-[40px]">
        {cards.map((card) => (
          <DraggableCard key={card._id} card={card} />
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

// Draggable card
function DraggableCard({ card }) {
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
      {...listeners}
      {...attributes}
      className={`bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm cursor-grab active:cursor-grabbing ${
        isDragging ? 'opacity-50' : ''
      }`}
    >
      {card.title}
    </div>
  );
}

export default Board;