// src/App.tsx
import React, { useState, useEffect } from "react";
import { ChessBoard } from "./components/ChessBoard";
import { AITutor } from "./components/AITutor";
import { MoveHistory } from "./components/MoveHistory";

import type { GameState, Move, Square, AIHint, Piece } from "./types/chess";

import {
  initializeBoard,
  getValidMoves,
  squareToPosition,
  isKingInCheck,
  isCheckmate,
  getMoveNotation,
} from "./utils/chessLogic";

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
  // INITIAL SETUP
  // -------------------------------------------------------------
  useEffect(() => {}, []);

  // -------------------------------------------------------------
  // BOARD INTERACTION
  // -------------------------------------------------------------
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
        setGameState((prev) => ({
          ...prev,
          selectedSquare: null,
          validMoves: [],
        }));
      }
    } else {
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
  // MAKING MOVES — FIXED & CLEAN
  // -------------------------------------------------------------
  const makeMove = (from: Square, to: Square) => {
    const fromPos = squareToPosition(from);
    const toPos = squareToPosition(to);

    const piece = gameState.board[fromPos.row][fromPos.col];
    if (!piece) return;

    const capturedPiece = gameState.board[toPos.row][toPos.col];

    // Copy board correctly
    const newBoard = gameState.board.map((r) => [...r]);
    newBoard[toPos.row][toPos.col] = piece;
    newBoard[fromPos.row][fromPos.col] = null;

    // TEMP move typed as full Move so notation works
    const fakeMove: Move = {
      from,
      to,
      piece,
      capturedPiece: capturedPiece ?? undefined,
      notation: "", // required placeholder
    };

    const notation = getMoveNotation(fakeMove, gameState.board);

    const move: Move = {
      ...fakeMove,
      notation,
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
  // REQUEST GPT HINT + ENGINE
  // -------------------------------------------------------------
  const handleRequestHint = async () => {
    try {
      setHintLoading(true);
      setCurrentHint(null);

      const fen = boardToFEN(gameState.board, gameState.turn);

      const response = await fetch("http://localhost:3001/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameState,
          fen,
        }),
      });

      const data = await response.json();
      setCurrentHint({
        suggestion: data.suggestion,
        explanation: data.explanation,
      });
    } catch (err) {
      console.error(err);
      setCurrentHint({
        suggestion: "Error",
        explanation: "The AI tutor could not load. Try again.",
      });
    } finally {
      setHintLoading(false);
    }
  };

  // -------------------------------------------------------------
  // FEN BUILDER
  // -------------------------------------------------------------
  function boardToFEN(board: (Piece | null)[][], turn: "white" | "black") {
    let fen = "";

    for (let row = 0; row < 8; row++) {
      let empty = 0;

      for (let col = 0; col < 8; col++) {
        const piece = board[row][col];

        if (!piece) {
          empty++;
        } else {
          if (empty > 0) {
            fen += empty;
            empty = 0;
          }
          const letter = piece.type[0];
          fen += piece.color === "white" ? letter.toUpperCase() : letter;
        }
      }

      if (empty > 0) fen += empty;
      if (row < 7) fen += "/";
    }

    fen += turn === "white" ? " w" : " b";
    fen += " - - 0 1";
    return fen;
  }

  // -------------------------------------------------------------
  // RENDER
  // -------------------------------------------------------------
  return (
    <div className="page-container">
      <header>
        <h1 className="header-title">Chess with Built-In Tutor</h1>
        <p className="header-subtitle">Learn and improve your chess skills with real-time guidance</p>
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
                boxShadow: "0px 4px 12px rgba(0,0,0,0.4)",
              }}
            >
              <h2 style={{ fontSize: "1.5rem", fontWeight: "bold" }}>Checkmate!</h2>
              <p>{gameState.turn === "white" ? "Black" : "White"} wins!</p>
            </div>
          )}
        </div>

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
