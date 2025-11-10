import React from 'react';
import { History, RotateCcw } from 'lucide-react';
import type { Move } from '../types/chess';

interface MoveHistoryProps {
  moves: Move[];
  onNewGame: () => void;
}

export function MoveHistory({ moves, onNewGame }: MoveHistoryProps) {
  const groupedMoves: [Move, Move | null][] = [];

  for (let i = 0; i < moves.length; i += 2) {
    groupedMoves.push([moves[i], moves[i + 1] || null]);
  }

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <History className="w-6 h-6" />
          <h2 className="text-xl font-bold">Move History</h2>
        </div>
        <button
          onClick={onNewGame}
          className="bg-white text-gray-800 hover:bg-gray-100 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          New Game
        </button>
      </div>

      <div className="p-4">
        {moves.length === 0 ? (
          <p className="text-gray-500 text-center py-8 text-sm">No moves yet. Make your first move!</p>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <div className="space-y-1">
              {groupedMoves.map(([whiteMove, blackMove], index) => (
                <div
                  key={index}
                  className="grid grid-cols-[auto_1fr_1fr] gap-3 py-2 px-3 hover:bg-gray-50 rounded transition-colors"
                >
                  <span className="text-gray-500 font-semibold text-sm">{index + 1}.</span>
                  <span className="font-mono text-sm font-medium text-gray-800">
                    {whiteMove.notation}
                  </span>
                  <span className="font-mono text-sm font-medium text-gray-800">
                    {blackMove?.notation || ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
