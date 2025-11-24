import React, { useState, useEffect } from 'react';
import { ChessBoard } from './components/ChessBoard';
import { AITutor } from './components/AITutor';
import { MoveHistory } from './components/MoveHistory';
import type { GameState, Move, Square, AIHint } from './types/chess';
import {
  initializeBoard,
  getValidMoves,
  squareToPosition,
  isKingInCheck,
  isCheckmate,
  getMoveNotation,
} from './utils/chessLogic';
import { generateHint } from './utils/aiTutor';
// import { supabase } from './lib/supabase';

function App() {
  const [gameState, setGameState] = useState<GameState>({
    board: initializeBoard(),
    turn: 'white',
    selectedSquare: null,
    validMoves: [],
    moveHistory: [],
    castling: {
      white: { kingSide: true, queenSide: true },
      black: { kingSide: true, queenSide: true },
    },
    enPassant: null,
    check: false,
    checkmate: false,
    stalemate: false,
  });

  const [currentHint, setCurrentHint] = useState<AIHint | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(null);

  useEffect(() => {
    initializeGame();
  }, []);

  const initializeGame = async () => {
    // Leaving the supabase code here, just unchanged
  };

  const handleSquareClick = (square: Square) => {
    const pos = squareToPosition(square);
    const piece = gameState.board[pos.row][pos.col];

    if (gameState.checkmate || gameState.stalemate) return;

    if (gameState.selectedSquare) {
      if (gameState.validMoves.includes(square)) {
        makeMove(gameState.selectedSquare, square);
      } else if (piece && piece.color === gameState.turn) {
        selectSquare(square);
      } else {
        setGameState(prev => ({
          ...prev,
          selectedSquare: null,
          validMoves: [],
        }));
      }
    } else if (piece && piece.color === gameState.turn) {
      selectSquare(square);
    }
  };

  const selectSquare = (square: Square) => {
    const validMoves = getValidMoves(gameState.board, square, gameState);
    setGameState(prev => ({
      ...prev,
      selectedSquare: square,
      validMoves,
    }));
  };

  const makeMove = async (from: Square, to: Square) => {
    const fromPos = squareToPosition(from);
    const toPos = squareToPosition(to);
    const piece = gameState.board[fromPos.row][fromPos.col];
    if (!piece) return;

    const capturedPiece = gameState.board[toPos.row][toPos.col];
    const newBoard = gameState.board.map(row => [...row]);

    newBoard[toPos.row][toPos.col] = piece;
    newBoard[fromPos.row][fromPos.col] = null;

    const move: Move = {
      from, to, piece,
      capturedPiece: capturedPiece || undefined,
      notation: getMoveNotation({ from, to, piece, capturedPiece }, gameState.board),
    };

    const newTurn = gameState.turn === 'white' ? 'black' : 'white';
    const isCheck = isKingInCheck(newBoard, newTurn);

    const newGameState: GameState = {
      ...gameState,
      board: newBoard,
      turn: newTurn,
      selectedSquare: null,
      validMoves: [],
      moveHistory: [...gameState.moveHistory, move],
      check: isCheck,
      checkmate: false,
      stalemate: false,
    };

    if (isCheck) {
      newGameState.checkmate = isCheckmate(newBoard, newTurn, newGameState);
    }

    setGameState(newGameState);
    setLastMove({ from, to });
    setCurrentHint(null);
  };

  return (
    <div className="page-container">
      <header>
        <h1 className="header-title">Chess with AI Tutor</h1>
        <p className="header-subtitle">
          Learn and improve your chess skills with real-time guidance
        </p>
      </header>

      <div className="main-grid">
        <div style={{ textAlign: "center" }}>
          <ChessBoard
            board={gameState.board}
            selectedSquare={gameState.selectedSquare}
            validMoves={gameState.validMoves}
            onSquareClick={handleSquareClick}
            lastMove={lastMove}
          />

          {gameState.checkmate && (
            <div
              style={{
                marginTop: "20px",
                padding: "16px",
                borderRadius: "10px",
                background: "linear-gradient(to right, #f59e0b, #ea580c)",
                color: "white",
                boxShadow: "0px 4px 12px rgba(0,0,0,.4)",
              }}
            >
              <h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Checkmate!</h2>
              <p>
                {gameState.turn === 'white' ? 'Black' : 'White'} wins!
              </p>
            </div>
          )}
        </div>

        <div>
          <AITutor
            gameState={gameState}
            onRequestHint={() => setCurrentHint(generateHint(gameState))}
            currentHint={currentHint}
          />

          <MoveHistory
            moves={gameState.moveHistory}
            onNewGame={() => window.location.reload()}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
