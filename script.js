// script.js

console.log("script.js script is running"); // Keep this for debugging

// --- Initialize Game State and Board ---
let game = new Chess(); // Initialize chess.js game state
let ground = null; // Variable to hold the ChessGround instance

// State for the learning session
let currentLessonIndex = 0;
let currentMoveIndex = 0; // Index within the solution array of the current lesson

// DOM Elements (These are now correctly placed in the body before the script)
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

     // Check if the board element was found
     if (!boardElement) {
         console.error("Board element #board not found!");
         updateStatus("Error: Board element not found.", 'incorrect');
         return; // Stop if element is missing
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
             // Make sure ground exists before trying to update it
             if (ground) {
                 ground.set({
                    dests: toDests(game.moves({ verbose: true })),
                    turnColor: game.turn() === 'w' ? 'white' : 'black' // Update turn color indicator
                 });
            }
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
        // Optionally loop back to the start or disable buttons
        if (index >= chessLessons.length) {
            currentLessonIndex = chessLessons.length - 1; // Stay on last lesson
        } else {
            currentLessonIndex = 0; // Go back to first lesson
        }
        updateNavigationButtons(); // Update buttons based on new index
        return; // Stop loading
    }

    currentLessonIndex = index;
    currentMoveIndex = 0; // Start at the beginning of the solution

    const lesson = chessLessons[currentLessonIndex];

    // Reset game state to the lesson's starting position
    game.load(lesson.fen);

    // Initialize or update the board for the new position
    initBoard(lesson.fen, game.turn() === 'w' ? 'white' : 'black'); // Set orientation based on whose turn it is

    // Update lesson info display (Add checks to ensure elements exist)
    if (lessonNameElement) lessonNameElement.textContent = lesson.name;
    if (lessonCategoryElement) lessonCategoryElement.textContent = lesson.category;
    if (lessonDescriptionElement) lessonDescriptionElement.textContent = lesson.description;


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
    // Check if buttons exist before updating them
    if (prevLessonButton) prevLessonButton.disabled = currentLessonIndex === 0;
    if (nextLessonButton) nextLessonButton.disabled = currentLessonIndex >= chessLessons.length - 1;
    if (retryLessonButton) retryLessonButton.disabled = false; // Always allow retrying
}

