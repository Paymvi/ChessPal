import type { GameState, AIHint, Piece, Square } from '../types/chess';
import { getValidMoves, squareToPosition, positionToSquare } from './chessLogic';

export function generateHint(gameState: GameState): AIHint {
  if (gameState.check) {
    return {
      suggestion: 'Your king is in check!',
      explanation: 'You must immediately address the threat. Move your king to safety, block the attacking piece, or capture it.',
    };
  }

  const board = gameState.board;
  const turn = gameState.turn;

  const threatenedPieces = findThreatenedPieces(board, turn, gameState);
  if (threatenedPieces.length > 0) {
    const piece = threatenedPieces[0];
    return {
      suggestion: `Your ${piece.piece.type} on ${piece.square} is under attack!`,
      explanation: 'Consider moving this piece to safety or defending it with another piece.',
      recommendedMove: findSafeSquare(board, piece.square, gameState),
    };
  }

  const captureOpportunities = findCaptureOpportunities(board, turn, gameState);
  if (captureOpportunities.length > 0) {
    const opportunity = captureOpportunities[0];
    return {
      suggestion: `You can capture the ${opportunity.targetPiece.type}!`,
      explanation: `Move your ${opportunity.attackingPiece.type} from ${opportunity.from} to ${opportunity.to} to capture the opponent's piece.`,
      recommendedMove: { from: opportunity.from, to: opportunity.to },
    };
  }

  const developmentMoves = findDevelopmentMoves(board, turn, gameState);
  if (developmentMoves.length > 0) {
    const move = developmentMoves[0];
    return {
      suggestion: 'Develop your pieces',
      explanation: `Consider developing your ${move.piece.type} to a more active square. Control the center and prepare to castle.`,
      recommendedMove: { from: move.from, to: move.to },
    };
  }

  const centerMoves = findCenterControlMoves(board, turn, gameState);
  if (centerMoves.length > 0) {
    const move = centerMoves[0];
    return {
      suggestion: 'Control the center',
      explanation: 'Moving pieces to or controlling the center squares (e4, d4, e5, d5) gives you more space and options.',
      recommendedMove: { from: move.from, to: move.to },
    };
  }

  return {
    suggestion: 'Think strategically',
    explanation: 'Look for ways to improve your piece positions, control key squares, and create threats against your opponent.',
  };
}

function findThreatenedPieces(
  board: (Piece | null)[][],
  color: Piece['color'],
  gameState: GameState
): Array<{ square: Square; piece: Piece }> {
  const threatened: Array<{ square: Square; piece: Piece }> = [];
  const opponentColor = color === 'white' ? 'black' : 'white';

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color && piece.type !== 'king') {
        const square = positionToSquare({ row, col });

        for (let r = 0; r < 8; r++) {
          for (let c = 0; c < 8; c++) {
            const opponentPiece = board[r][c];
            if (opponentPiece && opponentPiece.color === opponentColor) {
              const opponentSquare = positionToSquare({ row: r, col: c });
              const moves = getValidMoves(board, opponentSquare, gameState);
              if (moves.includes(square)) {
                threatened.push({ square, piece });
                break;
              }
            }
          }
        }
      }
    }
  }

  return threatened;
}

function findSafeSquare(
  board: (Piece | null)[][],
  square: Square,
  gameState: GameState
): { from: Square; to: Square } | undefined {
  const moves = getValidMoves(board, square, gameState);
  if (moves.length > 0) {
    return { from: square, to: moves[0] };
  }
  return undefined;
}

function findCaptureOpportunities(
  board: (Piece | null)[][],
  color: Piece['color'],
  gameState: GameState
): Array<{
  from: Square;
  to: Square;
  attackingPiece: Piece;
  targetPiece: Piece;
}> {
  const opportunities: Array<{
    from: Square;
    to: Square;
    attackingPiece: Piece;
    targetPiece: Piece;
  }> = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        const square = positionToSquare({ row, col });
        const moves = getValidMoves(board, square, gameState);

        for (const move of moves) {
          const pos = squareToPosition(move);
          const targetPiece = board[pos.row][pos.col];
          if (targetPiece && targetPiece.color !== color) {
            opportunities.push({
              from: square,
              to: move,
              attackingPiece: piece,
              targetPiece,
            });
          }
        }
      }
    }
  }

  opportunities.sort((a, b) => {
    const valueA = getPieceValue(a.targetPiece.type);
    const valueB = getPieceValue(b.targetPiece.type);
    return valueB - valueA;
  });

  return opportunities;
}

function findDevelopmentMoves(
  board: (Piece | null)[][],
  color: Piece['color'],
  gameState: GameState
): Array<{ from: Square; to: Square; piece: Piece }> {
  const moves: Array<{ from: Square; to: Square; piece: Piece }> = [];
  const backRank = color === 'white' ? 7 : 0;

  for (let col = 0; col < 8; col++) {
    const piece = board[backRank][col];
    if (piece && piece.color === color && (piece.type === 'knight' || piece.type === 'bishop')) {
      const square = positionToSquare({ row: backRank, col });
      const validMoves = getValidMoves(board, square, gameState);
      if (validMoves.length > 0) {
        moves.push({ from: square, to: validMoves[0], piece });
      }
    }
  }

  return moves;
}

function findCenterControlMoves(
  board: (Piece | null)[][],
  color: Piece['color'],
  gameState: GameState
): Array<{ from: Square; to: Square; piece: Piece }> {
  const centerSquares = ['e4', 'd4', 'e5', 'd5'];
  const moves: Array<{ from: Square; to: Square; piece: Piece }> = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.color === color) {
        const square = positionToSquare({ row, col });
        const validMoves = getValidMoves(board, square, gameState);

        for (const move of validMoves) {
          if (centerSquares.includes(move)) {
            moves.push({ from: square, to: move, piece });
          }
        }
      }
    }
  }

  return moves;
}

function getPieceValue(type: Piece['type']): number {
  const values: Record<Piece['type'], number> = {
    pawn: 1,
    knight: 3,
    bishop: 3,
    rook: 5,
    queen: 9,
    king: 0,
  };
  return values[type];
}
