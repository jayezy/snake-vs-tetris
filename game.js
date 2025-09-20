// Game constants
const GRID_SIZE = 30;
const CANVAS_WIDTH = 562; // 624 * 0.9 (10% reduction from current)
const GRID_WIDTH = Math.floor(CANVAS_WIDTH / GRID_SIZE); // 18 blocks wide
const GRID_HEIGHT = 25; // 25 complete blocks tall
const CANVAS_HEIGHT = GRID_HEIGHT * GRID_SIZE; // 750px (25 * 30)

// Game state
let gameRunning = true;
let canvas, ctx;

// Audio context for sound effects
let audioContext;
let audioInitialized = false;

// Snake
let snake = [];
let snakeDirection = { x: 1, y: 0 };

// Tetris pieces
let fallingPiece = null;
let settledPieces = [];
let pieceDropTime = 0;
let currentPieceDropInterval = 1000; // Base: 1 second (increased frequency)
let pieceSuspended = false; // Track if current piece is suspended by snake

// Apple
let apple = null;

// Star power-up
let star = null;
let starSpawnTime = 0;
let destructionMode = false;
let destructionModeTime = 0;
const DESTRUCTION_MODE_DURATION = 5000; // 5 seconds

// Explosion system
let explosions = [];

// Score
let applesEaten = 0;
let currentScore = 0;
let highScore = 0;

// Dynamic speed system
let currentSnakeSpeed = 200; // Base snake speed in milliseconds
let currentTetrisFallSpeed = 1; // How many pixels tetris pieces fall per update
const SPEED_INCREASE_FACTOR = 0.9; // 10% faster each apple (multiply by 0.9)

// Tetris piece shapes with vintage colors (traditional Tetris pieces)
const TETRIS_PIECES = [
    // I-piece (line)
    {
        color: '#ff6b6b',
        rotations: [
            [[0, 0], [1, 0], [2, 0], [3, 0]], // Horizontal
            [[0, 0], [0, 1], [0, 2], [0, 3]]  // Vertical
        ]
    },
    // O-piece (square)
    {
        color: '#ffd93d',
        rotations: [
            [[0, 0], [1, 0], [0, 1], [1, 1]] // Square (same for all rotations)
        ]
    },
    // T-piece
    {
        color: '#6c5ce7',
        rotations: [
            [[1, 0], [0, 1], [1, 1], [2, 1]], // T pointing up
            [[1, 0], [1, 1], [1, 2], [2, 1]], // T pointing right
            [[0, 1], [1, 1], [2, 1], [1, 2]], // T pointing down
            [[0, 1], [1, 0], [1, 1], [1, 2]]  // T pointing left
        ]
    },
    // L-piece
    {
        color: '#a8e6cf',
        rotations: [
            [[0, 0], [0, 1], [0, 2], [1, 2]], // L pointing right
            [[0, 0], [1, 0], [2, 0], [0, 1]], // L pointing down
            [[0, 0], [1, 0], [1, 1], [1, 2]], // L pointing left
            [[2, 0], [0, 1], [1, 1], [2, 1]]  // L pointing up
        ]
    },
    // J-piece (reverse L)
    {
        color: '#fd79a8',
        rotations: [
            [[1, 0], [1, 1], [1, 2], [0, 2]], // J pointing right
            [[0, 0], [0, 1], [1, 1], [2, 1]], // J pointing down
            [[0, 0], [1, 0], [0, 1], [0, 2]], // J pointing left
            [[0, 0], [1, 0], [2, 0], [2, 1]]  // J pointing up
        ]
    },
    // S-piece
    {
        color: '#74b9ff',
        rotations: [
            [[1, 0], [2, 0], [0, 1], [1, 1]], // S horizontal
            [[0, 0], [0, 1], [1, 1], [1, 2]]  // S vertical
        ]
    },
    // Z-piece
    {
        color: '#e17055',
        rotations: [
            [[0, 0], [1, 0], [1, 1], [2, 1]], // Z horizontal
            [[1, 0], [0, 1], [1, 1], [0, 2]]  // Z vertical
        ]
    }
];

