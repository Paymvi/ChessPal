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
//import { supabase } from './lib/supabase';

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
    try {
      const { data, error } = await supabase
        .from('chess_games')
        .insert([
          {
            game_state: {
              board: initializeBoard(),
              turn: 'white',
            },
            difficulty: 'intermediate',
            status: 'in_progress',
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('Error creating game:', error);
      } else if (data) {
        setGameId(data.id);
      }
    } catch (err) {
      console.error('Error initializing game:', err);
    }
  };

  const handleSquareClick = (square: Square) => {
    const pos = squareToPosition(square);
    const piece = gameState.board[pos.row][pos.col];

    if (gameState.checkmate || gameState.stalemate) {
      return;
    }

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
    } else if (piece && piece.color === gameState.turn) {
      selectSquare(square);
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

  const makeMove = async (from: Square, to: Square) => {
    const fromPos = squareToPosition(from);
    const toPos = squareToPosition(to);
    const piece = gameState.board[fromPos.row][fromPos.col];

    if (!piece) return;

    const capturedPiece = gameState.board[toPos.row][toPos.col];

    const newBoard = gameState.board.map((row) => [...row]);
    newBoard[toPos.row][toPos.col] = piece;
    newBoard[fromPos.row][fromPos.col] = null;

    const move: Move = {
      from,
      to,
      piece,
      capturedPiece: capturedPiece || undefined,
      notation: '',
    };

    move.notation = getMoveNotation(move, gameState.board);

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
      const isCheckmateResult = isCheckmate(newBoard, newTurn, newGameState);
      newGameState.checkmate = isCheckmateResult;
    }

    setGameState(newGameState);
    setLastMove({ from, to });
    setCurrentHint(null);

    if (gameId) {
      try {
        await supabase.from('chess_moves').insert([
          {
            game_id: gameId,
            move_number: gameState.moveHistory.length + 1,
            from_square: from,
            to_square: to,
            piece: piece.type,
            captured_piece: capturedPiece?.type || null,
            notation: move.notation,
          },
        ]);

        await supabase
          .from('chess_games')
          .update({
            game_state: {
              board: newBoard,
              turn: newTurn,
            },
            updated_at: new Date().toISOString(),
            status: newGameState.checkmate ? 'completed' : 'in_progress',
            result: newGameState.checkmate
              ? gameState.turn === 'white'
                ? 'white_wins'
                : 'black_wins'
              : null,
          })
          .eq('id', gameId);
      } catch (err) {
        console.error('Error saving move:', err);
      }
    }
  };

  const handleRequestHint = () => {
    const hint = generateHint(gameState);
    setCurrentHint(hint);
  };

  const handleNewGame = () => {
    const newGameState: GameState = {
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
    };
    setGameState(newGameState);
    setCurrentHint(null);
    setLastMove(null);
    initializeGame();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        <header className="text-center mb-8">
          <h1 className="text-5xl font-bold text-white mb-2">Chess with AI Tutor</h1>
          <p className="text-slate-300 text-lg">Learn and improve your chess skills with real-time guidance</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8 max-w-7xl mx-auto">
          <div className="flex flex-col items-center gap-6">
            <ChessBoard
              board={gameState.board}
              selectedSquare={gameState.selectedSquare}
              validMoves={gameState.validMoves}
              onSquareClick={handleSquareClick}
              lastMove={lastMove}
            />

            {gameState.checkmate && (
              <div className="bg-gradient-to-r from-yellow-500 to-orange-500 text-white px-6 py-4 rounded-lg shadow-lg text-center">
                <h2 className="text-2xl font-bold mb-1">Checkmate!</h2>
                <p className="text-lg">
                  {gameState.turn === 'white' ? 'Black' : 'White'} wins!
                </p>
              </div>
            )}
          </div>

          <div className="space-y-6">
            <AITutor
              gameState={gameState}
              onRequestHint={handleRequestHint}
              currentHint={currentHint}
            />

            <MoveHistory moves={gameState.moveHistory} onNewGame={handleNewGame} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
