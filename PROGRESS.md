# Summary

We now have a working app in the sense that there is a fully functioning chessboard, and when the player makes a move, the app uses **Stockfish + ChatGPT** to give feedback and guide the user when asked.

Credit to Bolt for making the Chessboard component and ChatGPT for helping us create the copyright license.

<br>

# Design Refinements

We stopped trying to build a chessboard from scratch with `react-chessboard` and instead used pre-existing code so we could focus our time on making the **Chess Tutor AI** work well.

All AI logic is run on the server. The server performs three primary
tasks:

1.  **Runs Stockfish locally** to determine the best move (UCI).
2.  **Converts the UCI move to SAN** using ChatGPT.
3.  **Builds a large structured prompt** and asks GPT for a complete
    explanation:
    -   Hint
    -   Evaluation
    -   Position Summary
    -   Tactical Motifs

A major improvement was switching from a purely ChatGPT-based tutor to a **hybrid Stockfish + ChatGPT system**. ChatGPT is explicitly instructed not to override Stockfish's analysis.

Another refinement was converting UCI → SAN. GPT understands SAN far better because most human games and annotated datasets are written in SAN. Switching to SAN significantly reduces hallucinations and improves accuracy. We also increased the Stockfish depth to **20** for stronger analysis.

The prompt sent to ChatGPT was refined frequently. Originally it was long and friendly but too wordy; we optimized it to be more tactical, concise, and helpful so users receive clear, actionable insight.

We also changed from using tailwind CSS to just using regular CSS because the system was more stable that way.

<br>

# Implementation

## Short Summary of the App Implementation

Your `App.tsx` manages the entire chess game and the connection to the
AI tutor backend.

### 1. Game State

The app stores all chess-related information:

-   `board`, `turn`, `selectedSquare`, `validMoves`
-   `moveHistory`
-   `check`, `checkmate`, `stalemate`
-   UI states such as `currentHint`, `lastMove`, and `hintLoading`

------------------------------------------------------------------------

### 2. User Interaction

-   Clicking a square either:
    -   selects a piece,
    -   highlights valid moves,
    -   or executes a move.
-   `makeMove()`:
    -   updates the board
    -   handles captures
    -   switches turns
    -   generates SAN notation
    -   checks for check or checkmate

------------------------------------------------------------------------

### 3. AI Hint Request

`handleRequestHint()`:

1.  Converts the board → FEN\

2.  Sends `{ gameState, fen }` to the backend\

3.  Backend uses **Stockfish + GPT** to produce:

    ``` json
    { "suggestion": "...", "explanation": "..." }
    ```

4.  The result appears in the **AITutor** panel

------------------------------------------------------------------------

### 4. Rendering

The UI consists of two main areas:

**Left:**
- Interactive ChessBoard
- Checkmate banner

**Right:**
- AITutor (hint + request button)
- MoveHistory

<br>

# Testing

Here is the link to the more formal tests using logs:
https://docs.google.com/document/d/18z57luN62jeZI_lU55BIiL8z0kRXxxAJQI67Jm2XGUA/edit?usp=sharing

We did a lot of testing during development as well (not just at the end). We especially did a lot of testing when debugging different configurations of Stockfish and Node:

- We tested the different versions of Stockfish and Node through building the project in the terminal. Though, when we ran it, errors appeared regarding the implementation of the libraries within the code files. To remedy the issue, we researched the different errors and tried to adjust accordingly to it in the files. We also had to verify that we had the correct versions of Stockfish and Node installed through ensuring the AI tutor was able to load into the server. In the case the AI tutor failed to load, we would then have to result in changing either versions of Stockfish and/or Node.
- After the completion of installing Stockfish 17 and Node 20, we tested the Chess App to verify the Chatbot was working. However, we noticed that the AI tutor’s response output was cut short. Initially we copied a working version of our build prompt into our file containing the AI tutor, but after testing it failed to produce a detailed analysis for the player. It also produced a paragraph of text rather than a bulleted list of suggestions. Which prompted us to make several adjustments in our file where we had to specify certain aspects before getting a more satisfying response structure. 
- We initially did some research about the different Stockfish version because it was initially the root cause of our app breaking. WIth this we made a switch to Stockfish version 8 because it was a more stable build and it included a WASM. We tried this Node 24, but the AI tutor wouldn’t load from this combination. 
This enabled us to go back to Stockfish 17.1, but this time we also downloaded a file from the official website that allowed us to bypass the limitations that stem from using WASM.
- We also stopped using node 24 because it kept breaking the WASM loaders. Node 24 is intended for developers to test, update and adapt their libraries, but it's not an LTS release... While Node 20 is compatible with launching stockfish with this line in the server.js file: "const engine = spawn("./engine/stockfish.exe");"


<br>

# Problems Encountered
At first, we assumed ChatGPT alone could understand the board state and give good enough chess insights. We realized we were wrong (GPT alone was very inaccurate and hallucinates often) and we needed to use an established tool to do most of the heavy lifting when it comes to analyzing the game and game tactics. In the end the ChatGPT LLM was only responsible for formatting the data Stockfish has provided into a more human-like format.

This is a good summary:

> **"GPT is amazing at explanation, but terrible at tactical calculation.
> Stockfish is amazing at tactics, but terrible at human explanation."**


Our major roadblock was that once Stockfish was introduced, the program kept on breaking. This was because the program couldn’t recognize the Stockfish files after refreshing. With this, the team did a deep dive into trying to fix the problem, including trying older Stockfish versions, and deleting and installing different node versions. And we realized the best solution was using an old Stockfish version (downloading directly from the site), and then changing to node 20.

Another issue was running out of ChatGPT API tokens. Fortunately, accounts created before mid-2024 still have free access to `gpt-4o`, which is a weaker model but it is still okay since Stockfish handles the complex tactical analysis anyway.

------------------------------------------------------------------------
