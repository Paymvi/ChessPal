// src/App.tsx
import { useState, useEffect } from "react";
import { ChessBoard } from "./components/ChessBoard";
import { AITutor } from "./components/AITutor";
import { useAIOpponent } from "./components/AIOpponent";
import { MoveHistory } from "./components/MoveHistory";
import { AudioBtn } from "./components/AudioBtn";

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
  const { aiThinking, getAIMove } = useAIOpponent();
  const [audioEnabled, setAudioEnabled] = useState(false);
  //const [audioTutorEnabled, setAudioTutorEnabled] = useState(false);



  // -------------------------------------------------------------
  // INITIAL SETUP
  // -------------------------------------------------------------
  useEffect(() => {}, []);

  // -------------------------------------------------------------
  // BOARD INTERACTION
  // -------------------------------------------------------------
  const handleSquareClick = (square: Square) => {
    //Prevents the user from moving during AI turn
    if(aiThinking){
      return;
    }
    
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
    console.log("🧩 makeMove() called with:", from, "→", to);
    const fromPos = squareToPosition(from);
    const toPos = squareToPosition(to);
    console.log("   Computed positions:", fromPos, "→", toPos);

    const piece = gameState.board[fromPos.row][fromPos.col];
    console.log("   Piece at from:", piece);

    if (!piece) {
      console.error("❌ No piece found for AI move:", from, "→", to);
      return;
    }

    // Speech functionality announcer
    const text = to;
    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 0.7;

    if(audioEnabled){
      window.speechSynthesis.speak(speech);
    }

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

    const notation = getMoveNotation(fakeMove);

    const move: Move = {
      ...fakeMove,
      notation,
    };

    console.log("Gameboard 1:", gameState.board);

    const newTurn = gameState.turn === "white" ? "black" : "white";
    const inCheck = isKingInCheck(newBoard, newTurn);

    gameState.turn = newTurn;

    console.log("New turn:", gameState.turn);

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

    //gameState.

    gameState.board = newState.board;

    if (inCheck) {
      newState.checkmate = isCheckmate(newBoard, newTurn, newState);
          // Checkmate speech
      if(newState.checkmate){
          if(audioEnabled){
            const text = "Checkmate!";
            const speech = new SpeechSynthesisUtterance(text);
            speech.rate = 0.7;
            window.speechSynthesis.speak(speech);
          }
      }
    }

    if(newTurn === "black" && !newState.checkmate && !newState.stalemate){
      //Add a little delay before the AI opponent moves
      setTimeout(() => 2500);
      triggerAIMove(newState);
    }

    
    setGameState(newState);
    setLastMove({ from, to });
    setCurrentHint(null);
  };

  //Helper function to trigger an AI move
  async function triggerAIMove(state: GameState){
    console.log("Who's turn:", gameState.turn);
    console.log("Gameboard 1:", gameState.board);
    console.log("Gameboard 2:", state.board);
    //console.log("Gameboard 3:", );

    // Do not hardcode the Black opponents turn
    // Hardcoding will cause FEN to think its always Black's turn
    const fen = boardToFEN(state.board, gameState.turn);
    console.log("📤 Sending FEN to AI:", fen);

    const aiMove = await getAIMove(fen);
    console.log("📥 AI responded with:", aiMove);

    if(!aiMove || !aiMove.from || !aiMove.to){
      console.error("❌ Invalid AI move received:", aiMove);
      return;
    }

    console.log("🤖 Applying AI move:", aiMove.from, "→", aiMove.to);
    makeMove(aiMove.from as Square, aiMove.to as Square);
    
  }


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

      console.log("Suggestion: ", data.suggestion);
      // if(audioTutorEnabled){
      //   const textTutor = data.explanation;
      //   const speechTutor = new SpeechSynthesisUtterance(textTutor);
      //   speechTutor.rate = 0.7;
      //   window.speechSynthesis.speak(speechTutor);
      // }

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

          let letter: string;
          switch (piece.type) {
            case "pawn":
              letter = "p";
              break;
            case "rook":
              letter = "r";
              break;
            case "knight":
              letter = "n"; // <- important!
              break;
            case "bishop":
              letter = "b";
              break;
            case "queen":
              letter = "q";
              break;
            case "king":
              letter = "k";
              break;
            default:
              letter = "p";
          }

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
  // AUDIO
  // -------------------------------------------------------------
  function audioToggle(){
    if(audioEnabled){
      setAudioEnabled(false);
    }
    else{
      setAudioEnabled(true);
    }
  }

  // function audioTutorToggle(){
  //   if(audioEnabled){
  //     setAudioTutorEnabled(false);
  //   }
  //   else{
  //     setAudioTutorEnabled(true);
  //   }
  // }

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
        <div style={{ textAlign: "center"}}>
          <ChessBoard
            board={gameState.board}
            selectedSquare={gameState.selectedSquare}
            validMoves={gameState.validMoves}
            onSquareClick={handleSquareClick}
            lastMove={lastMove}
          />

          {aiThinking && (
            <p style={{ marginTop: "10px", fontStyle: "italic", color: "#888"}}>
              AI is thinking...
            </p>
          )}

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

          <div 
            style={{
              paddingTop: "20px",
          }}>
            <AudioBtn
              aEnabled={audioEnabled}
              aToggle={audioToggle}
            />
          </div>

        </div>

        <div>
          <div>
            <AITutor
              gameState={gameState}
              onRequestHint={handleRequestHint}
              currentHint={currentHint}
              isLoading={hintLoading}
            />

            {/* <AudioBtn
              aEnabled={audioTutorEnabled}
              aToggle={audioTutorToggle}
            /> */}
          </div>

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
