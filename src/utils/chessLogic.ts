import type { Piece, PieceColor, Position, Square, GameState, Move } from '../types/chess';

export function squareToPosition(square: Square): Position {
  const col = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const row = 8 - parseInt(square[1]);
  return { row, col };
}

export function positionToSquare(pos: Position): Square {
  const col = String.fromCharCode('a'.charCodeAt(0) + pos.col);
  const row = (8 - pos.row).toString();
  return col + row;
}

export function initializeBoard(): (Piece | null)[][] {
  const board: (Piece | null)[][] = Array(8).fill(null).map(() => Array(8).fill(null));

  const backRow: Piece['type'][] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

  for (let col = 0; col < 8; col++) {
    board[0][col] = { type: backRow[col], color: 'black' };
    board[1][col] = { type: 'pawn', color: 'black' };
    board[6][col] = { type: 'pawn', color: 'white' };
    board[7][col] = { type: backRow[col], color: 'white' };
  }

  return board;
}

export function isValidMove(
  board: (Piece | null)[][],
  from: Position,
  to: Position,
  piece: Piece,
  gameState: GameState
): boolean {
  if (to.row < 0 || to.row > 7 || to.col < 0 || to.col > 7) return false;

  const targetPiece = board[to.row][to.col];
  if (targetPiece && targetPiece.color === piece.color) return false;

  const rowDiff = to.row - from.row;
  const colDiff = to.col - from.col;
  const absRowDiff = Math.abs(rowDiff);
  const absColDiff = Math.abs(colDiff);

  switch (piece.type) {
    case 'pawn':
      return isValidPawnMove(board, from, to, piece, gameState);
    case 'knight':
      return (absRowDiff === 2 && absColDiff === 1) || (absRowDiff === 1 && absColDiff === 2);
    case 'bishop':
      return absRowDiff === absColDiff && isPathClear(board, from, to);
    case 'rook':
      return (rowDiff === 0 || colDiff === 0) && isPathClear(board, from, to);
    case 'queen':
      return (absRowDiff === absColDiff || rowDiff === 0 || colDiff === 0) && isPathClear(board, from, to);
    case 'king':
      return absRowDiff <= 1 && absColDiff <= 1;
    default:
      return false;
  }
}

function isValidPawnMove(
  board: (Piece | null)[][],
  from: Position,
  to: Position,
  piece: Piece,
  gameState: GameState
): boolean {
  const direction = piece.color === 'white' ? -1 : 1;
  const startRow = piece.color === 'white' ? 6 : 1;
  const rowDiff = to.row - from.row;
  const colDiff = Math.abs(to.col - from.col);

  if (colDiff === 0) {
    if (rowDiff === direction && !board[to.row][to.col]) {
      return true;
    }
    if (from.row === startRow && rowDiff === 2 * direction &&
        !board[to.row][to.col] && !board[from.row + direction][from.col]) {
      return true;
    }
  }

  if (colDiff === 1 && rowDiff === direction) {
    if (board[to.row][to.col] && board[to.row][to.col]!.color !== piece.color) {
      return true;
    }
    if (gameState.enPassant === positionToSquare(to)) {
      return true;
    }
  }

  return false;
}

function isPathClear(board: (Piece | null)[][], from: Position, to: Position): boolean {
  const rowDir = Math.sign(to.row - from.row);
  const colDir = Math.sign(to.col - from.col);

  let currentRow = from.row + rowDir;
  let currentCol = from.col + colDir;

  while (currentRow !== to.row || currentCol !== to.col) {
    if (board[currentRow][currentCol]) return false;
    currentRow += rowDir;
    currentCol += colDir;
  }

  return true;
}

export function getValidMoves(
  board: (Piece | null)[][],
  square: Square,
  gameState: GameState
): Square[] {
  const from = squareToPosition(square);
  const piece = board[from.row][from.col];

  if (!piece) return [];

  const validMoves: Square[] = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const to = { row, col };
      if (isValidMove(board, from, to, piece, gameState)) {
        const testBoard = board.map(row => [...row]);
        testBoard[to.row][to.col] = piece;
        testBoard[from.row][from.col] = null;

        if (!isKingInCheck(testBoard, piece.color)) {
          validMoves.push(positionToSquare(to));
        }
      }
    }
  }

  return validMoves;
}

function findKing(board: (Piece | null)[][], color: PieceColor): Position | null {
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'king' && piece.color === color) {
        return { row, col };
      }
    }
  }
  return null;
}

export function isKingInCheck(board: (Piece | null)[][], color: PieceColor): boolean {
  const kingPos = findKing(board, color);
  if (!kingPos) return false;

  const opponentColor = color === 'white' ? 'black' : 'white';

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === opponentColor) {
        const from = { row, col };
        if (piece.type === 'pawn') {
          const direction = piece.color === 'white' ? -1 : 1;
          if (Math.abs(kingPos.col - col) === 1 && kingPos.row - row === direction) {
            return true;
          }
        } else {
          const dummyGameState: GameState = {
            board,
            turn: opponentColor,
            selectedSquare: null,
            validMoves: [],
            moveHistory: [],
            castling: {
              white: { kingSide: true, queenSide: true },
              black: { kingSide: true, queenSide: true }
            },
            enPassant: null,
            check: false,
            checkmate: false,
            stalemate: false
          };

          if (isValidMove(board, from, kingPos, piece, dummyGameState)) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

export function isCheckmate(board: (Piece | null)[][], color: PieceColor, gameState: GameState): boolean {
  if (!isKingInCheck(board, color)) return false;

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        const square = positionToSquare({ row, col });
        const moves = getValidMoves(board, square, gameState);
        if (moves.length > 0) return false;
      }
    }
  }

  return true;
}

export function getMoveNotation(move: Move, board: (Piece | null)[][]): string {
  const piece = move.piece;
  const from = squareToPosition(move.from);
  const to = squareToPosition(move.to);

  if (piece.type === 'pawn') {
    if (move.capturedPiece) {
      return `${move.from[0]}x${move.to}`;
    }
    return move.to;
  }

  const pieceSymbol = piece.type === 'knight' ? 'N' : piece.type[0].toUpperCase();
  const capture = move.capturedPiece ? 'x' : '';

  return `${pieceSymbol}${capture}${move.to}`;
}
