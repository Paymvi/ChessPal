import { History, RotateCcw } from 'lucide-react';
import type { Move } from '../types/chess';

interface MoveHistoryProps {
  moves: Move[];
  onNewGame: () => void;
}

export function MoveHistory({ moves, onNewGame }: MoveHistoryProps) {
  const grouped: [Move, Move | null][] = [];
  for (let i = 0; i < moves.length; i += 2) {
    grouped.push([moves[i], moves[i + 1] || null]);
  }

  return (
    <div className="move-card">
      {/* HEADER */}
      <div className="move-header">
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <History size={22} />
          <h2>Move History</h2>
        </div>

        <button className="move-reset-btn" onClick={onNewGame}>
          <RotateCcw size={16} />
          New Game
        </button>
      </div>

      {/* BODY */}
      <div className="move-body">
        {moves.length === 0 ? (
          <p className="move-empty">No moves yet. Make your first move!</p>
        ) : (
          <div className="move-list">
            {grouped.map(([wm, bm], idx) => (
              <div key={idx} className="move-row">
                <span className="move-number">{idx + 1}.</span>
                <span className="move-text">{wm.notation}</span>
                <span className="move-text">{bm?.notation || ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