// Initialize game
function init() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');

    // Load high score from localStorage
    highScore = parseInt(localStorage.getItem('tetrisSnakeHighScore') || '0');
    document.getElementById('highScore').textContent = highScore;

    // Initialize snake at center
    const centerX = Math.floor(GRID_WIDTH / 2);
    const centerY = Math.floor(GRID_HEIGHT / 2);

    snake = [
        { x: centerX, y: centerY },
        { x: centerX - 1, y: centerY },
        { x: centerX - 2, y: centerY },
        { x: centerX - 3, y: centerY }
    ];

    // Initialize apple
    spawnApple();

    // Initialize star system
    starSpawnTime = Date.now() + Math.random() * 8000 + 5000; // First star in 5-13 seconds

    // Update initial score display
    updateScore();

    // Start game loop
    gameLoop();

    // Event listeners for controls (only add once)
    if (!document.hasEventListener) {
        document.addEventListener('keydown', handleKeyPress);
        document.hasEventListener = true;
    }
}

// Game loop
function gameLoop() {
    if (!gameRunning) return;

    update();
    render();

    setTimeout(gameLoop, currentSnakeSpeed); // Dynamic snake speed
}

// Update game state
function update() {
    // Move snake
    const head = { ...snake[0] };
    head.x += snakeDirection.x;
    head.y += snakeDirection.y;

    // Check wall collision
    if (head.x < 0 || head.x >= GRID_WIDTH || head.y < 0 || head.y >= GRID_HEIGHT) {
        endGame("Snake hit the wall!");
        return;
    }

    // Check self collision
    if (snake.some(segment => segment.x === head.x && segment.y === head.y)) {
        endGame("Snake hit itself!");
        return;
    }

    // Check collision with settled Tetris pieces
    if (settledPieces.some(piece => piece.x === head.x && piece.y === head.y)) {
        if (destructionMode) {
            // Create explosion and destroy the piece
            const destroyedPiece = settledPieces.find(piece => piece.x === head.x && piece.y === head.y);
            createExplosion(destroyedPiece.x, destroyedPiece.y);
            settledPieces = settledPieces.filter(piece => !(piece.x === head.x && piece.y === head.y));
            currentScore += 20; // Bonus points for destroying piece
            updateScore();
        } else {
            endGame("Snake hit a Tetris piece!");
            return;
        }
    }

    // Check collision with falling piece
    if (fallingPiece) {
        const blocks = fallingPiece.pieceType.rotations[fallingPiece.rotationIndex];
        for (let block of blocks) {
            const blockX = fallingPiece.x + block[0];
            const blockY = Math.round(fallingPiece.y) + block[1];

            if (head.x === blockX && head.y === blockY) {
                if (destructionMode) {
                    // Create explosion and destroy falling piece
                    createExplosion(blockX, blockY);
                    fallingPiece = null;
                    pieceSuspended = false;
                    currentScore += 30; // More points for destroying falling piece
                    updateScore();
                    break;
                } else {
                    // Snake hits falling piece - game over
                    endGame("Snake hit a Tetris piece!");
                    return;
                }
            }
        }
    }

    snake.unshift(head);

    // Check apple collision
    if (apple && head.x === apple.x && head.y === apple.y) {
        applesEaten++;
        currentScore += 10 * snake.length; // Score increases based on snake length
        updateScore();
        spawnApple();

        // Play happy sound
        playAppleSound();

        // Increase speeds by 10% (multiply by 0.9 for 10% faster)
        currentSnakeSpeed = Math.max(50, currentSnakeSpeed * SPEED_INCREASE_FACTOR); // Min 50ms
        currentPieceDropInterval = Math.max(200, currentPieceDropInterval * SPEED_INCREASE_FACTOR); // Min 200ms
        currentTetrisFallSpeed = Math.min(5, currentTetrisFallSpeed * 1.1); // Max 5 pixels per update

        // Release suspended piece when apple is eaten
        if (pieceSuspended) {
            pieceSuspended = false;
        }
    } else {
        snake.pop();
    }

    // Check star collision
    if (star && head.x === star.x && head.y === star.y) {
        currentScore += 50; // Bonus points for star
        updateScore();
        star = null;
        starSpawnTime = Date.now() + Math.random() * 8000 + 5000; // Next star in 5-13 seconds

        // Activate destruction mode
        destructionMode = true;
        destructionModeTime = Date.now();
    }

    // Update falling Tetris piece
    updateTetrisPiece();

    // Update star and destruction mode
    updateStarSystem();

    // Update explosions
    updateExplosions();
}

