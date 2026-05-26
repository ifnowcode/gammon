const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const rollBtn = document.getElementById('rollBtn');
const diceDisplay = document.getElementById('diceDisplay');
const statusEl = document.getElementById('status');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const POINTS = 24;
const CHECKERS_PER_PLAYER = 15;

const PLAYER1 = 1; // moves from point 24 -> 1 (index 23 -> 0)
const PLAYER2 = -1; // moves from point 1 -> 24 (index 0 -> 23)

const TRIANGLE_WIDTH = WIDTH / 14; // 12 points + 2 gutters
const TRIANGLE_HEIGHT = HEIGHT / 2;
const BOARD_MARGIN = TRIANGLE_WIDTH;

const CHECKER_RADIUS = TRIANGLE_WIDTH * 0.4;

let board; // array of {count, player} or null
let bar = { [PLAYER1]: 0, [PLAYER2]: 0 };
let borneOff = { [PLAYER1]: 0, [PLAYER2]: 0 };

let currentPlayer = PLAYER1;
let dice = [];
let diceMoves = [];
let selected = null; // {fromBar: bool, pointIndex: number|null}

let boardStyle = {
  classic: { dark: '#5b3b1a', light:'#2f1b0f', background: "#c9a26b"},
  coffee: { dark: '#5b3b1a', light:'#2f1b0f', background: "#111"},
  casino: { dark: 'black', light:'red', background: "green"},
  monchrome: { dark: 'black', light:'white', background: "gray"}
};
  
let selectedStyle = boardStyle['classic'];

function initBoard() {
  board = Array.from({ length: POINTS }, () => ({ count: 0, player: 0 }));
  bar[PLAYER1] = bar[PLAYER2] = 0;
  borneOff[PLAYER1] = borneOff[PLAYER2] = 0;

  // Standard setup
  setPoint(23, PLAYER1, 2);
  setPoint(12, PLAYER1, 5);
  setPoint(7, PLAYER1, 3);
  setPoint(5, PLAYER1, 5);

  setPoint(0, PLAYER2, 2);
  setPoint(11, PLAYER2, 5);
  setPoint(16, PLAYER2, 3);
  setPoint(18, PLAYER2, 5);
}

function setPoint(index, player, count) {
  board[index].player = player;
  board[index].count = count;
}

function drawBoard() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Background
  ctx.fillStyle = selectedStyle.background;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Center bar
  ctx.fillStyle = '#3b2a1a';
  ctx.fillRect(WIDTH / 2 - TRIANGLE_WIDTH / 2, 0, TRIANGLE_WIDTH, HEIGHT);

  // Triangles
  for (let i = 0; i < 12; i++) {
    drawTriangle(i, true);
    drawTriangle(i, false);
  }

  // Points checkers
  for (let i = 0; i < POINTS; i++) {
    drawPointCheckers(i);
  }

  // Bar checkers
  drawBarCheckers(PLAYER1);
  drawBarCheckers(PLAYER2);

  // Borne off areas
  drawBorneOff(PLAYER1);
  drawBorneOff(PLAYER2);

  // Highlight selection
  if (selected) {
    if (selected.fromBar) {
      console.log("highlightBar ${currentPlayer}", currentPlayer);
      highlightBar(currentPlayer);
    } else if (selected.pointIndex != null) {
      console.log("highlightPoint ${selected.pointIndex}", selected.pointIndex);
      highlightPoint(selected.pointIndex);
    }
  }
}

function drawTriangle(i, top) {
  const isLeft = i < 6;
  const index = isLeft ? i : i + 2;
  //const x = BOARD_MARGIN * index * TRIANGLE_WIDTH;
  const x = index * TRIANGLE_WIDTH;
  const color = i % 2 === 0 ? selectedStyle.dark : selectedStyle.light;

  ctx.fillStyle = color;
  ctx.beginPath();
  if (top) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x + TRIANGLE_WIDTH, 0);
    ctx.lineTo(x + TRIANGLE_WIDTH / 2, TRIANGLE_HEIGHT);
  } else {
    ctx.moveTo(x, HEIGHT);
    ctx.lineTo(x + TRIANGLE_WIDTH, HEIGHT);
    ctx.lineTo(x + TRIANGLE_WIDTH / 2, HEIGHT - TRIANGLE_HEIGHT);
  }
  ctx.closePath();
  ctx.fill();
}

