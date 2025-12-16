# Testing Plan

### Original Planned Test Areas
- **Chessboard Functionality:**  
  - Valid moves are generated correctly  
  - Pieces move according to chess rules  

- **Tutoring System:**  
  - AI feedback appears on the screen without delay  
  - The hint system provides explanations when triggered  

- **General App Behavior:**  
  - No crashes during gameplay  
  - UI updates correctly after each move  


### What we ended up doing:

Since our chess app has a lot of logs (that help the app be super transparent about what its doing) we thought it would be more productive to complete tests based off of these already existing logs rather than make create more automated feedback like vitests (although that may be interesting to implement in the future).

### With this, these are our formal tests:
https://docs.google.com/document/d/18z57luN62jeZI_lU55BIiL8z0kRXxxAJQI67Jm2XGUA/edit?usp=sharing

These tests were able to confirm the above **Chessboard Functionality** and **General App Behavior**  

When it comes to the **AI Tutoring system**, it is a bit hard to test the AI tutor from an objective standpoint, but our goal was to reduce hallucinations and increase accuracy as much as possible.
The way we tested this was testing out different chessboard scenarios and manually reading the AI output to see whether or not its insights were accurate or not (for example if what it was saying was true in the first place).
At first, it wasn't very accurate, however by implementing stockfish and adjusting the prompt, we were able to improve upon it.  
When it comes to the "AI appears on the screen without delay" goal, we were only able to reduce the delay by a little bit but in order to maintain accuracy, the stockfish depth must stay deep and the GPT model must stay above gpt4.... which inevitably causes the delay to still exist.

We originally wanted to have beta testers as well but we want to improve the AI tutor a bit more before giving it to real people with little chess experience. For example we want to make sure the AI tutor does not talk about the opponents move at all.
With this, it was primarily us team members who were continously testing the app.