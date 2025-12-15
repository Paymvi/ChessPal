//------------------------------------------------------------
// IMPORTS
//------------------------------------------------------------
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";
import { spawn } from "child_process";

dotenv.config();

//------------------------------------------------------------
// VALIDATE API KEY
//------------------------------------------------------------
if (!process.env.OPENAI_API_KEY) {
  throw new Error("❌ Missing OPENAI_API_KEY in .env");
}

//------------------------------------------------------------
// EXPRESS APP
//------------------------------------------------------------
const app = express();
app.use(cors());
app.use(express.json());

//------------------------------------------------------------
// OPENAI CLIENT
//------------------------------------------------------------
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

//------------------------------------------------------------
// FUNCTION: Spawn a fresh Stockfish engine for each request
//------------------------------------------------------------
function spawnEngine() {
  const engine = spawn("./engine/stockfish.exe"); // <-- Your path

  engine.stdout.setEncoding("utf8");

  engine.listeners = [];

  engine.stdout.on("data", (data) => {
    const lines = data.split("\n");
    lines.forEach((line) => {
      line = line.trim();
      if (line.length === 0) return;

      console.log("[SF]", line);

      // Dispatch line to listeners
      engine.listeners.forEach((fn) => fn(line));
    });
  });

  engine.post = (cmd) => {
    console.log("[SF →]", cmd);
    engine.stdin.write(cmd + "\n");
  };

  engine.onLine = (fn) => {
    engine.listeners.push(fn);
  };

  return engine;
}

//------------------------------------------------------------
// RUN STOCKFISH DEPTH 20 SAFELY
//------------------------------------------------------------
function runStockfish(fen) {
  return new Promise((resolve, reject) => {
    const engine = spawnEngine();
    let bestMove = null;
    let evalScore = 0;

    const handler = (line) => {
      // Extract evaluation score
      if (line.includes("score cp")) {
        const parts = line.split("score cp ");
        if (parts[1]) {
          const score = parseInt(parts[1].split(" ")[0], 10);
          if (!isNaN(score)) evalScore = score / 100;
        }
      }

      // Extract best move
      if (line.startsWith("bestmove")) {
        bestMove = line.split(" ")[1];

        // Remove this handler
        engine.listeners = engine.listeners.filter((fn) => fn !== handler);

        // Kill Stockfish instance
        engine.kill();

        resolve({ bestMove, eval: evalScore });
      }
    };

    engine.onLine(handler);

    engine.post(`position fen ${fen}`);
    engine.post("go depth 20"); // HIGH ACCURACY
  });
}

app.post("/api/ai-move", async (req, res) => {
  try {
    const { fen } = req.body;
    if (!fen) {
      return res.status(400).json({ error: "Missing FEN" });
    }

    console.log("🧠 /api/ai-move FEN:", fen);

    // Correct destructuring: runStockfish returns { bestMove, eval }
    const { bestMove, eval: evalScore } = await runStockfish(fen);

    if (!bestMove) {
      console.error("❌ Stockfish returned no bestMove");
      return res.status(500).json({ error: "No best move from engine" });
    }

    const from = bestMove.slice(0, 2);      // "e2"
    const to = bestMove.slice(2, 4);        // "e4"
    const promotion = bestMove.length === 5 ? bestMove[4] : null;

    console.log("🤖 Engine move:", bestMove, "=>", from, "->", to);

    res.json({
      uci: bestMove,
      from,
      to,
      promotion,
      eval: evalScore,
    });
  } catch (err) {
    console.error("❌ /api/ai-move failed:", err);
    res.status(500).json({ error: "AI move failed" });
  }
});


//------------------------------------------------------------
// GPT — Convert UCI → SAN
//------------------------------------------------------------
async function convertUCItoSAN(fen, uciMove) {
  const reply = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "user",
        content: `
Convert this UCI move into SAN.

FEN: ${fen}
UCI: ${uciMove}

Return ONLY the SAN move.
        `,
      },
    ],
  });

  const raw = reply.choices[0].message.content;
  try {
    return JSON.parse(raw);
  } catch {
    return raw.trim();
  }

}