// Update Tetris piece
function updateTetrisPiece() {
    const currentTime = Date.now();

    // Create new piece if none exists and interval has passed
    if (!fallingPiece && currentTime - pieceDropTime > currentPieceDropInterval) {
        createNewTetrisPiece();
        pieceDropTime = currentTime;
    }

    // Move falling piece down at dynamic speed
    if (fallingPiece && !pieceSuspended) {
        const newY = fallingPiece.y + currentTetrisFallSpeed;

        // Check if piece can fall (round to nearest grid position)
        const gridY = Math.round(newY);
        if (canPieceFall(fallingPiece.x, gridY, fallingPiece.pieceType, fallingPiece.rotationIndex)) {
            fallingPiece.y = newY;
        } else {
            // Check if piece should settle (only on solid ground/pieces, not snake)
            const gridY = Math.round(newY);
            if (shouldPieceSettle(fallingPiece.x, gridY, fallingPiece.pieceType, fallingPiece.rotationIndex)) {
                // Settle the piece at grid position
                const blocks = fallingPiece.pieceType.rotations[fallingPiece.rotationIndex];
                for (let block of blocks) {
                    settledPieces.push({
                        x: fallingPiece.x + block[0],
                        y: Math.round(fallingPiece.y) + block[1],
                        color: fallingPiece.pieceType.color
                    });
                }
                fallingPiece = null;
                pieceSuspended = false;
                pieceDropTime = currentTime;
            } else {
                // If blocked by snake, suspend the piece
                pieceSuspended = true;
            }
        }
    }
}

// Check if Tetris piece should settle (only on ground or other pieces, not snake)
function shouldPieceSettle(x, y, pieceType, rotationIndex) {
    const blocks = pieceType.rotations[rotationIndex];
    for (let block of blocks) {
        const blockX = x + block[0];
        const blockY = y + block[1];

        // Check bottom boundary
        if (blockY >= GRID_HEIGHT) return true;

        // Check collision with settled pieces only
        if (settledPieces.some(piece => piece.x === blockX && piece.y === blockY)) {
            return true;
        }
    }
    return false;
}

// Check if Tetris piece can move to new position (blocked by snake, settled pieces, or boundaries)
function canPieceFall(x, y, pieceType, rotationIndex) {
    const blocks = pieceType.rotations[rotationIndex];
    for (let block of blocks) {
        const blockX = x + block[0];
        const blockY = y + block[1];

        // Check bottom boundary
        if (blockY >= GRID_HEIGHT) return false;

        // Check collision with settled pieces
        if (settledPieces.some(piece => piece.x === blockX && piece.y === blockY)) {
            return false;
        }

        // Check collision with snake (blocks movement but doesn't settle)
        if (snake.some(segment => segment.x === blockX && segment.y === blockY)) {
            return false;
        }
    }
    return true;
}

// Create new Tetris piece
function createNewTetrisPiece() {
    const randomPieceType = TETRIS_PIECES[Math.floor(Math.random() * TETRIS_PIECES.length)];
    const startX = Math.floor(Math.random() * (GRID_WIDTH - 4)); // Leave margin for rotations

    fallingPiece = {
        x: startX,
        y: 0,
        pieceType: randomPieceType,
        rotationIndex: 0 // Start with first rotation
    };
    pieceSuspended = false; // New piece starts not suspended
}

