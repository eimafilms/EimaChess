// lessons.js

console.log("lessons.js script is running"); // Keep this for debugging

const chessLessons = [
    {
        id: 'tactic-1-fork',
        name: 'Simple Knight Fork',
        category: 'Tactics',
        description: 'Find the knight fork.',
        fen: 'r1bqkbnr/pp2pppp/2n5/3p4/3P4/2N2N2/PPP2PPP/R1BQKB1R b KQkq - 1 5', // Black to move
        solution: ['Nb4'] // User must play Nb4 (assuming it's the correct move in this specific FEN)
    },
     {
        id: 'tactic-2-backrank',
        name: 'Back Rank Mate',
        category: 'Tactics',
        description: 'Force a back rank mate sequence (White to move).',
        fen: '6k1/ppp2ppp/8/8/8/8/PPPPPPPP/R4RK1 w - - 0 1', // White to move
        solution: [
            'Rc1+', // User plays Rc1+
            'Rc8+'  // User plays Rc8+ (assuming Black's response makes this the next required move)
        ]
        // Note: This assumes a specific forced sequence after Rc1+.
        // For real lessons, you might need more sophisticated checking or simpler sequences.
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
     // Add more lessons here following the same structure
];
