console.log("script.js script is running");
// --- Initialize Game State and Board ---
let game = new Chess();
// ... rest of your script.js code// script.js

// --- Initialize Game State and Board ---
let game = new Chess(); // Initialize chess.js game state
let ground = null; // Variable to hold the ChessGround instance

// State for the learning session
let currentLessonIndex = 0;
let currentMoveIndex = 0; // Index within the solution array of the current lesson

// DOM Elements
const boardElement = document.getElementById('board');
const lessonNameElement = document.getElementById('lesson-name');
const lessonCategoryElement = document.getElementById('lesson-category');
const lessonDescriptionElement = document.getElementById('lesson-description');
const statusElement = document.getElementById('status');
const prevLessonButton = document.getElementById('prev-lesson');
const nextLessonButton = document.getElementById('next-lesson');
const retryLessonButton = document.getElementById('retry-lesson');


// --- Board Initialization ---
function initBoard(fen, orientation) {
     // Clear existing board if it exists
     if (ground) {
         ground.destroy();
     }

    ground = Chessground(boardElement, {
        fen: fen,
        orientation: orientation, // 'white' or 'black' based on the lesson's turn
        movable: {
            color: game.turn() === 'w' ? 'white' : 'black', // Allow moving for whoever's turn it is in the FEN
            dests: toDests(game.moves({ verbose: true })), // Highlight legal moves based on game state
            events: {
                after: onUserMoveAttempt // Callback after a user move is attempted
            }
        },
        animation: {
            enabled: true,
            duration: 200
        },
        selectable: {
            enabled: true
        }
    });

    // Update possible moves whenever the game state changes (e.g., after user move)
     game.events.on('change', () => {
         if (!game.gameOver()) {
             ground.set({
                dests: toDests(game.moves({ verbose: true })),
                turnColor: game.turn() === 'w' ? 'white' : 'black' // Update turn color indicator
             });
         }
     });
}

// Helper function to format moves for ChessGround's dests
function toDests(moves) {
    const dests = {};
    moves.forEach(move => {
        dests[move.from] = dests[move.from] || [];
        dests[move.from].push(move.to);
    });
    return dests;
}


// --- Lesson Loading and Navigation ---
function loadLesson(index) {
    if (index < 0 || index >= chessLessons.length) {
        console.warn("Lesson index out of bounds:", index);
        updateStatus("No more lessons.", 'info');
        return;
    }

    currentLessonIndex = index;
    currentMoveIndex = 0; // Start at the beginning of the solution

    const lesson = chessLessons[currentLessonIndex];

    // Reset game state to the lesson's starting position
    game.load(lesson.fen);

    // Initialize or update the board for the new position
    initBoard(lesson.fen, game.turn() === 'w' ? 'white' : 'black'); // Set orientation based on whose turn it is

    // Update lesson info display
    lessonNameElement.textContent = lesson.name;
    lessonCategoryElement.textContent = lesson.category;
    lessonDescriptionElement.textContent = lesson.description;

    // Update status and controls
    updateStatus(`Lesson loaded. Your turn to play: ${game.turn() === 'w' ? 'White' : 'Black'}`, 'info');
    updateNavigationButtons();
     enableUserInput();
}

function nextLesson() {
    loadLesson(currentLessonIndex + 1);
}

function prevLesson() {
    loadLesson(currentLessonIndex - 1);
}

function retryLesson() {
    loadLesson(currentLessonIndex); // Simply reload the current lesson
}

function updateNavigationButtons() {
    prevLessonButton.disabled = currentLessonIndex === 0;
    nextLessonButton.disabled = currentLessonIndex >= chessLessons.length - 1;
     retryLessonButton.disabled = false; // Always allow retrying the current lesson
}