//------------------------------------------------------------
// PROMPT BUILDER FOR FINAL EXPLANATION
//------------------------------------------------------------
function buildPrompt(gameState, fen, sanMove, lastMoveSAN) {
  return `
You are a world-class chess coach (2800+ Elo).
You MUST always obey Stockfish tactics exactly.
Your tone is **clear, structured, slightly pedagogical, and highly tactical**.
Your output should resemble the following section format:

- **Hint** (1–2 sentences, includes the engine move + 1 emoji)
- **Evaluation of Last Move** (1 paragraph, tactical + 1 emoji)
- **Position Summary** (5–7 sentences, mix of tactical + light strategic context, 1–2 emojis)
- **Tactical Motifs** (short bullet list, 3–6 bullets, tactical only + occasional emoji)

Avoid large paragraphs. Keep the writing crisp, structured, and helpful.

-----------------------------
POSITION INFO
-----------------------------
FEN: ${fen}
Engine best move (SAN): ${sanMove}
Player’s last move: ${lastMoveSAN}
Move history: ${gameState.moveHistory.map(m => m.notation).join(", ")}

-----------------------------
WHAT YOU MUST DO
-----------------------------

### PART 1 — Hint
- Briefly suggest the best move (**${sanMove}**) and why.
- ONE sentence + ONE emoji.

### PART 2 — Evaluation of the player’s last move
- Choose exactly one label: **Blunder**, **Mistake**, **Inaccuracy**, **Good**, or **Excellent**.
- Give a *tactical* explanation for the label (e.g., “missed a forcing capture”, “left a piece hanging”, “ignored a threat”).
- Keep this 2–4 sentences.
- Include exactly ONE emoji.

### PART 3 — Position Summary
- 5–7 sentences.
- Mix tactical motifs with light positional context.
- Keep it concrete: piece activity, threats, pins, forks, pressure, space, king safety.
- DO NOT talk about "long-term plans" unless directly tactical (e.g., “White may castle to neutralize the pressure on f1”).
- Include 1–2 emojis.

### PART 4 — Tactical Motifs
- Provide 3–6 bullets.
- Examples: “knight fork threat”, “pressure on f7”, “weak dark squares”, “loose rook”, “bishop pin”, etc.
- Tactical only.

### HARD RULES
- ❌ No long speculative plans.
- ❌ No variations.
- ❌ No engine eval numbers.
- ❌ Do NOT contradict Stockfish.
- ✔️ Must remain structured.
- ✔️ Must return JSON only.

-----------------------------
Return JSON ONLY:
{
  "suggestion": "<1–2 sentence hint using SAN move>",
  "explanation": "<full structured explanation including all sections... NOT AN OBJECT>"
}
`;
}



//------------------------------------------------------------
// HEALTH CHECK ROUTE
//------------------------------------------------------------
app.get("/healthz", (req, res) => {
  res.status(200).send("OK");
});




//------------------------------------------------------------
// MAIN ROUTE — GET HINT
//------------------------------------------------------------
app.post("/api/hint", async (req, res) => {
  try {
    const { gameState, fen } = req.body;

    console.log("\n📨 New /api/hint request");
    console.log("FEN:", fen);

    // 1. Run Stockfish depth 20
    const { bestMove } = await runStockfish(fen);

    // 2. Convert UCI → SAN
    const sanMove = await convertUCItoSAN(fen, bestMove);

    // 3. Determine last SAN move
    const lastMoveSAN =
      gameState.moveHistory.length > 0
        ? gameState.moveHistory.at(-1).notation
        : "None";

    // 4. Build the explanation prompt
    const prompt = buildPrompt(gameState, fen, sanMove, lastMoveSAN);

    // 5. Ask GPT for final output
    const reply = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
    });

    const json = JSON.parse(reply.choices[0].message.content);
    res.json(json);
  } catch (err) {
    console.error("❌ /api/hint failed:", err);
    res.status(500).json({ error: "Hybrid engine failed" });
  }
});
//------------------------------------------------------------
// START SERVER
//------------------------------------------------------------
const PORT = process.env.PORT || 3001;

//------------------------------------------------------------
// SERVE REACT FRONTEND
//------------------------------------------------------------
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "client/dist")));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "client/dist", "index.html"));
});


//------------------------------------------------------------
// LISTEN (MUST BE LAST)
//------------------------------------------------------------
app.listen(PORT, () => {
  console.log("Server running on port " + PORT);
});
