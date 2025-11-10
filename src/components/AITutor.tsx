import React, { useState } from 'react';
import { Lightbulb, ChevronDown, ChevronUp, BookOpen, Target } from 'lucide-react';
import type { GameState, AIHint } from '../types/chess';

interface AITutorProps {
  gameState: GameState;
  onRequestHint: () => void;
  currentHint: AIHint | null;
}

export function AITutor({ gameState, onRequestHint, currentHint }: AITutorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const getPositionAdvice = () => {
    if (gameState.checkmate) {
      return {
        type: 'warning',
        title: 'Checkmate!',
        message: 'The game is over. Start a new game to continue learning!'
      };
    }

    if (gameState.check) {
      return {
        type: 'danger',
        title: 'Check!',
        message: 'Your king is under attack. You must move your king to safety, block the attack, or capture the attacking piece.'
      };
    }

    const moveCount = gameState.moveHistory.length;
    if (moveCount < 4) {
      return {
        type: 'info',
        title: 'Opening Phase',
        message: 'Focus on controlling the center, developing your pieces, and castling early for king safety.'
      };
    }

    if (moveCount < 20) {
      return {
        type: 'info',
        title: 'Middle Game',
        message: 'Look for tactical opportunities, coordinate your pieces, and consider pawn structure.'
      };
    }

    return {
      type: 'info',
      title: 'End Game',
      message: 'Activate your king, push passed pawns, and coordinate your pieces for checkmate.'
    };
  };

  const advice = getPositionAdvice();

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div
        className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6" />
          <h2 className="text-xl font-bold">AI Chess Tutor</h2>
        </div>
        {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          <div
            className={`p-4 rounded-lg border-l-4 ${
              advice.type === 'danger'
                ? 'bg-red-50 border-red-500'
                : advice.type === 'warning'
                ? 'bg-yellow-50 border-yellow-500'
                : 'bg-blue-50 border-blue-500'
            }`}
          >
            <div className="flex items-start gap-3">
              <Target className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                advice.type === 'danger'
                  ? 'text-red-600'
                  : advice.type === 'warning'
                  ? 'text-yellow-600'
                  : 'text-blue-600'
              }`} />
              <div>
                <h3 className={`font-semibold mb-1 ${
                  advice.type === 'danger'
                    ? 'text-red-900'
                    : advice.type === 'warning'
                    ? 'text-yellow-900'
                    : 'text-blue-900'
                }`}>
                  {advice.title}
                </h3>
                <p className={`text-sm ${
                  advice.type === 'danger'
                    ? 'text-red-800'
                    : advice.type === 'warning'
                    ? 'text-yellow-800'
                    : 'text-blue-800'
                }`}>
                  {advice.message}
                </p>
              </div>
            </div>
          </div>

          {currentHint && (
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-semibold text-green-900 mb-1">Hint</h3>
                  <p className="text-sm text-green-800 mb-2">{currentHint.suggestion}</p>
                  <p className="text-xs text-green-700">{currentHint.explanation}</p>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={onRequestHint}
            disabled={gameState.checkmate || gameState.stalemate}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Lightbulb className="w-5 h-5" />
            Get Hint
          </button>

          <div className="border-t pt-4 space-y-2">
            <h3 className="font-semibold text-gray-800 text-sm">Quick Tips</h3>
            <ul className="text-xs text-gray-600 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Control the center squares (e4, d4, e5, d5)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Develop knights before bishops</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Castle early to protect your king</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Don't move the same piece twice in the opening</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 font-bold">•</span>
                <span>Think about your opponent's threats</span>
              </li>
            </ul>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Moves played:</span>
              <span className="font-semibold text-gray-800">{Math.floor(gameState.moveHistory.length / 2) + 1}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Current turn:</span>
              <span className="font-semibold text-gray-800 capitalize">{gameState.turn}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