// --- User Input and Validation ---
function onUserMoveAttempt(orig, dest) {
    const lesson = chessLessons[currentLessonIndex];
    const expectedMoveSan = lesson.solution[currentMoveIndex];

    if (!expectedMoveSan) {
        // This shouldn't happen if game flow is correct, but handle defensively
        console.error("No expected move defined for this step. Lesson might be completed.");
         // Check if lesson is actually complete
         if (currentMoveIndex >= lesson.solution.length) {
              updateStatus("Lesson complete! Please load the next one.", 'info');
         } else {
              updateStatus("Error in lesson data or logic.", 'incorrect');
              disableUserInput(); // Disable input if something is wrong
         }
        // Revert board state if ground exists
         if (ground) ground.set({ fen: game.fen() });
        return;
    }

    // Attempt to make the move in chess.js using the move notation ChessGround gives us (e.g., 'e2e4')
    // We need to convert the ChessGround {orig, dest} to a format chess.js understands and can validate against the expected SAN.
    // The easiest way is to try all legal moves from orig, find the one going to dest, get its SAN, and compare.

    const possibleMoves = game.moves({ verbose: true });
    const attemptedMove = possibleMoves.find(move => move.from === orig && move.to === dest);

    // --- Check if the attempted move is Legal ---
    if (!attemptedMove) {
        // This move is not even legal in this position according to chess.js
         updateStatus("Illegal move! Try again.", 'incorrect');
         // Revert the board state in ChessGround as the move didn't happen in chess.js
         if (ground) ground.set({ fen: game.fen() });
         // Keep user input enabled to try again
         enableUserInput();
        return;
    }

     // --- Check if the Legal move is the Correct one for the lesson step ---
     // We need to make the attempted move first in a temp game to get its SAN reliably
     const tempGame = new Chess(game.fen());
     const moveResult = tempGame.move({ from: orig, to: dest, promotion: attemptedMove.promotion }); // Include promotion if applicable

     // Check if the attempted move's SAN matches the expected solution move's SAN
     if (!moveResult || moveResult.san !== expectedMoveSan) {
         // Move is legal, but it's not the *correct* move for this lesson step
         updateStatus(`Incorrect move! Expected ${expectedMoveSan}. Try again.`, 'incorrect');
         // Revert the board state in ChessGround
         if (ground) ground.set({ fen: game.fen() });
         // Keep user input enabled to try again
         enableUserInput();
         return;
     }

    // --- Correct move! ---
    console.log("Correct move:", moveResult.san);
    // Apply the move to the actual game state
    game.move({ from: orig, to: dest, promotion: attemptedMove.promotion });

    // Update the board visual with the correct move
    if (ground) {
        ground.set({
            fen: game.fen(),
            lastMove: [moveResult.from, moveResult.to] // Highlight the move
        });
    }


    currentMoveIndex++; // Move to the next step in the solution

    // --- Check if the lesson is completed ---
    if (currentMoveIndex >= lesson.solution.length) {
        updateStatus("Lesson complete! Well done!", 'correct');
        disableUserInput(); // Disable input after completing the lesson
        // Optionally auto-advance after a delay
        // setTimeout(nextLesson, 2000);
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
                 color: null, // No one can move
                 dests: {} // No destinations highlighted
             },
              draggable: { // Ensure dragging is also disabled
                  enabled: false
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
                  color: turnColor, // Only this color can move
                  dests: toDests(game.moves({ verbose: true })) // Highlight legal moves
             },
              draggable: { // Ensure dragging is enabled
                  enabled: true
              }
         });
     }
}

function updateStatus(message, type) {
    // Check if status element exists before updating it
     if (statusElement) {
        statusElement.textContent = message;
        // Reset classes and add the appropriate one
        statusElement.className = 'game-status'; // Clear previous classes
        if (type) {
            statusElement.classList.add(`status-${type}`);
        } else {
            statusElement.classList.add('status-info'); // Default class
        }
     }
}


// --- Event Listeners ---
// Check if elements exist before adding listeners
if (nextLessonButton) nextLessonButton.addEventListener('click', nextLesson);
if (prevLessonButton) prevLessonButton.addEventListener('click', prevLesson);
if (retryLessonButton) retryLessonButton.addEventListener('click', retryLesson);


// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");
    // Re-get elements just in case, though they should be found if script is at end of body
    // const boardElement = document.getElementById('board'); // Already declared at top
    // const nextLessonButton = document.getElementById('next-lesson'); // Already declared at top
    // etc. - the variables declared at the top should now find the elements

    // Check if core elements were found
    if (!boardElement || !nextLessonButton || !prevLessonButton || !retryLessonButton || !statusElement || !lessonNameElement || !lessonCategoryElement || !lessonDescriptionElement) {
        console.error("One or more required HTML elements not found!");
        // Attempt to update status if statusElement was found
         if (statusElement) {
             updateStatus("Error: Required HTML elements not found. Check your index.html.", 'incorrect');
         } else {
              console.error("Status element also not found.");
         }
         // Do NOT proceed with loading lessons if elements are missing
        return;
    }


    // Load the first lesson when the page loads
    if (chessLessons && chessLessons.length > 0) {
        loadLesson(0);
    } else {
        updateStatus("No lessons defined in lessons.js", 'info');
        disableUserInput(); // Ensure input is off if no lessons
        updateNavigationButtons(); // Ensure buttons are disabled if no lessons
         // Potentially hide controls/lesson info if no lessons
    }
});
