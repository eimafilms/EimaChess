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
     console.log("Initializing board with FEN:", fen, "Orientation:", orientation);
     // Check if the board element was found (should be now with script at end of body)
     if (!boardElement) {
         console.error("Board element #board not found inside initBoard!");
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
         onDrop: onUserMoveAttempt,
         // Define the function to call when a piece snapbacks
         onSnapbackEnd: onSnapbackEnd
         // You might also use onMoveEnd if you want to handle moves after animation
     };

    // Initialize the board
    // CHANGE: Use the Chessboard() constructor provided by chessboard.js
    // The Chessboard constructor expects the ID of the element or the element itself
    board = Chessboard('board', cfg); // 'board' is the ID of the HTML element
    console.log("Chessboard instance created:", board);


    // No direct event listener for game.events.on('change') needed for updating dests/turnColor
    // in chessboard.js in the same way as ChessGround.
    // Board updates are typically done by setting the position or making moves via the board API.
    // Turn color indicator is not a built-in feature of chessboard.js v0.3.0
}

// Helper function to format moves for ChessGround's dests (NO LONGER USED BY CHESSBOARD.JS)
// function toDests(moves) { ... }


// --- Lesson Loading and Navigation (Remain largely the same) ---
function loadLesson(index) {
    console.log("Attempting to load lesson index:", index);
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
    console.log("Loading lesson:", lesson.name);

    // Reset game state to the lesson's starting position
    game = new Chess(lesson.fen); // Create a NEW Chess instance for the lesson start
    console.log("Chess.js game loaded with FEN:", game.fen());


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

function nextLesson() {
    console.log("Next Lesson button clicked");
    loadLesson(currentLessonIndex + 1);
}

function prevLesson() {
    console.log("Previous Lesson button clicked");
    loadLesson(currentLessonIndex - 1);
}

function retryLesson() {
    console.log("Retry Lesson button clicked");
    loadLesson(currentLessonIndex); // Simply reload the current lesson
}

function updateNavigationButtons() {
    console.log("Updating navigation buttons");
    // Check if buttons exist before updating them
    if (prevLessonButton) prevLessonButton.disabled = currentLessonIndex === 0;
    if (nextLessonButton) nextLessonButton.disabled = currentLessonIndex >= chessLessons.length - 1;
    if (retryLessonButton) retryLessonButton.disabled = false; // Always allow retrying
}

// --- User Input and Validation ---
// CHANGE: This function is now the onDrop callback for chessboard.js
function onUserMoveAttempt(source, target) { // chessboard.js passes source and target squares (e.g., 'e2', 'e4')
    console.log("onUserMoveAttempt (onDrop) called. Source:", source, "Target:", target);
    // chessboard.js also passes the piece being moved and the new position FEN, but we'll rely on chess.js

    const lesson = chessLessons[currentLessonIndex];
    const expectedMoveSan = lesson.solution[currentMoveIndex];

    if (!expectedMoveSan) {
        console.error("No expected move defined for this step. Lesson might be completed.");
         if (currentMoveIndex >= lesson.solution.length) {
              updateStatus("Lesson complete! Please load the next one.", 'info');
         } else {
              updateStatus("Error in lesson data or logic.", 'incorrect');
              // No need to disableUserInput here, returning 'snapback' handles it visually
         }
         // CHANGE: Need to return 'snapback' from onDrop if the move is illegal later
        return 'snapback';
    }

    // Attempt to make the move in chess.js
    // chessboard.js gives source and target, chess.js move function takes { from, to, promotion }
    // We need to find the move from the list of legal moves
    const possibleMoves = game.moves({ verbose: true });
     // Look for a move from source to target. Assume promotion to 'q' for simplicity if one exists and is legal.
     // We need to check if ANY legal move goes from source to target (handles captures, etc.)
    const attemptedMove = possibleMoves.find(move => move.from === source && move.to === target);

    // --- Check if the attempted move is Legal according to chess.js ---
    if (!attemptedMove) {
        // This move is not legal in this position
         console.warn("Illegal move attempted:", source + target);
         updateStatus("Illegal move! Try again.", 'incorrect');
         // CHANGE: Return 'snapback' to animatedly move the piece back
         return 'snapback'; // Return 'snapback' to discard the move
    }

     // --- Check if the Legal move is the Correct one for the lesson step ---
     // We need to make the attempted move first in a temp game to get its SAN reliably
     const tempGame = new Chess(game.fen());
     // Make the move including the potential promotion ('q' is default in Chess.js move function if ambiguous)
     // We need to be careful with promotion. Let's let chess.js handle it based on attemptedMove details.
     const moveResult = game.move({ from: attemptedMove.from, to: attemptedMove.to, promotion: attemptedMove.promotion }); // Use the actual game object for the attempted move

     // Check if the attempted move's SAN matches the expected solution move's SAN
     if (!moveResult || moveResult.san !== expectedMoveSan) {
         // Move is legal, but it's not the *correct* move for this lesson step
         console.warn("Legal but incorrect move attempted. Expected:", expectedMoveSan, "Attempted:", moveResult ? moveResult.san : 'N/A');
         updateStatus(`Incorrect move! Expected ${expectedMoveSan}. Try again.`, 'incorrect');

         // CHANGE: Revert the move in the actual game state since it was incorrect
         game.undo(); // Undo the move we just made
         // CHANGE: Return 'snapback' to discard the move visually
         return 'snapback'; // Return 'snapback' to discard the move
     }

    // --- Correct move! ---
    console.log("Correct move:", moveResult.san);
    // The move has already been applied to the 'game' object by the line 'const moveResult = game.move({...});' above

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
        // Re-enable input (though onDrop not returning 'snapback' implicitly does this)
         enableUserInput();
    }

    // CHANGE: onDrop must return nothing or undefined if the move is successful
    // This tells chessboard.js to keep the piece at the target square
    return; // Indicate successful move
}