// Spawn apple in accessible location
function spawnApple() {
    let validPositions = [];

    for (let x = 0; x < GRID_WIDTH; x++) {
        for (let y = 0; y < GRID_HEIGHT; y++) {
            if (!snake.some(segment => segment.x === x && segment.y === y) &&
                !settledPieces.some(piece => piece.x === x && piece.y === y)) {
                validPositions.push({ x, y });
            }
        }
    }

    if (validPositions.length > 0) {
        apple = validPositions[Math.floor(Math.random() * validPositions.length)];
    }
}

// Render game
function render() {
    // Clear canvas with vintage background
    const gradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#0a0a0a');
    gradient.addColorStop(0.5, '#1a1a1a');
    gradient.addColorStop(1, '#0f0f0f');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw vintage grid
    ctx.strokeStyle = '#2d1b0e';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.3;
    for (let x = 0; x <= GRID_WIDTH; x++) {
        ctx.beginPath();
        ctx.moveTo(x * GRID_SIZE, 0);
        ctx.lineTo(x * GRID_SIZE, CANVAS_HEIGHT);
        ctx.stroke();
    }
    for (let y = 0; y <= GRID_HEIGHT; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * GRID_SIZE);
        ctx.lineTo(CANVAS_WIDTH, y * GRID_SIZE);
        ctx.stroke();
    }
    ctx.globalAlpha = 1.0;

    // Draw snake (following grid format like Tetris pieces)
    snake.forEach((segment, index) => {
        if (index === 0) {
            // Draw snake head with vintage colors (glowing in destruction mode)
            ctx.fillStyle = destructionMode ? '#ff4500' : '#228b22'; // Orange when destructive, green normally
            ctx.fillRect(
                segment.x * GRID_SIZE + 1,
                segment.y * GRID_SIZE + 1,
                GRID_SIZE - 2,
                GRID_SIZE - 2
            );

            // Draw eyes (smaller to fit new grid format)
            ctx.fillStyle = 'white';
            const eyeSize = 4;
            const eyeOffset = 6;
            ctx.fillRect(
                segment.x * GRID_SIZE + eyeOffset,
                segment.y * GRID_SIZE + eyeOffset,
                eyeSize,
                eyeSize
            );
            ctx.fillRect(
                segment.x * GRID_SIZE + GRID_SIZE - eyeOffset - eyeSize,
                segment.y * GRID_SIZE + eyeOffset,
                eyeSize,
                eyeSize
            );

            // Draw pupils based on direction
            ctx.fillStyle = 'black';
            const pupilSize = 2;
            let pupilOffsetX = eyeOffset + 1;
            let pupilOffsetY = eyeOffset + 1;

            if (snakeDirection.x > 0) pupilOffsetX += 1; // Moving right
            if (snakeDirection.x < 0) pupilOffsetX -= 1; // Moving left
            if (snakeDirection.y > 0) pupilOffsetY += 1; // Moving down
            if (snakeDirection.y < 0) pupilOffsetY -= 1; // Moving up

            // Left pupil
            ctx.fillRect(
                segment.x * GRID_SIZE + pupilOffsetX,
                segment.y * GRID_SIZE + pupilOffsetY,
                pupilSize,
                pupilSize
            );
            // Right pupil
            ctx.fillRect(
                segment.x * GRID_SIZE + GRID_SIZE - eyeOffset - eyeSize + (pupilOffsetX - eyeOffset - 1),
                segment.y * GRID_SIZE + pupilOffsetY,
                pupilSize,
                pupilSize
            );

        } else {
            // Draw snake body with vintage color (glowing in destruction mode)
            ctx.fillStyle = destructionMode ? '#ff6347' : '#006400'; // Tomato red when destructive, dark green normally
            ctx.fillRect(
                segment.x * GRID_SIZE + 1,
                segment.y * GRID_SIZE + 1,
                GRID_SIZE - 2,
                GRID_SIZE - 2
            );
        }
    });

    // Draw settled Tetris pieces
    settledPieces.forEach(piece => {
        ctx.fillStyle = piece.color;
        ctx.fillRect(
            piece.x * GRID_SIZE + 1,
            piece.y * GRID_SIZE + 1,
            GRID_SIZE - 2,
            GRID_SIZE - 2
        );
    });

    // Draw falling Tetris piece
    if (fallingPiece) {
        ctx.fillStyle = fallingPiece.pieceType.color;
        const blocks = fallingPiece.pieceType.rotations[fallingPiece.rotationIndex];
        for (let block of blocks) {
            const x = (fallingPiece.x + block[0]) * GRID_SIZE + 1;
            const y = (fallingPiece.y + block[1]) * GRID_SIZE + 1;
            ctx.fillRect(x, y, GRID_SIZE - 2, GRID_SIZE - 2);
        }
    }

    // Draw apple
    if (apple) {
        const centerX = apple.x * GRID_SIZE + GRID_SIZE / 2;
        const centerY = apple.y * GRID_SIZE + GRID_SIZE / 2;
        const appleSize = GRID_SIZE / 3;

        // Draw apple body (red)
        ctx.fillStyle = '#8b0000'; // Dark red for vintage look
        ctx.beginPath();
        ctx.arc(centerX, centerY + 2, appleSize, 0, 2 * Math.PI);
        ctx.fill();

        // Draw apple highlight
        ctx.fillStyle = '#dc143c'; // Lighter red highlight
        ctx.beginPath();
        ctx.arc(centerX - 3, centerY - 1, appleSize * 0.7, 0, 2 * Math.PI);
        ctx.fill();

        // Draw apple stem (brown)
        ctx.fillStyle = '#654321';
        ctx.fillRect(centerX - 2, centerY - appleSize - 2, 4, 8);

        // Draw apple leaf (green)
        ctx.fillStyle = '#228b22';
        ctx.beginPath();
        ctx.ellipse(centerX + 4, centerY - appleSize, 4, 2, Math.PI / 4, 0, 2 * Math.PI);
        ctx.fill();
    }

    // Draw star power-up
    if (star) {
        const centerX = star.x * GRID_SIZE + GRID_SIZE / 2;
        const centerY = star.y * GRID_SIZE + GRID_SIZE / 2;
        const starSize = GRID_SIZE / 3;

        // Draw glowing star
        ctx.fillStyle = '#ffd700'; // Gold color
        ctx.strokeStyle = '#ffff00'; // Yellow outline
        ctx.lineWidth = 2;

        // Draw 5-pointed star
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
            const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
            const x = centerX + Math.cos(angle) * starSize;
            const y = centerY + Math.sin(angle) * starSize;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);

            const innerAngle = ((i + 0.5) * 4 * Math.PI) / 5 - Math.PI / 2;
            const innerX = centerX + Math.cos(innerAngle) * starSize * 0.4;
            const innerY = centerY + Math.sin(innerAngle) * starSize * 0.4;
            ctx.lineTo(innerX, innerY);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Add glowing effect
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
    }

    // Draw explosions
    explosions.forEach(explosion => {
        const centerX = explosion.x * GRID_SIZE + GRID_SIZE / 2;
        const centerY = explosion.y * GRID_SIZE + GRID_SIZE / 2;
        const progress = (Date.now() - explosion.startTime) / explosion.duration;
        const maxRadius = GRID_SIZE;

        if (progress < 1) {
            // Outer explosion circle
            ctx.fillStyle = `rgba(255, 69, 0, ${1 - progress})`; // Orange fading out
            ctx.beginPath();
            ctx.arc(centerX, centerY, maxRadius * progress, 0, 2 * Math.PI);
            ctx.fill();

            // Inner explosion circle
            ctx.fillStyle = `rgba(255, 255, 0, ${1 - progress * 0.7})`; // Yellow fading out slower
            ctx.beginPath();
            ctx.arc(centerX, centerY, maxRadius * progress * 0.6, 0, 2 * Math.PI);
            ctx.fill();

            // Core explosion
            ctx.fillStyle = `rgba(255, 255, 255, ${1 - progress * 0.5})`; // White core
            ctx.beginPath();
            ctx.arc(centerX, centerY, maxRadius * progress * 0.3, 0, 2 * Math.PI);
            ctx.fill();

            // Explosion particles
            for (let i = 0; i < 8; i++) {
                const angle = (i * Math.PI) / 4;
                const distance = maxRadius * progress * 1.5;
                const particleX = centerX + Math.cos(angle) * distance;
                const particleY = centerY + Math.sin(angle) * distance;

                ctx.fillStyle = `rgba(255, 165, 0, ${1 - progress})`;
                ctx.beginPath();
                ctx.arc(particleX, particleY, 3, 0, 2 * Math.PI);
                ctx.fill();
            }
        }
    });
}

