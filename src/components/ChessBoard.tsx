import type { Piece, Square } from '../types/chess';
import { positionToSquare } from '../utils/chessLogic';

interface ChessBoardProps {
  board: (Piece | null)[][];
  selectedSquare: Square | null;
  validMoves: Square[];
  onSquareClick: (square: Square) => void;
  lastMove?: { from: Square; to: Square } | null;
}

const pieceSymbols: Record<string, string> = {
  'white-king': '♔',
  'white-queen': '♕',
  'white-rook': '♖',
  'white-bishop': '♗',
  'white-knight': '♘',
  'white-pawn': '♙',
  'black-king': '♚',
  'black-queen': '♛',
  'black-rook': '♜',
  'black-bishop': '♝',
  'black-knight': '♞',
  'black-pawn': '♟',
};

export function ChessBoard({ board, selectedSquare, validMoves, onSquareClick, lastMove }: ChessBoardProps) {

  const isSquareHighlighted = (square: Square) => validMoves.includes(square);
  const isSquareSelected = (square: Square) => selectedSquare === square;
  const isLastMoveSquare = (square: Square) =>
    lastMove && (lastMove.from === square || lastMove.to === square);

  return (
    <div className="inline-block bg-neutral-800 p-4 rounded-lg shadow-2xl">
      <div className="grid grid-cols-8 gap-0 border-2 border-neutral-700">
        {board.map((row, rowIndex) =>
          row.map((piece, colIndex) => {
            const square = positionToSquare({ row: rowIndex, col: colIndex });
            const isLight = (rowIndex + colIndex) % 2 === 0;
            const isSelected = isSquareSelected(square);
            const isHighlighted = isSquareHighlighted(square);
            const isLastMove = isLastMoveSquare(square);

            return (
              <button
                key={square}
                onClick={() => onSquareClick(square)}
                className={`
                  w-16 h-16 relative flex items-center justify-center text-5xl
                  transition-all duration-200 hover:brightness-110
                  ${isLight ? 'bg-amber-100' : 'bg-amber-700'}
                  ${isSelected ? 'ring-4 ring-blue-500 ring-inset' : ''}
                  ${isLastMove ? 'bg-yellow-400 bg-opacity-50' : ''}
                  ${isHighlighted && !piece ? 'after:content-[""] after:w-4 after:h-4 after:bg-green-500 after:rounded-full after:absolute' : ''}
                  ${isHighlighted && piece ? 'ring-4 ring-green-500 ring-inset' : ''}
                `}
              >
                {piece && (
                  <span className={piece.color === 'white' ? 'text-white drop-shadow-md' : 'text-black drop-shadow-md'}>
                    {pieceSymbols[`${piece.color}-${piece.type}`]}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
