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

// Converts your game state to a useful text summary for GPT
function buildPrompt(gameState) {
  return `
You are a chess coach (2000+ ELO). Give a clear, concise, helpful hint.

Game Info:
- Turn: ${gameState.turn}
- Check: ${gameState.check}
- Checkmate: ${gameState.checkmate}
- Move history: ${gameState.moveHistory.map(m => m.notation).join(", ")}

Return JSON:
{
  "suggestion": "...",
  "explanation": "..."
}
  `;
}

app.post("/api/hint", async (req, res) => {
  try {
    const { gameState } = req.body;

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // great for small costs + fast
      messages: [
        {
          role: "user",
          content: buildPrompt(gameState),
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(response.choices[0].message.content);

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to generate hint" });
  }
});

const PORT = 3001;
app.listen(PORT, () => console.log("Server running on port " + PORT));
