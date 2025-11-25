import React, { useState } from "react";
import { Lightbulb, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import type { GameState, AIHint } from "../types/chess";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";


interface AITutorProps {
  gameState: GameState;
  onRequestHint: () => void;
  currentHint: AIHint | null;
  isLoading: boolean; // ← MUST be here
}

export function AITutor({
  gameState,
  onRequestHint,
  currentHint,
  isLoading
}: AITutorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className="card">
      {/* HEADER */}
      <div
        className="card-header-blue"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <BookOpen size={24} />
          <h2 style={{ fontSize: "1.2rem", fontWeight: "bold" }}>
             Chess Tutor
          </h2>
        </div>
        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
      </div>

      {isExpanded && (
        <div style={{ padding: "16px" }}>
          {/* GPT HINT */}
          {currentHint && (
            <div className="hint-box">
              <div style={{ display: "flex", gap: "12px" }}>
                <Lightbulb size={20} />
                <div>
                  <p className="hint-title">Hint</p>
                  
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {currentHint.suggestion}
                    </ReactMarkdown>

                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {currentHint.explanation}
                    </ReactMarkdown>



                </div>
              </div>
            </div>
          )}

          {/* GET HINT BUTTON */}
          <button
            onClick={onRequestHint}
            disabled={isLoading || gameState.checkmate || gameState.stalemate}
            className={
              gameState.checkmate || gameState.stalemate
                ? "btn-disabled btn-blue"
                : "btn-blue"
            }
          >
            <Lightbulb size={20} />
            {isLoading ? "Thinking..." : "Get Hint"}
          </button>

          {/* QUICK TIPS (STATIC) */}
          <div
            style={{
              borderTop: "1px solid #ddd",
              marginTop: "16px",
              paddingTop: "16px",
            }}
          >
            {/* <h3 className="quicktips-title">Quick Tips</h3>
            <ul className="quicktips-list">
              <li>• Control the center squares</li>
              <li>• Develop knights before bishops</li>
              <li>• Castle early for king safety</li>
              <li>• Avoid moving the same piece twice early</li>
              <li>• Always consider opponent threats</li>
            </ul> */}
          </div>

          {/* STATS */}
          <div className="stats-box" style={{ marginTop: "12px" }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "0.9rem",
              }}
            >
              <span>Moves played:</span>
              <strong>{Math.floor(gameState.moveHistory.length / 2) + 1}</strong>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "4px",
                fontSize: "0.9rem",
              }}
            >
              <span>Current turn:</span>
              <strong style={{ textTransform: "capitalize" }}>
                {gameState.turn}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
