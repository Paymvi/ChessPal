import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import stockfish from "stockfish";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// ---------------------------------------------------
// INITIALIZE GPT + STOCKFISH
// ---------------------------------------------------
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const engine = stockfish();

engine.postMessage("uci");
engine.postMessage("isready");

function runStockfish(fen) {
  return new Promise((resolve) => {
    let bestMove = "";
    let evalScore = 0;

    engine.onmessage = (line) => {
      // Extract eval score
      if (line.includes("score cp")) {
        const score = line.split("score cp ")[1];
        if (score) {
          evalScore = parseInt(score.split(" ")[0], 10) / 100;
        }
      }

      // Extract best move
      if (line.includes("bestmove")) {
        bestMove = line.split("bestmove ")[1].split(" ")[0];
        resolve({ bestMove, eval: evalScore });
      }
    };

    engine.postMessage(`position fen ${fen}`);
    engine.postMessage("go depth 20"); // STRONG
  });
}

// ---------------------------------------------------
// Convert UCI -> SAN using Stockfish
// ---------------------------------------------------
function convertUCItoSAN(fen, uciMove) {
  return new Promise((resolve) => {
    let san = null;

    const handler = (line) => {
      if (line.includes("Legal moves:")) {
        const moves = line.split("Legal moves:")[1].trim().split(" ");
        for (const m of moves) {
          const [uci, notation] = m.split(":");
          if (uci === uciMove) {
            san = notation;
            engine.removeEventListener("message", handler);
            resolve(san);
          }
        }
      }
    };

    engine.addEventListener("message", handler);

    engine.postMessage(`position fen ${fen}`);
    engine.postMessage("d");
  });
}


// ---------------------------------------------------
// PROMPT BUILDER
// ---------------------------------------------------
function buildPrompt(gameState, fen, sanMove, lastMoveSAN) {
  return `
You are a world-class chess coach (2800+ Elo).  
Your #1 rule: **ALWAYS obey engine tactics.**  
Never contradict a forcing line, capture, tactic, or hanging piece detection.  
Never offer “strategic” ideas when a forcing tactic is available.

-----------------------------
POSITION INFO
-----------------------------
FEN: ${fen}
Engine best move (SAN): **${sanMove}**
Player’s last move: **${lastMoveSAN}**
Move history: ${gameState.moveHistory.map(m => m.notation).join(", ")}

-----------------------------
WHAT YOU MUST DO
-----------------------------

### 1. Evaluate the player’s last move
- Use one of these labels: **Blunder**, **Mistake**, **Inaccuracy**, **Good**, **Excellent**  
- Always give a *tactical* reason (e.g. “missed pawn capture”, “left a piece hanging”, “ignored forcing move”).  
- Use at least 1 emoji.  
- Keep it factual, concise, non-fluffy.

### 2. Recommend the engine move (**${sanMove}**)
- State clearly *why* the engine prefers it.  
- Emphasize the tactical reason: winning material, preventing loss, gaining tempo, forcing sequence, exploiting a pin, etc.  
- Keep this section tight and logical.

### 3. Explain the position (8–12 sentences MAX)
- Explain key tactical motifs only (pins, forks, discovered attacks, undefended pieces, forcing captures).  
- Include *only* the relevant positional ideas (development, center control) but **no long-term speculative plans**.  
- Use **clear, simple language**, minimal fluff.  
- Include 1–3 emojis (no more).

### HARD RULES
- ❌ No long variations  
- ❌ No engine-style evaluation numbers  
- ❌ No fictional “later ideas” unless directly tied to tactics  
- ❌ No soft storytelling or filler  
- ✔️ Short, direct, tactical, factual  
- ✔️ JSON output only

-----------------------------
Return JSON ONLY:
{
  "suggestion": "<short recommendation including SAN move>",
  "explanation": "<clear tactical explanation, 8–12 sentences>"
}
  `;
}


// ---------------------------------------------------
// API ROUTE
// ---------------------------------------------------
app.post("/api/hhint", async (req, res) => {
  try {
    const { gameState, fen } = req.body;

    // 1) Run Stockfish
    const engineData = await runStockfish(fen);

    // 2) Convert best move to SAN
    const sanMove = await convertUCItoSAN(fen, engineData.bestMove);

    // 3) Build GPT prompt
    const prompt = buildPrompt(gameState, fen, sanMove);

    // 4) Ask GPT
    const gptResponse = await client.chat.completions.create({
      model: "gpt-4o", // high accuracy
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const json = JSON.parse(gptResponse.choices[0].message.content);
    res.json(json);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Hybrid engine failed" });
  }
});

// ---------------------------------------------------
app.listen(3001, () =>
  console.log("🔥 Hybrid Chess AI server running on port 3001")
);
