// ==========================================================================
// Constants & Configuration
// ==========================================================================
const GAME_DURATION = 15;
const WORDS = [
    "ai", "ai", "ai", "ai", "ai", "ai", "ai", "ai", "ai", "ai",
    "llm", "gpt", "data", "rag", "cloud", "aiops", "neural", "model", 
    "agent", "logic", "vision", "hyper", "prompt", "aigen", "train",
    "align", "bias", "token", "scale", "autoai", "future", "query",
    "meta", "stream", "excel", "winning", "synth", "propel", "future"
];

// ==========================================================================
// DOM Elements
// ==========================================================================
const elements = {
    wordDisplay: document.getElementById('word-display'),
    scoreDisplay: document.getElementById('score'),
    timeDisplay: document.getElementById('time')
};

// ==========================================================================
// Game State
// ==========================================================================
const gameState = {
    availableWords: [],
    currentWordIndex: 0,
    currentWord: '',
    currentInput: '',
    score: 0,
    timeLeft: GAME_DURATION,
    gameActive: false,
    gameEnded: false,
    timer: null,
    completedWords: new Set(),
    skippedWords: new Set()
};

// ==========================================================================
// Game Logic
// ==========================================================================
function initializeGame() {
    gameState.availableWords = shuffleArray([...WORDS]);
    gameState.currentWord = gameState.availableWords[0];
    gameState.currentWordIndex = 0;
    updateDisplay();
}

function startGame() {
    if (gameState.gameActive) return;
    
    resetGameState();
    startTimer();
    gameState.gameActive = true;
    
    // Track game start
    posthog.capture('game_started');
}

function resetGameState() {
    gameState.score = 0;
    gameState.timeLeft = GAME_DURATION;
    gameState.currentWordIndex = 0;
    gameState.completedWords.clear();
    gameState.skippedWords.clear();
    gameState.currentInput = '';
    elements.scoreDisplay.textContent = gameState.score;
}

function startTimer() {
    gameState.timer = setInterval(() => {
        gameState.timeLeft--;
        elements.timeDisplay.textContent = gameState.timeLeft;
        
        if (gameState.timeLeft === 0) {
            endGame();
        }
    }, 1000);
}

// ==========================================================================
// Word Processing
// ==========================================================================
function processWord() {
    const isCorrect = gameState.currentInput.toLowerCase() === gameState.currentWord.toLowerCase();
    
    if (isCorrect) {
        gameState.score++;
        elements.scoreDisplay.textContent = gameState.score;
        gameState.completedWords.add(gameState.currentWordIndex);
        
        // Track successful word completion
        posthog.capture('word_completed', {
            word: gameState.currentWord
        });
    } else {
        gameState.skippedWords.add(gameState.currentWordIndex);
        
        // Track word skip
        posthog.capture('word_skipped', {
            word: gameState.currentWord,
            typed: gameState.currentInput
        });
    }
    
    advanceToNextWord();
}

function advanceToNextWord() {
    gameState.currentInput = '';
    gameState.currentWordIndex++;
    
    if (gameState.currentWordIndex >= gameState.availableWords.length) {
        endGame();
        return;
    }
    
    gameState.currentWord = gameState.availableWords[gameState.currentWordIndex];
    updateDisplay();
}

// ==========================================================================
// Display Updates
// ==========================================================================
function createWordSpan(word, index) {
    if (index === gameState.currentWordIndex) {
        return createActiveWordSpan(word);
    }
    return `<span class="word ${getWordClass(index)}">${word}</span>`;
}

function createActiveWordSpan(word) {
    const typed = gameState.currentInput;
    const typedHtml = createTypedHtml(typed, word);
    const remaining = word.slice(typed.length);
    
    return `<span class="word active">
        <span class="typed">${typedHtml}</span><span class="caret"></span><span class="remaining">${remaining}</span>
    </span>`;
}

function createTypedHtml(typed, word) {
    return [...typed].map((char, i) => {
        const isCorrect = i < word.length && char.toLowerCase() === word[i].toLowerCase();
        const className = isCorrect ? 'correct' : 'incorrect';
        return `<span class="${className}">${char}</span>`;
    }).join('');
}

function getWordClass(index) {
    if (gameState.completedWords.has(index)) return 'completed';
    if (gameState.skippedWords.has(index)) return 'skipped';
    return '';
}

function updateDisplay() {
    const wordElements = gameState.availableWords
        .map((word, index) => createWordSpan(word, index))
        .join(' ');
    elements.wordDisplay.innerHTML = wordElements;
    
    if (gameState.gameActive && elements.wordDisplay.hasAttribute('contenteditable')) {
        elements.wordDisplay.focus();
    }
}

// ==========================================================================
// End Game
// ==========================================================================
function endGame() {
    clearInterval(gameState.timer);
    gameState.gameActive = false;
    gameState.gameEnded = true;
    
    // Track game end with score
    posthog.capture('game_ended', {
        score: gameState.score,
        completed_words: Array.from(gameState.completedWords).length,
        skipped_words: Array.from(gameState.skippedWords).length
    });
    
    showEndScreen();
}

