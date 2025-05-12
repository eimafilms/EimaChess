// script.js

console.log("script.js script is running"); // Keep this for debugging

// --- Initialize Game State and Board ---
let game = new Chess(); // Initialize chess.js game state
// CHANGE: Use 'board' instead of 'ground' for the chessboard.js instance
let board = null; // Variable to hold the chessboard.js instance

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
// CHANGE: This function is completely rewritten for chessboard.js
function initBoard(fen, orientation) {
     // Check if the board element was found (should be now with script at end of body)
     if (!boardElement) {
         console.error("Board element #board not found!");
         updateStatus("Error: Board element not found.", 'incorrect');
         return; // Stop if element is missing
     }

     // Define the configuration for chessboard.js
     const cfg = {
         // Set the starting position
         position: fen,
         // Set board orientation
         orientation: orientation, // 'white' or 'black'
         // Make pieces draggable
         draggable: true,
         // Define the function to call when a piece is dropped
         // The source and target squares are passed as arguments
         onDrop: onUserMoveAttempt
         // You might also use onMoveEnd if you want to handle moves after animation
     };

    // Initialize the board
    // CHANGE: Use the Chessboard() constructor provided by chessboard.js
    board = Chessboard('board', cfg); // 'board' is the ID of the HTML element

    // No direct event listener for game.events.on('change') needed for updating dests/turnColor
    // in chessboard.js in the same way as ChessGround.
    // Board updates are typically done by setting the position or making moves via the board API.
    // Turn color indicator is not a built-in feature of chessboard.js v0.3.0

}

// CHANGE: This helper function is no longer needed for chessboard.js
// function toDests(moves) { ... }


// --- Lesson Loading and Navigation (Remain largely the same) ---
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
    // CHANGE: Call initBoard with the fen and orientation
    initBoard(lesson.fen, game.turn() === 'w' ? 'white' : 'black'); // Set orientation based on whose turn it is


    // Update lesson info display (Add checks to ensure elements exist)
    if (lessonNameElement) lessonNameElement.textContent = lesson.name;
    if (lessonCategoryElement) lessonCategoryElement.textContent = lesson.category;
    if (lessonDescriptionElement) lessonDescriptionElement.textContent = lesson.description;


    // Update status and controls
    updateStatus(`Lesson loaded. Your turn to play: ${game.turn() === 'w' ? 'White' : 'Black'}`, 'info');
    updateNavigationButtons();
     // Call enableUserInput to ensure dragging is allowed for the correct color
     enableUserInput();
}

// nextLesson, prevLesson, retryLesson, updateNavigationButtons remain the same