// Handle key presses
function handleKeyPress(event) {
    // Initialize audio on first user interaction
    initAudio();

    // If game is over and Enter is pressed, restart game
    if (!gameRunning && event.key === 'Enter') {
        restartGame();
        return;
    }

    if (!gameRunning) return;

    // Player 1 (Snake) controls
    switch (event.key) {
        case 'ArrowUp':
            if (snakeDirection.y !== 1) snakeDirection = { x: 0, y: -1 };
            break;
        case 'ArrowDown':
            if (snakeDirection.y !== -1) snakeDirection = { x: 0, y: 1 };
            break;
        case 'ArrowLeft':
            if (snakeDirection.x !== 1) snakeDirection = { x: -1, y: 0 };
            break;
        case 'ArrowRight':
            if (snakeDirection.x !== -1) snakeDirection = { x: 1, y: 0 };
            break;
    }

    // Player 2 (Tetris) controls
    if (fallingPiece) {
        switch (event.key.toLowerCase()) {
            case 'a':
                // Move piece left
                if (canMovePiece(fallingPiece.x - 1, fallingPiece.y, fallingPiece.pieceType, fallingPiece.rotationIndex)) {
                    fallingPiece.x--;
                }
                break;
            case 'd':
                // Move piece right
                if (canMovePiece(fallingPiece.x + 1, fallingPiece.y, fallingPiece.pieceType, fallingPiece.rotationIndex)) {
                    fallingPiece.x++;
                }
                break;
            case 's':
                // Rotate clockwise
                rotatePiece(true);
                break;
            case 'w':
                // Rotate counterclockwise
                rotatePiece(false);
                break;
        }
    }

    event.preventDefault();
}

