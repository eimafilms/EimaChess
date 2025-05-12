let board = null;
let game = new Chess();
let stockfish = new Worker('libs/stockfish.js');

let engineLevel = 5; // 0 (weakest) to 20 (strongest)

stockfish.postMessage("uci");
stockfish.postMessage("setoption name Skill Level value " + engineLevel);
stockfish.postMessage("isready");

function onDragStart(source, piece, position, orientation) {
  if (game.game_over() || (game.turn() === 'b')) return false;
}

function makeEngineMove() {
  stockfish.postMessage("position fen " + game.fen());
  stockfish.postMessage("go depth " + (engineLevel + 5)); // depth based on level

  stockfish.onmessage = function(event) {
    if (event.data.startsWith("bestmove")) {
      const move = event.data.split(" ")[1];
      game.move({ from: move.substring(0, 2), to: move.substring(2, 4), promotion: 'q' });
      board.position(game.fen());
    }
  };
}

function onDrop(source, target) {
  const move = game.move({
    from: source,
    to: target,
    promotion: 'q'
  });

  if (move === null) return 'snapback';

  window.setTimeout(makeEngineMove, 250);
}

const config = {
  draggable: true,
  position: 'start',
  onDragStart: onDragStart,
  onDrop: onDrop
};

board = Chessboard('board', config);
