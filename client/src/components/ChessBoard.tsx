import type { Piece, Square } from '../types/chess';
import { positionToSquare } from '../utils/chessLogic';
import numbers from '../assets/NumbersLabel.png';
import letters from '../assets/LettersLabel.png';

// Credit to Bolt for making the Chessboard component

interface ChessBoardProps {
  board: (Piece | null)[][];
  selectedSquare: Square | null;
  validMoves: Square[];
  onSquareClick: (square: Square) => void;
  lastMove?: { from: Square; to: Square } | null;
}

const pieceSymbols: Record<string, string> = {
  "white-king": "♔", "white-queen": "♕", "white-rook": "♖",
  "white-bishop": "♗", "white-knight": "♘", "white-pawn": "♙",
  "black-king": "♚", "black-queen": "♛", "black-rook": "♜",
  "black-bishop": "♝", "black-knight": "♞", "black-pawn": "♟",
};

export function ChessBoard({ board, selectedSquare, validMoves, onSquareClick, lastMove }: ChessBoardProps) {

  const isSquareHighlighted = (sq: Square) => validMoves.includes(sq);
  const isSquareSelected = (sq: Square) => selectedSquare === sq;
  const isLastMove = (sq: Square) =>
    lastMove && (sq === lastMove.from || sq === lastMove.to);

  return (
    <div className="chessboard-wrapper">
      <div className="letters-labels-wrapper">
        <img src={letters}/>
      </div> 
      <div className="numbers-labels-wrapper">
        <img src={numbers}/>
      </div> 
      <div className="board-container">
        <div className="chess-grid">
          {board.map((row, r) =>
            row.map((piece, c) => {
              const square = positionToSquare({ row: r, col: c });
              const isLight = (r + c) % 2 === 0;

              const classes = [
                "chess-square",
                isLight ? "square-light" : "square-dark",
                isSquareSelected(square) ? "square-selected" : "",
                isLastMove(square) ? "square-lastmove" : "",
                isSquareHighlighted(square) && !piece ? "square-highlight" : "",
                isSquareHighlighted(square) && piece ? "square-capture" : "",
              ].join(" ");

              return (
                <button key={square} className={classes} onClick={() => onSquareClick(square)}>
                  {piece && (
                    <span className={piece.color === "white" ? "piece-white" : "piece-black"}>
                      {pieceSymbols[`${piece.color}-${piece.type}`]}
                    </span>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
