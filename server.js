import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// -------------------------------------------------------------
// BUILD GPT PROMPT (High quality, world-class chess coach)
// -------------------------------------------------------------
function buildPrompt(gameState) {
  return `
You are a world-class chess coach (2800+ strength), famous for clear, friendly, visually engaging explanations.
You ALWAYS prioritize concrete tactics before strategic ideas.

===============================
🏆 **ABSOLUTE RULES (Tactics First!)**
===============================
1. Identify **all tactical forcing moves FIRST**:
   - winning captures
   - hanging pieces
   - forks
   - pins
   - discovered attacks
   - check threats
   - forced mates
2. If a capture or tactic is the best move, ALWAYS recommend it before any development move.
3. ONLY if no tactics are available, recommend a strategic or developmental move.
4. Do NOT hallucinate ideas that contradict the board state.

===============================
📘 **WHAT YOU MUST OUTPUT (JSON)**
===============================
{
  "suggestion": "Short headline, the best move (SAN)",
  "explanation": "150-220 word rich explanation with emojis and bold formatting"
}

===============================
🔥 **CONTENT REQUIREMENTS**
===============================
You must include ALL of the following in the explanation:

1. ⭐ **Last Move Evaluation**
   - Was the player's last move good/inaccurate/bad/excellent?  
   - Always explain WHY.  
   - Always include at least **one emoji** here.  
   - If the last move was poor, suggest what would've been better.

2. 🎯 **Best Next Move (actionable idea)**
   - State the strongest move in SAN (e.g., **cxd4**, **Nf3**, **Qxd5**).  
   - Explain **why it works**: tactics or plans.  
   - Use bold terms (e.g., **center control**, **pawn structure**, **development**).

3. 🧠 **Deep Position Summary (long & rich)**
   - Who is better and why?  
   - Long-term plans for BOTH SIDES.  
   - Tactical motifs in this structure.  
   - Strategic themes and typical ideas.  
   - Use emojis like ♟️🔥💡⚠️✨📘.

===============================
🎨 **STYLE GUIDE**
===============================
- Tone: warm, encouraging, smart — like a friendly super-GM coach.
- Always use bold text for important ideas.  
- Always include emojis throughout.  
- Length: **150–220 words**, descriptive and rich.  
- Use SAN notation (Nf3, cxd4, Qe2).  
- Do NOT include engine eval numbers or long variations.

===============================
♟️ **GAME STATE INPUT**
===============================
Turn: ${gameState.turn}
Check: ${gameState.check}
Checkmate: ${gameState.checkmate}
Moves: ${gameState.moveHistory.map(m => m.notation).join(", ")}

Describe the position fully based on the board state.
  `;
}



// -------------------------------------------------------------
// API ENDPOINT — Generate Hint
// -------------------------------------------------------------
app.post("/api/hint", async (req, res) => {
  try {
    const { gameState } = req.body;

    const prompt = buildPrompt(gameState);

    const response = await client.chat.completions.create({
      model: "gpt-4.1",           
      messages: [
        { role: "system", content: "You are a helpful chess tutor." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" },
    });

    const json = JSON.parse(response.choices[0].message.content);

    res.json(json);
  } catch (err) {
    console.error("GPT ERROR:", err);
    res.status(500).json({
      suggestion: "Error",
      explanation: "The AI tutor could not load. Check the backend console.",
    });
  }
});

// -------------------------------------------------------------
// START SERVER
// -------------------------------------------------------------
const PORT = 3001;
app.listen(PORT, () =>
  console.log(`ChessPal AI Tutor server running on port ${PORT}`)
);