// CHANGE: Add onSnapbackEnd callback to ensure board is reset after illegal move
function onSnapbackEnd() {
    // This is called after a piece snaps back (i.e., an illegal/incorrect move)
    // Ensure the game state and board display match after an incorrect move snapback
    // The game state was already reverted by game.undo() in onUserMoveAttempt
    // The board visually snapped back automatically, but explicitly setting position can ensure sync
    if (board) {
       board.position(game.fen()); // Ensure the board is reset to the current game state FEN
    }
    console.log("Snapback ended. Board reset to:", game.fen());
}


// CHANGE: These functions need to use chessboard.js methods
function disableUserInput() {
     console.log("Disabling user input");
     if (board) {
         // To disable input, use board.draggable = false and potentially disable the source squares
         // chessboard.js v0.3.0 doesn't have a simple enable/disable all drag/drop.
         // The common way is to set the 'draggable' config option.
         // Let's just set draggable to false in the config and update.
         // A simpler way might be to just remove the onDrop handler temporarily? No, that's hacky.
         // Let's try setting the draggable config option.
         board.config.draggable = false; // Disable dragging
         // No need to redraw immediately, the next interaction will use this config
         console.log("Board dragging disabled");
     } else {
         console.warn("Board not initialized, cannot disable input.");
     }
}

function enableUserInput() {
    console.log("Enabling user input");
    if (board && !game.gameOver()) {
         // Enable drag/drop generally. Move validation in onUserMoveAttempt handles correctness.
         board.config.draggable = true; // Enable dragging
         // No need to redraw immediately
          console.log("Board dragging enabled");
     } else {
         console.warn("Board not initialized or game over, cannot enable input.");
     }
}


// updateStatus remains the same
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
     } else {
         console.warn("Status element not found, cannot update status:", message);
     }
}


// --- Event Listeners ---
console.log("Checking function types before adding listeners:");
console.log("Type of nextLesson:", typeof nextLesson); // Should be "function"
console.log("Type of prevLesson:", typeof prevLesson); // Should be "function"
console.log("Type of retryLesson:", typeof retryLesson); // Should be "function"

// Check if elements exist before adding listeners
if (nextLessonButton) {
     console.log("nextLessonButton found, adding listener");
     nextLessonButton.addEventListener('click', nextLesson);
} else {
     console.log("nextLessonButton not found");
}

if (prevLessonButton) {
     console.log("prevLessonButton found, adding listener");
     prevLessonButton.addEventListener('click', prevLesson);
} else {
     console.log("prevLessonButton not found");
}

if (retryLessonButton) {
     console.log("retryLessonButton found, adding listener");
     retryLessonButton.addEventListener('click', retryLesson);
} else {
     console.log("retryLessonButton not found");
}


// --- Initial Setup ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded and parsed");

    // Check if core elements were found (using the variables declared at the top)
    // These should be found now that the script is at the end of the body
    if (!boardElement || !nextLessonButton || !prevLessonButton || !retryLessonButton || !statusElement || !lessonNameElement || !lessonCategoryElement || !lessonDescriptionElement) {
        console.error("One or more required HTML elements not found!");
         if (statusElement) {
             updateStatus("Error: Required HTML elements not found. Check your index.html.", 'incorrect');
         } else {
              console.error("Status element also not found.");
         }
        return; // Do NOT proceed if elements are missing
    } else {
        console.log("All required HTML elements found.");
    }


    // Load the first lesson when the page loads
    if (typeof chessLessons !== 'undefined' && chessLessons && chessLessons.length > 0) {
        console.log("Lessons data found, loading first lesson.");
        loadLesson(0);
    } else {
        console.warn("Lessons data not found or is empty.");
        updateStatus("No lessons defined in lessons.js", 'info');
        disableUserInput(); // Ensure input is off if no lessons
        updateNavigationButtons(); // Ensure buttons are disabled if no lessons
    }
});
