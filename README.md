# Multi-Game Online Platform

A scalable, production-ready web application for hosting online multiplayer games. Currently features **Dots and Boxes** with a dice-rolling mechanic.

## 🎮 Features

- **Real-time Multiplayer**: WebSocket-based gameplay with instant updates
- **Private Rooms**: Create and join games via room codes
- **Server-Authoritative**: All game logic validated server-side to prevent cheating
- **Responsive Design**: Works seamlessly on desktop, tablet, and mobile
- **Premium UI**: Modern, animated interface with smooth transitions
- **Extensible Architecture**: Designed to easily add new games

## 🎲 Dots and Boxes (Dice Variant)

### Game Rules
1. Players take turns rolling a dice (default: 6-sided)
2. The dice roll determines how many lines you can draw that turn
3. Complete a box to score 1 point and earn bonus moves
4. Player with the most boxes wins when the grid is full

### Settings
- **Grid Size**: Configurable (default: 5x5 dots)
- **Dice Sides**: Customizable (default: 6)
- **Max Players**: 2-4 players per game

## 📁 Project Structure

```
game/
├── backend/          # Node.js + Socket.io server
│   ├── server.ts     # Main server entry point
│   ├── room-manager.ts   # Room lifecycle management
│   └── games/
│       └── dots-and-boxes.ts   # Game logic
├── frontend/         # React + Vite application
│   └── src/
│       ├── components/   # UI components
│       ├── socket.ts     # Socket.io client
│       └── store.ts      # Zustand state management
└── shared/           # Shared types between frontend/backend
    └── types.ts
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm

### Installation

1. **Install Backend Dependencies**
```powershell
cd backend
npm install
```

2. **Install Frontend Dependencies**
```powershell
cd frontend
npm install
```

### Running Locally

1. **Start the Backend Server** (in `backend/` directory)
```powershell
npm run dev
```
Server runs on `http://localhost:3001`

2. **Start the Frontend** (in `frontend/` directory)
```powershell
npm run dev
```
Frontend runs on `http://localhost:3000`

3. **Play the Game**
   - Open `http://localhost:3000` in your browser
   - Create a room or join with a room code
   - Share the code with friends to play together!

## 🎯 How to Play

1. **Create or Join a Room**
   - Enter your name
   - Click "Create Room" to host or enter a room code to join

2. **Wait in Lobby**
   - Share the room code with friends
   - Host can start the game when ready (minimum 2 players)

3. **Gameplay**
   - Roll the dice on your turn
   - Click on lines to draw them (limited by dice roll)
   - Complete boxes to score points and earn extra moves
   - Player with most boxes wins!

## 🛠️ Technology Stack

### Backend
- **Node.js** with TypeScript
- **Express** for HTTP server
- **Socket.io** for real-time communication
- **UUID** for room ID generation

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Zustand** for state management
- **Socket.io Client** for real-time updates
- **Lucide React** for icons
- **Vanilla CSS** with modern design system

## 🔧 Configuration

### Backend
- Port: `3001` (configurable via `PORT` environment variable)
- CORS: Enabled for all origins (adjust in production)

### Frontend
- Port: `3000` (configurable in `vite.config.ts`)
- Server URL: `http://localhost:3001` (configurable via `VITE_SERVER_URL`)

## 🎨 Design Philosophy

- **Premium Aesthetics**: Vibrant gradients, smooth animations, and modern typography
- **User Experience**: Intuitive controls with clear visual feedback
- **Accessibility**: High contrast, readable fonts, and responsive layouts
- **Performance**: Optimized rendering and efficient state management

## 🔐 Security Features

- Server-side move validation
- Turn enforcement
- Dice roll generation on server
- No client-side score manipulation

## 📦 Building for Production

### Backend
```powershell
cd backend
npm run build
npm start
```

### Frontend
```powershell
cd frontend
npm run build
npm run preview
```

## 🎮 Adding New Games

The architecture is designed for extensibility:

1. Create a new game class in `backend/games/`
2. Implement the game interface:
   - `init()` - Initialize game state
   - `validateMove()` - Validate player moves
   - `applyMove()` - Apply moves and update state
   - `isGameOver()` - Check win conditions

3. Add game types to `shared/types.ts`
4. Create UI components in `frontend/src/components/`
5. Update routing in `App.tsx`

## 📝 License

This project is open source and available for educational purposes.

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Add new games
- Improve UI/UX
- Fix bugs
- Enhance documentation

---

**Enjoy playing!** 🎉
