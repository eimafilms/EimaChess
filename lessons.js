console.log("lessons.js script is running");
const chessLessons = [
    // ... rest of your lessons data
];// lessons.js (Revised structure)
const chessLessons = [
    {
        id: 'tactic-1-fork',
        name: 'Simple Knight Fork',
        category: 'Tactics',
        description: 'Find the knight fork.',
        fen: 'r1bqkbnr/pp2pppp/2n5/3p4/3P4/2N2N2/PPP2PPP/R1BQKB1R b KQkq - 1 5', // Black to move
        solution: ['Nb4'] // User must play Nb4
    },
     {
        id: 'tactic-2-backrank',
        name: 'Back Rank Mate',
        category: 'Tactics',
        description: 'Force a back rank mate sequence (White to move).',
        fen: '6k1/ppp2ppp/8/8/8/8/PPPPPPPP/R4RK1 w - - 0 1', // White to move
        solution: [
            'Rc1+', // User plays Rc1+
            'Rc8+'  // User plays Rc8+ (after Black's mandatory response like Kh7/Kh8 or blocking)
        ]
        // Note: This requires careful handling. Chess.js will handle Black's response if we tell it the move.
        // Simpler: only define the *user's* required moves. The app makes the user's move if correct, THEN potentially makes a canned opponent move IF defined for the lesson step, then waits for the next user move.
        // Let's define solution as an array of { userMove: 'e4', opponentMove: 'e5' } objects, or just user moves and let the app wait. Just user moves is simpler.
    },
    {
       id: 'opening-1-italian',
       name: 'Italian Game: First Moves',
       category: 'Openings',
       description: 'Play the first few moves of the Italian Game as White.',
       fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
       solution: ['e4', 'Nf3', 'Bc4'] // User plays e4. Then from the new position, user plays Nf3. Then from that new position, user plays Bc4.
    },
     {
        id: 'endgame-1-kingpawn',
        name: 'King and Pawn Endgame Study',
        category: 'Endgames',
        description: 'White to move and promote the pawn.',
        fen: '8/k7/P1K5/8/8/8/8/8 w - - 0 1', // White to move
        solution: ['Kb6', 'Ka7', 'Kxa7', 'a8=Q+'] // Sequence of White moves
     }
];
