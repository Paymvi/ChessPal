import {useState} from "react";

export function useAIOpponent(){
    const [aiThinking, setAIThinking] = useState(false);

    async function getAIMove(fen: string){
        try{
            setAIThinking(true);

            const res = await fetch("http://localhost:3001/api/ai-move", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({fen}),
            });

            if (!res.ok){
                console.error("AI move error:", res.status);
                return null;
            }

            const data = await res.json();

            console.log("➡️ Fetching AI move for:", fen);
            console.log("⬅️ Raw response:", data);

            return data; // {from, to, promotionm, uci, eval}
        }

        catch (err) {
            console.error("Network/AI error:", err);
            return null;
        }
        finally{
            setAIThinking(false);
        }
        
    }

    return {aiThinking, getAIMove};
}