// --- User Input and Validation ---
function onUserMoveAttempt(orig, dest) {
    const lesson = chessLessons[currentLessonIndex];
    const expectedMoveSan = lesson.solution[currentMoveIndex];

    if (!expectedMoveSan) {
        // This shouldn't happen if game flow is correct, but handle defensively
        console.error("No expected move defined for this step.");
         updateStatus("Error in lesson data.", 'incorrect');
        disableUserInput();
        return;
    }

    // Attempt to make the move in chess.js using the move notation ChessGround gives us (e.g., 'e2e4')
    // Chess.js's .move() can take { from, to, promotion } or a SAN string like 'e4', 'Nf3', 'Qxf7+'
    // We need to convert the ChessGround {orig, dest} to a format chess.js understands and can validate against the expected SAN.
    // The easiest way is to try all legal moves from orig, find the one going to dest, get its SAN, and compare.

    const possibleMoves = game.moves({ verbose: true });
    const attemptedMove = possibleMoves.find(move => move.from === orig && move.to === dest);

    if (!attemptedMove) {
        // This move is not even legal in this position
         updateStatus("Illegal move!", 'incorrect');
         // Revert the board state in ChessGround as the move didn't happen in chess.js
         ground.set({ fen: game.fen() });
         // Keep user input enabled to try again
         enableUserInput();
        return;
    }

     // Check if the attempted move's SAN matches the expected solution move's SAN
     // We need to make the attempted move first in a temp game to get its SAN reliably
     const tempGame = new Chess(game.fen());
     const moveResult = tempGame.move({ from: orig, to: dest, promotion: attemptedMove.promotion }); // Include promotion if applicable

     if (!moveResult || moveResult.san !== expectedMoveSan) {
         // Move is legal, but it's not the *correct* move for this lesson step
         updateStatus(`Incorrect move! Expected ${expectedMoveSan}`, 'incorrect');
         // Revert the board state in ChessGround
         ground.set({ fen: game.fen() });
         // Keep user input enabled to try again
         enableUserInput();
         return;
     }

    // Correct move!
    console.log("Correct move:", moveResult.san);
    // Apply the move to the actual game state
    game.move({ from: orig, to: dest, promotion: attemptedMove.promotion });

    // Update the board visual with the correct move
    ground.set({
        fen: game.fen(),
        lastMove: [moveResult.from, moveResult.to] // Highlight the move
    });

    currentMoveIndex++; // Move to the next step in the solution

    // Check if the lesson is completed
    if (currentMoveIndex >= lesson.solution.length) {
        updateStatus("Lesson complete! Well done!", 'correct');
        disableUserInput(); // Disable input after completing the lesson
        // Automatically move to the next lesson after a short delay?
        // setTimeout(nextLesson, 2000); // Uncomment to auto-advance
    } else {
        // Lesson is not complete, update status and prepare for the next user move
        const nextExpectedMove = lesson.solution[currentMoveIndex];
         updateStatus(`Correct! Now play ${nextExpectedMove}`, 'correct');
        enableUserInput(); // Re-enable input for the next step
    }
}

function disableUserInput() {
     if (ground) {
         ground.set({
             movable: {
                 color: null,
                 dests: {}
             }
         });
     }
}

function enableUserInput() {
    if (ground && !game.gameOver()) {
         // Determine whose turn it is according to game.js and set movable color
         const turnColor = game.turn() === 'w' ? 'white' : 'black';
         ground.set({
             movable: {
                  color: turnColor,
                  dests: toDests(game.moves({ verbose: true }))
             }
         });
     }
}

function updateStatus(message, type) {
    statusElement.textContent = message;
    // Reset classes and add the appropriate one
    statusElement.className = 'game-status'; // Clear previous classes
    if (type) {
        statusElement.classList.add(`status-${type}`);
    } else {
        statusElement.classList.add('status-info'); // Default class
    }
}


// --- Event Listeners ---
nextLessonButton.addEventListener('click', nextLesson);
prevLessonButton.addEventListener('click', prevLesson);
retryLessonButton.addEventListener('click', retryLesson);


// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    // Load the first lesson when the page loads
    if (chessLessons.length > 0) {
        loadLesson(0);
    } else {
        updateStatus("No lessons defined in lessons.js", 'info');
        disableUserInput();
        updateNavigationButtons(); // Disable buttons if no lessons
    }
});
