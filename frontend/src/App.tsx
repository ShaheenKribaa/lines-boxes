import React from 'react';
import { useGameStore } from './store';
import { Landing } from './components/Landing';
import { Lobby } from './components/Lobby';
import { GameBoard } from './components/GameBoard';
import { GameOver } from './components/GameOver';
import './index.css';

function App() {
    const { room } = useGameStore();

    // Show game over if game has ended
    if (room?.status === 'ENDED') {
        return <GameOver />;
    }

    // Show game board if game is playing
    if (room?.status === 'PLAYING') {
        return <GameBoard />;
    }

    // Show lobby if in a room but not playing
    if (room?.status === 'LOBBY') {
        return <Lobby />;
    }

    // Show landing page by default
    return <Landing />;
}

export default App;