function showEndScreen() {
    const { message, image } = getEndGameContent(gameState.score);
    
    elements.wordDisplay.innerHTML = `
        <div class="end-screen">
            <img src="${image}" alt="End game meme" class="end-image">
            <div class="end-message">${message}</div>
            <button class="try-again-btn">Try Again</button>
        </div>
    `;
    
    addTryAgainHandler();
}

function getEndGameContent(score) {
    // If score is 0, return a special "failure" message
    if (score === 0) {
        return {
            message: "Not a single word? Time to update that LinkedIn profile...",
            image: "images/web2.webp"
        };
    }

    const contents = {
        3: {
            message: `${score} disruptions? My grandma's book club talks more AI than that! Time to pivot to a food truck...`,
            image: "images/foodtruck.gif"
        },
        8: {
            message: `${score} AI mentions... Well, at least you're not in crypto anymore!`,
            image: "images/crypto.gif"
        },
        12: {
            message: `${score} disruptions made! You're getting there. The VCs might actually read your pitch deck now.`,
            image: "images/pitchdeck.gif"
        },
        15: {
            message: `${score} AI terms! Success! Your Series A is secured and TechCrunch is calling!`,
            image: "images/techcrunch.gif"
        },
        20: {
            message: `${score} disruptions! You're the next unicorn! Time to practice your "We're changing the world" speech!`,
            image: "images/unicorn.gif"
        },
        25: {
            message: `INCREDIBLE! ${score} disruptions! Sam Altman just followed you on Twitter! Quick, order that Patagonia vest!`,
            image: "images/vest.gif"
        },
        Infinity: {
            message: `LEGENDARY! ${score} AI terms! You're the next OpenAI! Sam Altman is in your DMs and Elon's getting nervous!`,
            image: "images/elon.gif"
        }
    };

    const threshold = Object.keys(contents)
        .map(Number)
        .find(threshold => score <= threshold) || Infinity;
    
    return contents[threshold];
}

// ==========================================================================
// Event Handlers
// ==========================================================================
function handleKeydown(e) {
    if (!gameState.gameActive && !gameState.gameEnded && e.key.length === 1) {
        startGame();
    }
    
    if (!gameState.gameActive) return;
    
    if (e.key === 'Backspace') {
        gameState.currentInput = gameState.currentInput.slice(0, -1);
        updateDisplay();
        return;
    }
    
    if (e.key === ' ' || e.key === 'Tab') {
        e.preventDefault();
        processWord();
        return;
    }
    
    if (e.key.length !== 1) return;
    
    gameState.currentInput += e.key;
    updateDisplay();
}

function addTryAgainHandler() {
    const tryAgainBtn = elements.wordDisplay.querySelector('.try-again-btn');
    tryAgainBtn.addEventListener('click', () => {
        // Track retry
        posthog.capture('game_retry');
        
        gameState.currentInput = '';
        gameState.availableWords = shuffleArray([...WORDS]);
        gameState.currentWord = gameState.availableWords[0];
        gameState.currentWordIndex = 0;
        gameState.completedWords.clear();
        gameState.skippedWords.clear();
        gameState.gameEnded = false;
        updateDisplay();
        gameState.gameActive = false;
    });
}

// ==========================================================================
// Mobile Support
// ==========================================================================
function initializeMobileSupport() {
    if (!('ontouchstart' in window)) return;
    
    const inputField = createMobileInputField();
    setupMobileEventListeners(inputField);
}

function createMobileInputField() {
    const inputField = document.createElement('input');
    inputField.setAttribute('type', 'text');
    inputField.setAttribute('autocomplete', 'off');
    inputField.setAttribute('autocorrect', 'off');
    inputField.setAttribute('autocapitalize', 'off');
    inputField.setAttribute('spellcheck', 'false');
    inputField.style.opacity = '0';
    inputField.style.height = '0';
    inputField.style.position = 'absolute';
    inputField.style.top = '50%';
    inputField.style.left = '50%';
    inputField.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(inputField);
    return inputField;
}

function setupMobileEventListeners(inputField) {
    elements.wordDisplay.addEventListener('click', () => {
        if (!gameState.gameActive && !gameState.gameEnded) {
            startGame();
        }
        inputField.focus();
    });

    inputField.addEventListener('input', handleMobileInput);
    inputField.addEventListener('keydown', handleMobileKeydown);
}

function handleMobileKeydown(e) {
    if (!gameState.gameActive) return;
    
    if (e.key === 'Backspace') {
        e.preventDefault();
        if (gameState.currentInput.length > 0) {
            gameState.currentInput = gameState.currentInput.slice(0, -1);
            updateDisplay();
        }
    }
    
    if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        processWord();
    }
}

function handleMobileInput(e) {
    if (!gameState.gameActive) return;

    const inputValue = e.target.value;
    
    if (inputValue === ' ') {
        processWord();
    } else if (inputValue.length > 0) {
        // Only add the last character typed
        const lastChar = inputValue[inputValue.length - 1];
        gameState.currentInput += lastChar;
        updateDisplay();
    }
    
    // Clear the input field after processing
    e.target.value = '';
}

// ==========================================================================
// Utility Functions
// ==========================================================================
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// ==========================================================================
// Initialization
// ==========================================================================
document.addEventListener('keydown', handleKeydown);
initializeGame();
initializeMobileSupport(); 