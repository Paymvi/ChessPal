// src/App.tsx
import React, { useState, useEffect } from "react";
import { ChessBoard } from "./components/ChessBoard";
import { AITutor } from "./components/AITutor";
import { MoveHistory } from "./components/MoveHistory";

import type { GameState, Move, Square, AIHint } from "./types/chess";

import {
  initializeBoard,
  getValidMoves,
  squareToPosition,
  isKingInCheck,
  isCheckmate,
  getMoveNotation,
} from "./utils/chessLogic";

import { generateHint } from "./utils/aiTutor";

function App() {
  // -------------------------------------------------------------
  // GAME STATE
  // -------------------------------------------------------------
  const [gameState, setGameState] = useState<GameState>({
    board: initializeBoard(),
    turn: "white",
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
  const [lastMove, setLastMove] = useState<{ from: Square; to: Square } | null>(
    null
  );
  const [hintLoading, setHintLoading] = useState(false);

  // -------------------------------------------------------------
  // INITIAL GAME SETUP (placeholder for future Supabase)
  // -------------------------------------------------------------
  useEffect(() => {
    // no-op for now
  }, []);

  // -------------------------------------------------------------
  // BOARD INTERACTIONS
  // -------------------------------------------------------------
  const handleSquareClick = (square: Square) => {
    const pos = squareToPosition(square);
    const piece = gameState.board[pos.row][pos.col];

    if (gameState.checkmate || gameState.stalemate) return;

    if (gameState.selectedSquare) {
      // trying to move selected piece
      if (gameState.validMoves.includes(square)) {
        makeMove(gameState.selectedSquare, square);
      } else if (piece && piece.color === gameState.turn) {
        // select a different piece of the same side
        selectSquare(square);
      } else {
        // deselect
        setGameState((prev) => ({
          ...prev,
          selectedSquare: null,
          validMoves: [],
        }));
      }
    } else {
      // no piece selected yet → select one
      if (piece && piece.color === gameState.turn) {
        selectSquare(square);
      }
    }
  };

  const selectSquare = (square: Square) => {
    const validMoves = getValidMoves(gameState.board, square, gameState);

    setGameState((prev) => ({
      ...prev,
      selectedSquare: square,
      validMoves,
    }));
  };

  // -------------------------------------------------------------
  // MAKING MOVES
  // -------------------------------------------------------------
  const makeMove = (from: Square, to: Square) => {
    const fromPos = squareToPosition(from);
    const toPos = squareToPosition(to);

    const piece = gameState.board[fromPos.row][fromPos.col];
    if (!piece) return;

    const capturedPiece = gameState.board[toPos.row][toPos.col];

    // copy board
    const newBoard = gameState.board.map((row) => [...row]);

    // perform move on board copy
    newBoard[toPos.row][toPos.col] = piece;
    newBoard[fromPos.row][fromPos.col] = null;

    // build Move object with placeholder notation
    let move: Move = {
      from,
      to,
      piece,
      capturedPiece: capturedPiece ?? undefined,
      notation: "",
    };

    // now compute notation using the full move + previous board
    move = {
      ...move,
      notation: getMoveNotation(move, gameState.board),
    };

    const newTurn = gameState.turn === "white" ? "black" : "white";
    const inCheck = isKingInCheck(newBoard, newTurn);

    const newState: GameState = {
      ...gameState,
      board: newBoard,
      turn: newTurn,
      selectedSquare: null,
      validMoves: [],
      moveHistory: [...gameState.moveHistory, move],
      check: inCheck,
      checkmate: false,
      stalemate: false,
    };

    if (inCheck) {
      newState.checkmate = isCheckmate(newBoard, newTurn, newState);
    }

    setGameState(newState);
    setLastMove({ from, to });
    setCurrentHint(null);
  };

  // -------------------------------------------------------------
  // GPT HINT REQUEST
  // -------------------------------------------------------------
  const handleRequestHint = async () => {
    try {
      setHintLoading(true);
      setCurrentHint(null);

      const hint = await generateHint(gameState);
      setCurrentHint(hint);
    } catch (err) {
      console.error("Failed to get hint:", err);
      setCurrentHint({
        suggestion: "Error",
        explanation: "The AI tutor could not load. Try again.",
      });
    } finally {
      setHintLoading(false);
    }
  };

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  return (
    <div className="page-container">
      <header>
        <h1 className="header-title">Chess with AI Tutor</h1>
        <p className="header-subtitle">
          Learn and improve your chess skills with real-time guidance
        </p>
      </header>

      <div className="main-grid">
        {/* LEFT SIDE: BOARD */}
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
                boxShadow: "0px 4px 12px rgba(0, 0, 0, 0.4)",
              }}
            >
              <h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>
                Checkmate!
              </h2>
              <p>{gameState.turn === "white" ? "Black" : "White"} wins!</p>
            </div>
          )}
        </div>

        {/* RIGHT SIDE: TUTOR + HISTORY */}
        <div>
          <AITutor
            gameState={gameState}
            onRequestHint={handleRequestHint}
            currentHint={currentHint}
            isLoading={hintLoading}
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
