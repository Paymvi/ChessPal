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
function buildPrompt(gameState, fen, sanMove) {
  return `
You are a world-class chess coach (2800+ strength).

You ALWAYS obey tactical truth from the engine.  
You NEVER contradict a forced capture, tactic, hanging piece, or engine-preferred move.

Here is the position:

FEN: **${fen}**
Best engine move (SAN): **${sanMove}**
Move history: ${gameState.moveHistory.map((m) => m.notation).join(", ")}

-------------------------------------
### TASKS

1. **Evaluate the player’s last move**
   - Was it good, bad, inaccurate, brilliant?  
   - ALWAYS include bold text + emojis.  
   - If the last move missed tactics, explain clearly.

2. **Recommend the engine move (SAN)**
   - Clearly show why **${sanMove}** is strongest.  
   - Use bold text and at least 2 emojis.

3. **Give a long (100–180 words) friendly explanation**
   - Long-term plans for BOTH sides  
   - Tactical motifs  
   - Positional ideas (activity, center, pawn structure)  
   - Why the engine move works  
   - No engine-style move lines  
   - No long variations  
   - No numeric evals (summaries allowed)

-------------------------------------
Return JSON ONLY:
{
  "suggestion": "<short recommendation>",
  "explanation": "<long friendly explanation>"
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
