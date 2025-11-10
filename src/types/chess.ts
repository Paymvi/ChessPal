export type PieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';
export type PieceColor = 'white' | 'black';
export type Square = string;

export interface Piece {
  type: PieceType;
  color: PieceColor;
}

export interface Position {
  row: number;
  col: number;
}

export interface Move {
  from: Square;
  to: Square;
  piece: Piece;
  capturedPiece?: Piece;
  promotion?: PieceType;
  notation: string;
}

export interface GameState {
  board: (Piece | null)[][];
  turn: PieceColor;
  selectedSquare: Square | null;
  validMoves: Square[];
  moveHistory: Move[];
  castling: {
    white: { kingSide: boolean; queenSide: boolean };
    black: { kingSide: boolean; queenSide: boolean };
  };
  enPassant: Square | null;
  check: boolean;
  checkmate: boolean;
  stalemate: boolean;
}

export interface AIHint {
  suggestion: string;
  explanation: string;
  recommendedMove?: { from: Square; to: Square };
}
