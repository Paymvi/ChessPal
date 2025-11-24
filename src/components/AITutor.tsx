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
      return { type: 'warning', title: 'Checkmate!', message: 'Start a new game to continue learning!' };
    }
    if (gameState.check) {
      return { type: 'danger', title: 'Check!', message: 'Your king is under attack — respond immediately.' };
    }

    const moves = gameState.moveHistory.length;

    if (moves < 4) {
      return { type: 'info', title: 'Opening Phase', message: 'Control the center and develop your pieces.' };
    }
    if (moves < 20) {
      return { type: 'info', title: 'Middle Game', message: 'Look for tactics and coordinate your pieces.' };
    }
    return { type: 'info', title: 'End Game', message: 'Activate your king and push passed pawns.' };
  };

  const advice = getPositionAdvice();

  return (
    <div className="card">
      <div className="card-header-blue" onClick={() => setIsExpanded(!isExpanded)}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <BookOpen size={24} />
          <h2 style={{ fontSize: "1.2rem", fontWeight: "bold" }}>AI Chess Tutor</h2>
        </div>
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>

      {isExpanded && (
        <div style={{ padding: "16px" }}>
          {/* Advice Box */}
          <div className={`advice-box advice-${advice.type}`}>
            <div style={{ display: "flex", gap: "12px" }}>
              <Target size={20} />
              <div>
                <h3 style={{ fontWeight: "bold", marginBottom: "4px" }}>{advice.title}</h3>
                <p style={{ fontSize: "0.85rem" }}>{advice.message}</p>
              </div>
            </div>
          </div>

          {/* Hint */}
          {currentHint && (
            <div className="hint-box">
              <div style={{ display: "flex", gap: "12px" }}>
                <Lightbulb size={20} />
                <div>
                  <p className="hint-title">Hint</p>
                  <p style={{ marginBottom: "4px" }}>{currentHint.suggestion}</p>
                  <p className="hint-sub">{currentHint.explanation}</p>
                </div>
              </div>
            </div>
          )}

          {/* Button */}
          <button
            onClick={onRequestHint}
            disabled={gameState.checkmate || gameState.stalemate}
            className={gameState.checkmate ? "btn-disabled btn-blue" : "btn-blue"}
          >
            <Lightbulb size={20} />
            Get Hint
          </button>

          {/* Quick Tips */}
          <div style={{ borderTop: "1px solid #ddd", marginTop: "16px", paddingTop: "16px" }}>
            <h3 className="quicktips-title">Quick Tips</h3>
            <ul className="quicktips-list">
              <li>• Control the center squares</li>
              <li>• Develop knights before bishops</li>
              <li>• Castle early</li>
              <li>• Avoid moving the same piece twice early</li>
              <li>• Always consider opponent threats</li>
            </ul>
          </div>

          {/* Stats */}
          <div className="stats-box" style={{ marginTop: "12px" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span>Moves played:</span>
              <strong>{Math.floor(gameState.moveHistory.length / 2) + 1}</strong>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px" }}>
              <span>Current turn:</span>
              <strong>{gameState.turn}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
