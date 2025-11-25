import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import stockfish from "stockfish";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// -----------------------------
// SETUP ENGINES
// -----------------------------
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const engine = stockfish();

// Initialize Stockfish
engine.postMessage("uci");
engine.postMessage("isready");

function runStockfish(fen) {
  return new Promise(resolve => {
    let best = "";
    let evalScore = 0;

    engine.onmessage = (line) => {
      if (line.includes("score cp")) {
        // parse evaluation
        const parts = line.split("score cp ");
        if (parts[1]) {
          evalScore = parseInt(parts[1].split(" ")[0], 10) / 100;
        }
      }

      if (line.includes("bestmove")) {
        best = line.split("bestmove ")[1].split(" ")[0];
        resolve({ best, eval: evalScore });
      }
    };

    engine.postMessage(`position fen ${fen}`);
    engine.postMessage("go depth 14");
  });
}

// -----------------------------
// GPT PROMPT BUILDER
// -----------------------------
function buildPrompt(gameState, engineData) {
  return `
You are a world-class chess coach (2800 Elo), famous for extremely clear, friendly teaching.

You **MUST NOT** contradict the engine's tactical choice.

---

### ENGINE RESULTS:
- Best move: **${engineData.best}**
- Eval: **${engineData.eval}**
- Move history: ${gameState.moveHistory.map(m => m.notation).join(", ")}

---

### TASKS:
1. **Evaluate the player's last move**
   - Was it good, bad, inaccurate, or excellent?
   - ALWAYS mention it with **bold highlights** and at least one emoji.
   - If incorrect, explain why.

2. **Recommend the correct move**
   - Use SAN notation when possible.
   - ALWAYS include **bold** and emojis.

3. **Give a long, friendly, readable explanation (150–200 words)**
   - Long-term plans for BOTH sides
   - Tactical motifs
   - Positional ideas
   - Structure plans (pawn breaks, center control)
   - Why the engine move is correct
   - Use bold text + emojis (🔥♟️⚠️✨📘💡)

4. **Never give engine lines**
   - No long move sequences.
   - No numeric evals (other than natural-language commentary).

---

Return JSON:
{
  "suggestion": "<short strong recommendation>",
  "explanation": "<long friendly explanation>"
}
`;
}

// -----------------------------
// API ROUTE
// -----------------------------
app.post("/api/hhint", async (req, res) => {
  try {
    const { gameState, fen } = req.body;

    // 1) Get engine calculation
    const engineData = await runStockfish(fen);

    // 2) Build GPT request
    const gptResponse = await client.chat.completions.create({
      model: "gpt-4o", // HIGH QUALITY MODEL
      messages: [
        {
          role: "user",
          content: buildPrompt(gameState, engineData),
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(gptResponse.choices[0].message.content);
    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Hybrid engine failed" });
  }
});

app.listen(3001, () => console.log("Hybrid Chess AI server running on port 3001"));