// Check if Tetris piece can move to new position (for player controls)
function canMovePiece(x, y, pieceType, rotationIndex) {
    const blocks = pieceType.rotations[rotationIndex];
    for (let block of blocks) {
        const blockX = x + block[0];
        const blockY = y + block[1];

        // Check boundaries
        if (blockX < 0 || blockX >= GRID_WIDTH || blockY >= GRID_HEIGHT) {
            return false;
        }

        // Check collision with settled pieces
        if (settledPieces.some(piece => piece.x === blockX && piece.y === blockY)) {
            return false;
        }

        // Check collision with snake
        if (snake.some(segment => segment.x === blockX && segment.y === blockY)) {
            return false;
        }
    }
    return true;
}

// Update score display
function updateScore() {
    document.getElementById('snakeLength').textContent = snake.length;
    document.getElementById('currentScore').textContent = currentScore;

    // Update high score if current score beats it
    if (currentScore > highScore) {
        highScore = currentScore;
        localStorage.setItem('tetrisSnakeHighScore', highScore);
        document.getElementById('highScore').textContent = highScore;
    }
}

// End game
function endGame(message) {
    gameRunning = false;
    playDeathSound(); // Play sad sound when snake dies
    document.getElementById('gameOver').style.display = 'block';
}

// Restart game
function restartGame() {
    gameRunning = true;
    snake = [];
    snakeDirection = { x: 1, y: 0 };
    fallingPiece = null;
    settledPieces = [];
    pieceDropTime = 0;
    apple = null;
    applesEaten = 0;
    currentScore = 0;
    pieceSuspended = false;
    star = null;
    starSpawnTime = 0;
    destructionMode = false;
    destructionModeTime = 0;
    explosions = [];

    // Reset speeds to initial values
    currentSnakeSpeed = 200;
    currentPieceDropInterval = 1000;
    currentTetrisFallSpeed = 1;

    document.getElementById('gameOver').style.display = 'none';

    init();
}

