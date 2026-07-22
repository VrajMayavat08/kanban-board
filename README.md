# Collabo — Real-Time Collaborative Kanban Board

A full-stack kanban board where multiple people work on the same board simultaneously. Cards move, lists change, and teammates appear and disappear — all live, with no refresh.

🔗 **[Live Demo](https://kanban-board-cyan-iota.vercel.app)**

> Note: the backend runs on Render's free tier and spins down after inactivity. The first load may take 30–60 seconds while it wakes up.

---

## What makes this more than a CRUD app

The interesting part of this project isn't the kanban board — it's the real-time layer underneath it.

**Live sync.** When any user creates, moves, or deletes a card, the change is broadcast over WebSockets to everyone else viewing that board. No polling, no refresh. Changes appear in under a second.

**Live presence.** The board shows who is *currently viewing it*, not just who's a member. Avatars appear the moment someone opens the board and disappear when they close the tab — including on unexpected disconnects, which are handled by storing user identity on the socket connection itself so cleanup works even when the client never says goodbye.

**Optimistic updates.** Dragging a card updates the UI immediately rather than waiting for the server round-trip, so it feels instant. If the server call fails, the client reverts by refetching board state.

---

## Features

- **Authentication** — JWT tokens, bcrypt-hashed passwords
- **Boards, lists, and cards** — full CRUD, with cascading deletes (deleting a list removes its cards; deleting a board removes everything)
- **Drag and drop** — move cards between lists with `@dnd-kit`
- **Real-time sync** — creates, moves, and deletes broadcast live to all board viewers
- **Live presence** — see who's on the board right now, with online indicators on member avatars
- **Member invites** — board owners add collaborators by email
- **Access control** — non-members receive a 403 even with a direct board URL
- **Session activity feed** — a running log of what's happening on the board

---

## How the real-time layer works

Each board is a Socket.io **room**. When a user opens a board, their client joins that room and sends their identity:

```
socket.emit('joinBoard', { boardId, user })
```

The server stores that user against their socket ID in a presence map, then broadcasts the updated viewer list to everyone in the room.

When a user makes a change, the client persists it via the REST API, then emits a socket event. The server relays it to everyone else in the room using `socket.to(boardId)` — which excludes the sender, since their UI already updated optimistically.

On disconnect, the server reads the board ID and user from `socket.data` (set at join time) to remove them from presence and broadcast the update. This is what prevents "ghost" avatars lingering after someone closes their laptop.

---

## Tech Stack

**Frontend**
- React (Vite)
- Tailwind CSS
- React Router
- Socket.io-client
- @dnd-kit (drag and drop)
- Axios

**Backend**
- Node.js + Express
- Socket.io
- MongoDB + Mongoose
- JWT + bcryptjs

**Deployment**
- Frontend → Vercel
- Backend → Render
- Database → MongoDB Atlas

---

## Screenshots

Full Kanban board view:

<img width="1919" height="960" alt="image" src="https://github.com/user-attachments/assets/37e637d1-7657-4359-a4be-7ed1a9b72614" />
<img width="1866" height="806" alt="image" src="https://github.com/user-attachments/assets/e9d274f4-8866-497e-a0be-676b0e26508a" />

Two accounts working together:

<img width="1915" height="651" alt="image" src="https://github.com/user-attachments/assets/fa6d29e6-0b30-40ad-90f2-23ba297e003a" />

Drag and Drop functionality for the Cards
<img width="936" height="425" alt="image" src="https://github.com/user-attachments/assets/a8e7e09f-76b6-4190-b7fd-4009aace7fd2" />






## Running locally

### Prerequisites
- Node.js 22.12+
- A MongoDB Atlas connection string

### Backend

```bash
cd kanban-server
npm install
```

Create `kanban-server/.env`:

```
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
```

```bash
npm run dev
```

### Frontend

```bash
cd kanban-client
npm install
```

Create `kanban-client/.env`:

```
VITE_API_URL=http://localhost:5000/api
VITE_SOCKET_URL=http://localhost:5000
```

```bash
npm run dev
```

Open `http://localhost:5173`.

**To see the real-time features:** register two accounts, add the second as a member of a board, then open the board in a normal window and an incognito window side by side.

---

## API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in, receive JWT |

### Boards *(protected)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards` | Boards the user owns or belongs to |
| POST | `/api/boards` | Create a board |
| GET | `/api/boards/:id` | Board with its lists and cards (members only) |
| DELETE | `/api/boards/:id` | Delete a board and its contents (owner only) |
| POST | `/api/boards/:id/members` | Add a member by email (owner only) |

### Lists & Cards *(protected)*
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/lists` | Create a list |
| DELETE | `/api/lists/:id` | Delete a list and its cards |
| POST | `/api/cards` | Create a card |
| PUT | `/api/cards/:id` | Update a card (used for moves) |
| DELETE | `/api/cards/:id` | Delete a card |

### Socket Events
| Event | Direction | Payload |
|-------|-----------|---------|
| `joinBoard` | client → server | `{ boardId, user }` |
| `leaveBoard` | client → server | `boardId` |
| `presenceUpdate` | server → clients | array of users currently viewing |
| `cardCreated` / `cardMoved` / `cardDeleted` | both | card or card ID |
| `listCreated` / `listDeleted` | both | list or list ID |

---

## Project Structure

```
kanban-board/
├── kanban-server/
│   ├── config/         # MongoDB connection
│   ├── controllers/    # auth, board, list, card logic
│   ├── middleware/     # JWT route protection
│   ├── models/         # User, Board, List, Card schemas
│   ├── routes/         # Express routes
│   └── server.js       # Express + Socket.io entry point
│
└── kanban-client/
    └── src/
        ├── api/        # axios instance, socket instance
        ├── components/ # Avatar, ProtectedRoute
        ├── context/    # auth context
        └── pages/      # Login, Register, Boards, Board
```

---

## Known limitations & next steps

Being upfront about what this doesn't do yet:

- **No invite acceptance flow.** Owners add members directly rather than sending an invitation the recipient accepts. Fine for a trusted team; wouldn't scale without consent handling.
- **Card ordering within a list isn't draggable.** Cards move between lists, but not reordered vertically within one.
- **Activity feed is session-only.** It shows what happens while you're viewing; it isn't persisted to the database.
- **Last-write-wins on conflicts.** If two users move the same card simultaneously, the later write wins. Acceptable here since users rarely touch the same card at once, but a production system would need proper conflict resolution.
- **No card descriptions, due dates, or labels.** Cards are title-only.

---

## Author

**Vraj Mayavat**
- GitHub: [@VrajMayavat08](https://github.com/VrajMayavat08)

---

## License

MIT