// --- User Input and Validation ---
// CHANGE: This function is now the onDrop callback for chessboard.js
function onUserMoveAttempt(source, target) { // chessboard.js passes source and target squares (e.g., 'e2', 'e4')
    // chessboard.js also passes the piece being moved and the new position FEN, but we'll rely on chess.js

    const lesson = chessLessons[currentLessonIndex];
    const expectedMoveSan = lesson.solution[currentMoveIndex];

    if (!expectedMoveSan) {
        console.error("No expected move defined for this step. Lesson might be completed.");
         if (currentMoveIndex >= lesson.solution.length) {
              updateStatus("Lesson complete! Please load the next one.", 'info');
         } else {
              updateStatus("Error in lesson data or logic.", 'incorrect');
              disableUserInput();
         }
         // CHANGE: Need to return 'snapback' from onDrop if the move is illegal later
        return 'snapback';
    }

    // Attempt to make the move in chess.js
    // chessboard.js gives source and target, chess.js move function takes { from, to, promotion }
    // We need to find the move from the list of legal moves
    const possibleMoves = game.moves({ verbose: true });
     // Look for a move from source to target. Assume promotion to 'q' for simplicity if one exists.
    const attemptedMove = possibleMoves.find(move => move.from === source && move.to === target);

    // --- Check if the attempted move is Legal according to chess.js ---
    if (!attemptedMove) {
        // This move is not legal in this position
         updateStatus("Illegal move! Try again.", 'incorrect');
         // CHANGE: Return 'snapback' to animatedly move the piece back
         return 'snapback'; // Return 'snapback' to discard the move
    }

     // --- Check if the Legal move is the Correct one for the lesson step ---
     // We need to make the attempted move first in a temp game to get its SAN reliably
     const tempGame = new Chess(game.fen());
     // Make the move including the potential promotion
     const moveResult = tempGame.move({ from: attemptedMove.from, to: attemptedMove.to, promotion: attemptedMove.promotion });

     // Check if the attempted move's SAN matches the expected solution move's SAN
     if (!moveResult || moveResult.san !== expectedMoveSan) {
         // Move is legal, but it's not the *correct* move for this lesson step
         updateStatus(`Incorrect move! Expected ${expectedMoveSan}. Try again.`, 'incorrect');
         // CHANGE: Return 'snapback' to discard the move
         return 'snapback'; // Return 'snapback' to discard the move
     }

    // --- Correct move! ---
    console.log("Correct move:", moveResult.san);
    // Apply the move to the actual game state
    game.move({ from: attemptedMove.from, to: attemptedMove.to, promotion: attemptedMove.promotion });

    // CHANGE: No need to update board via setPosition or set fen here,
    // chessboard.js handles the visual update automatically when onDrop does NOT return 'snapback'

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
        // No need to call enableUserInput explicitly here unless disabling happened elsewhere,
        // but it's good practice to ensure input is allowed for the next step.
         enableUserInput();
    }

    // CHANGE: onDrop must return nothing or undefined if the move is successful
    // This tells chessboard.js to keep the piece at the target square
    return; // Indicate successful move
}

// CHANGE: These functions need to use chessboard.js methods
function disableUserInput() {
     if (board) {
         // To disable input, you can set draggable to false
         board.enableBoardVsBoard(false); // A method to disable drag/drop
         // board.config.draggable = false; // Modifying config directly might also work, then redraw
         // board.redraw();
     }
}

function enableUserInput() {
    if (board && !game.gameOver()) {
         // Enable drag/drop for the current turn color
         const turnColor = game.turn(); // 'w' or 'b'
         // chessboard.js v0.3.0 doesn't have a built-in way to restrict by color easily.
         // We rely on the game logic to validate moves.
         // Simply enable drag/drop generally. Move validation in onUserMoveAttempt handles correctness.
         board.enableBoardVsBoard(true); // A method to enable drag/drop
         // board.config.draggable = true;
         // board.redraw();
     }
}


// updateStatus remains the same


// --- Event Listeners (Remain the same, assuming elements exist) ---
// Check if elements exist before adding listeners
if (nextLessonButton) nextLessonButton.addEventListener('click', nextLesson);
if (prevLessonButton) prevLessonButton.addEventListener('click', prevLesson);
if (retryLessonButton) retryLessonButton.addEventListener('click', retryLesson);


// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");

    // Check if core elements were found (using the variables declared at the top)
    if (!boardElement || !nextLessonButton || !prevLessonButton || !retryLessonButton || !statusElement || !lessonNameElement || !lessonCategoryElement || !lessonDescriptionElement) {
        console.error("One or more required HTML elements not found!");
         if (statusElement) {
             updateStatus("Error: Required HTML elements not found. Check your index.html.", 'incorrect');
         } else {
              console.error("Status element also not found.");
         }
        return; // Do NOT proceed if elements are missing
    }

    // Load the first lesson when the page loads
    if (chessLessons && chessLessons.length > 0) {
        loadLesson(0);
    } else {
        updateStatus("No lessons defined in lessons.js", 'info');
        disableUserInput(); // Ensure input is off if no lessons
        updateNavigationButtons(); // Ensure buttons are disabled if no lessons
    }
});