// Update star system
function updateStarSystem() {
    const currentTime = Date.now();

    // Check if destruction mode should end
    if (destructionMode && currentTime - destructionModeTime > DESTRUCTION_MODE_DURATION) {
        destructionMode = false;
    }

    // Spawn star randomly
    if (!star && currentTime > starSpawnTime) {
        spawnStar();
    }
}

// Spawn star at random location
function spawnStar() {
    let validPositions = [];

    for (let x = 0; x < GRID_WIDTH; x++) {
        for (let y = 0; y < GRID_HEIGHT; y++) {
            if (!snake.some(segment => segment.x === x && segment.y === y) &&
                !settledPieces.some(piece => piece.x === x && piece.y === y) &&
                (!apple || (apple.x !== x || apple.y !== y))) {
                validPositions.push({ x, y });
            }
        }
    }

    if (validPositions.length > 0) {
        star = validPositions[Math.floor(Math.random() * validPositions.length)];
    }
}

// Create explosion at position
function createExplosion(x, y) {
    explosions.push({
        x: x,
        y: y,
        startTime: Date.now(),
        duration: 600 // 600ms explosion duration
    });
}

// Update explosions
function updateExplosions() {
    const currentTime = Date.now();
    explosions = explosions.filter(explosion =>
        currentTime - explosion.startTime < explosion.duration
    );
}

// Rotate piece function
function rotatePiece(clockwise) {
    if (!fallingPiece) return;

    const rotations = fallingPiece.pieceType.rotations;
    let newRotationIndex;

    if (clockwise) {
        newRotationIndex = (fallingPiece.rotationIndex + 1) % rotations.length;
    } else {
        newRotationIndex = (fallingPiece.rotationIndex - 1 + rotations.length) % rotations.length;
    }

    // Check if rotation is valid
    if (canMovePiece(fallingPiece.x, fallingPiece.y, fallingPiece.pieceType, newRotationIndex)) {
        fallingPiece.rotationIndex = newRotationIndex;
    } else {
        // Try wall kicks (move piece left or right if rotation doesn't fit)
        for (let kick = 1; kick <= 2; kick++) {
            // Try moving left
            if (canMovePiece(fallingPiece.x - kick, fallingPiece.y, fallingPiece.pieceType, newRotationIndex)) {
                fallingPiece.x -= kick;
                fallingPiece.rotationIndex = newRotationIndex;
                return;
            }
            // Try moving right
            if (canMovePiece(fallingPiece.x + kick, fallingPiece.y, fallingPiece.pieceType, newRotationIndex)) {
                fallingPiece.x += kick;
                fallingPiece.rotationIndex = newRotationIndex;
                return;
            }
        }
        // If no wall kick works, rotation fails
    }
}

// Initialize audio context (must be called after user interaction)
function initAudio() {
    if (!audioInitialized) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioInitialized = true;
    }
}

// Create happy sound for apple eating
function playAppleSound() {
    if (!audioInitialized) initAudio();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Happy sound: C major chord progression
    oscillator.frequency.setValueAtTime(523.25, audioContext.currentTime); // C5
    oscillator.frequency.setValueAtTime(659.25, audioContext.currentTime + 0.1); // E5
    oscillator.frequency.setValueAtTime(783.99, audioContext.currentTime + 0.2); // G5

    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.4);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
}

// Create sad sound for snake death
function playDeathSound() {
    if (!audioInitialized) initAudio();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Sad descending sound
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
    oscillator.frequency.exponentialRampToValueAtTime(220, audioContext.currentTime + 0.3); // A3
    oscillator.frequency.exponentialRampToValueAtTime(110, audioContext.currentTime + 0.8); // A2

    oscillator.type = 'sawtooth';
    gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.0);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 1.0);
}

// Start the game
window.onload = init;