function pointToCoords(index, stackIndex, player) {
  const topHalf = index >= 12;
  const localIndex = topHalf ? index - 12 : index;
  const isLeft = localIndex < 6;
  const col = isLeft ? localIndex : localIndex + 2;
  const x = col * TRIANGLE_WIDTH + TRIANGLE_WIDTH / 2;

  const maxStack = 5;
  const offset = CHECKER_RADIUS * 1.1;
  let yBase, y;

  if (!topHalf) {
    yBase = HEIGHT - CHECKER_RADIUS - 5;
    y = yBase - Math.min(stackIndex, maxStack - 1) * offset;
  } else {
    yBase = CHECKER_RADIUS + 5;
    y = yBase + Math.min(stackIndex, maxStack - 1) * offset;
  }

  return { x, y };
}

function drawPointCheckers(index) {
  const { count, player } = board[index];
  if (count === 0) return;

  for (let i = 0; i < count; i++) {
    const { x, y } = pointToCoords(index, i, player);
    drawChecker(x, y, player);
  }
}

function drawChecker(x, y, player) {
  ctx.beginPath();
  ctx.arc(x, y, CHECKER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = player === PLAYER1 ? '#f5f0e6' : '#2b2118';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#000';
  ctx.stroke();
}

function drawDebugChecker(x, y, player) {
  ctx.beginPath();
  ctx.arc(x, y, CHECKER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = player === PLAYER1 ? '#f5f0e6' : '#2b2118';
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#f00';
  ctx.stroke();
}

function drawBarCheckers(player) {
  const count = bar[player];
  if (count === 0) return;

  const x = WIDTH / 2;
  const maxStack = 5;
  const offset = CHECKER_RADIUS * 1.1;

  for (let i = 0; i < count; i++) {
    let yBase, y;
    if (player === PLAYER1) {
      yBase = HEIGHT - CHECKER_RADIUS - 5;
      y = yBase - Math.min(i, maxStack - 1) * offset;
    } else {
      yBase = CHECKER_RADIUS + 5;
      y = yBase + Math.min(i, maxStack - 1) * offset;
    }
    drawChecker(x, y, player);
  }
}

function drawBorneOff(player) {
  const count = borneOff[player];
  if (count === 0) return;

  const x = player === PLAYER1 ? WIDTH - CHECKER_RADIUS * 2 : CHECKER_RADIUS * 2;
  const maxStack = 15;
  const offset = CHECKER_RADIUS * 0.8;

  for (let i = 0; i < count; i++) {
    const y = HEIGHT / 2 + (i - maxStack / 2) * offset;
    drawDebugChecker(x, y, player);
  }
}

function highlightPoint(index) {
  const topHalf = index >= 12;
  const localIndex = topHalf ? index - 12 : index;
  const isLeft = localIndex < 6;
  const col = isLeft ? localIndex : localIndex + 2;
  //const x = BOARD_MARGIN * col * TRIANGLE_WIDTH;
  const x = col * TRIANGLE_WIDTH;
  const y = topHalf ? 0 : HEIGHT - TRIANGLE_HEIGHT;

  ctx.save();
  ctx.strokeStyle = 'yellow';
  ctx.lineWidth = 4;
  ctx.strokeRect(x + 2, y + 2, TRIANGLE_WIDTH - 4, TRIANGLE_HEIGHT - 4);
  ctx.restore();
}

function highlightBar(player) {
  ctx.save();
  ctx.strokeStyle = 'yellow';
  ctx.lineWidth = 4;
  const x = WIDTH / 2 - TRIANGLE_WIDTH / 2;
  const y = player === PLAYER1 ? HEIGHT / 2 : 0;
  const h = HEIGHT / 2;
  ctx.strokeRect(x + 2, y + 2, TRIANGLE_WIDTH - 4, h - 4);
  ctx.restore();
}

function rollDice() {
  if (diceMoves.length > 0) return;
  const d1 = 1 + Math.floor(Math.random() * 6);
  const d2 = 1 + Math.floor(Math.random() * 6);
  dice = [d1, d2];
  diceMoves = d1 === d2 ? [d1, d1, d1, d1] : [d1, d2];
  diceDisplay.textContent = `Dice: ${diceMoves.join(', ')}`;
  updateStatus();
}

function pointFromClick(x, y) {
  // Bar click
  const barX1 = WIDTH / 2 - TRIANGLE_WIDTH / 2;
  const barX2 = WIDTH / 2 + TRIANGLE_WIDTH / 2;
  if (x >= barX1 && x <= barX2) {
    if (currentPlayer === PLAYER1 && y > HEIGHT / 2) return { fromBar: true };
    if (currentPlayer === PLAYER2 && y < HEIGHT / 2) return { fromBar: true };
  }

  // Points
  //if (x < BOARD_MARGIN || x > WIDTH-BOARD_MARGIN) return null;
  if (x < 0 || x > WIDTH) {
    console.log("Point Click return: ${x}", x);
    return null;
  }
  
  //const col = Math.floor((x) / TRIANGLE_WIDTH);
  const col = Math.floor((x-BOARD_MARGIN) / TRIANGLE_WIDTH);
  if (col === 5 || col === 6) {
    console.log("Point Click return: ${col}", col);
    return null;
  }

  const localCol = col > 5 ? col - 2 : col;
  const top = y < HEIGHT / 2;
  const localIndex = localCol;
  const index = top ? localIndex + 13 : localIndex+1;
  console.log("Point Click: ${col}", col, "${localIndex}", localIndex, "${index}", index);
  //const index = top
  //  ? localIndex + 12          // top: 12 → 23 left→right
  //  : 11 - localIndex;         // bottom: 11 → 0 left→right

  return { pointIndex: index };
}

function hasMoves(player) {
  if (diceMoves.length === 0) return false;
  if (bar[player] > 0) {
    for (const d of diceMoves) {
      if (canEnterFromBar(player, d)) return true;
    }
    return false;
  }
  for (let i = 0; i < POINTS; i++) {
    if (board[i].player === player && board[i].count > 0) {
      for (const d of diceMoves) {
        if (canMoveFromPoint(player, i, d)) return true;
      }
    }
  }
  return false;
}

function canEnterFromBar(player, die) {
  const dest = entryPoint(player, die);
  if (dest < 0 || dest >= POINTS) return false;
  const p = board[dest];
  return !(p.player === -player && p.count >= 2);
}

function entryPoint(player, die) {
  if (player === PLAYER1) {
    return 24 - die; // index 23..0
  } else {
    return die - 1; // index 0..23
  }
}

function canMoveFromPoint(player, index, die) {
  const dest = destinationPoint(player, index, die);
  if (dest === null) return false;

  if (dest >= 0 && dest < POINTS) {
    const p = board[dest];
    if (p.player === -player && p.count >= 2) return false;
    return true;
  }

  if (dest === 'bear') {
    return canBearOff(player, index, die);
  }

  return false;
}

function destinationPoint(player, index, die) {
  if (player === PLAYER1) {
    const dest = index - die;
    return dest >= 0 ? dest : 'bear';
  } else {
    const dest = index + die;
    return dest <= 23 ? dest : 'bear';
  }
}

function inHomeBoard(player, index) {
  if (player === PLAYER1) return index >= 0 && index <= 5;
  return index >= 18 && index <= 23;
}

function allInHome(player) {
  for (let i = 0; i < POINTS; i++) {
    if (board[i].player === player && board[i].count > 0 && !inHomeBoard(player, i)) {
      return false;
    }
  }
  return bar[player] === 0;
}

function canBearOff(player, index, die) {
  if (!allInHome(player)) return false;
  if (!inHomeBoard(player, index)) return false;

  if (player === PLAYER1) {
    const target = index - die;
    if (target < 0) {
      for (let i = index + 1; i <= 5; i++) {
        if (board[i].player === PLAYER1 && board[i].count > 0) return false;
      }
      return true;
    }
    return target === -1;
  } else {
    const target = index + die;
    if (target > 23) {
      for (let i = index - 1; i >= 18; i--) {
        if (board[i].player === PLAYER2 && board[i].count > 0) return false;
      }
      return true;
    }
    return target === 24;
  }
}

function useDie(distance) {
  const idx = diceMoves.indexOf(distance);
  if (idx !== -1) {
    diceMoves.splice(idx, 1);
    return true;
  }
  return false;
}

function handleClick(e) {
  const rect = canvas.getBoundingClientRect();
  const x = (e.clientX - rect.left) * (canvas.width / rect.width);
  const y = (e.clientY - rect.top) * (canvas.height / rect.height);

  ////console.log("Dice Moves: ${diceMoves.length}", diceMoves.length);
  //if (diceMoves.length === 0) return;

  const hit = pointFromClick(x, y);
  console.log("Hit ${hit}", hit, "${diceMoves.length}", diceMoves.length);
  
  //console.log("Dice Moves: ${diceMoves.length}", diceMoves.length);
  if (diceMoves.length === 0) return;
  
  if (!hit) return;

  if (!selected) {
    if (hit.fromBar) {
      if (bar[currentPlayer] > 0) {
        selected = { fromBar: true, pointIndex: null };
      }
    } else if (hit.pointIndex != null) {
      const p = board[hit.pointIndex];
      if (p.player === currentPlayer && p.count > 0 && bar[currentPlayer] === 0) {
        selected = { fromBar: false, pointIndex: hit.pointIndex };
      }
    }
  } else {
    if (selected.fromBar) {
      if (hit.fromBar) {
        selected = null;
      } else if (hit.pointIndex != null) {
        attemptMoveFromBar(hit.pointIndex);
      }
    } else {
      if (hit.pointIndex != null) {
        attemptMoveFromPoint(selected.pointIndex, hit.pointIndex);
      } else if (hit.fromBar) {
        selected = null;
      }
    }
  }

  drawBoard();
  updateStatus();
}

function attemptMoveFromBar(destIndex) {
  const player = currentPlayer;
  const dirDie = moveDistanceFromBar(player, destIndex);
  if (dirDie == null) return;

  if (!diceMoves.includes(dirDie)) return;
  if (!canEnterFromBar(player, dirDie)) return;

  const dest = entryPoint(player, dirDie);
  if (dest !== destIndex) return;

  const p = board[dest];
  if (p.player === -player && p.count === 1) {
    p.player = player;
    p.count = 1;
    bar[-player]++;
  } else if (p.player === -player && p.count >= 2) {
    return;
  } else if (p.count === 0) {
    p.player = player;
    p.count = 1;
  } else if (p.player === player) {
    p.count++;
  }

  bar[player]--;
  useDie(dirDie);
  selected = null;
  endTurnIfNeeded();
}

function moveDistanceFromBar(player, destIndex) {
  if (player === PLAYER1) {
    return 24 - destIndex;
  } else {
    return destIndex + 1;
  }
}

function attemptMoveFromPoint(fromIndex, destIndex) {
  const player = currentPlayer;
  const die = moveDistance(player, fromIndex, destIndex);
  if (die == null) {
    if (canBearOff(player, fromIndex, maxDieForBear(player, fromIndex))) {
      attemptBearOff(fromIndex);
    }
    return;
  }

  if (!diceMoves.includes(die)) return;
  if (!canMoveFromPoint(player, fromIndex, die)) return;

  const dest = destinationPoint(player, fromIndex, die);
  if (dest === 'bear') {
    if (!canBearOff(player, fromIndex, die)) return;
    board[fromIndex].count--;
    if (board[fromIndex].count === 0) board[fromIndex].player = 0;
    borneOff[player]++;
  } else {
    const p = board[dest];
    if (p.player === -player && p.count === 1) {
      p.player = player;
      p.count = 1;
      bar[-player]++;
    } else if (p.player === -player && p.count >= 2) {
      return;
    } else if (p.count === 0) {
      p.player = player;
      p.count = 1;
    } else if (p.player === player) {
      p.count++;
    }

    board[fromIndex].count--;
    if (board[fromIndex].count === 0) board[fromIndex].player = 0;
  }

  useDie(die);
  selected = null;
  endTurnIfNeeded();
}

function moveDistance(player, fromIndex, destIndex) {
  if (player === PLAYER1) {
    const d = fromIndex - destIndex;
    return d > 0 ? d : null;
  } else {
    const d = destIndex - fromIndex;
    return d > 0 ? d : null;
  }
}

function maxDieForBear(player, fromIndex) {
  return player === PLAYER1
    ? fromIndex + 1
    : 24 - fromIndex;
}


function attemptBearOff(fromIndex) {
  const player = currentPlayer;
  if (!allInHome(player)) return;

  const die = maxDieForBear(player, fromIndex);
  const usable = diceMoves.find(d => d >= die);
  if (!usable) return;

  board[fromIndex].count--;
  if (board[fromIndex].count === 0) board[fromIndex].player = 0;
  borneOff[player]++;
  useDie(usable);
  selected = null;
  endTurnIfNeeded();
}

function endTurnIfNeeded() {
  if (borneOff[currentPlayer] === CHECKERS_PER_PLAYER) {
    statusEl.textContent = currentPlayer === PLAYER1 ? 'Player 1 wins!' : 'Player 2 wins!';
    diceMoves = [];
    rollBtn.disabled = true;
    return;
  }

  if (diceMoves.length === 0 || !hasMoves(currentPlayer)) {
    currentPlayer = -currentPlayer;
    dice = [];
    diceMoves = [];
    diceDisplay.textContent = 'Dice: -';
  }
  drawBoard();
  updateStatus();
}

function updateStatus() {
  const p = currentPlayer === PLAYER1 ? 'Player 1 (light)' : 'Player 2 (dark)';
  const diceText = diceMoves.length ? diceMoves.join(', ') : 'Roll to move';
  statusEl.textContent = `${p} — Moves: ${diceText}`;
}

rollBtn.addEventListener('click', () => {
  rollDice();
  drawBoard();
});

canvas.addEventListener('click', handleClick);

initBoard();
drawBoard();
updateStatus();