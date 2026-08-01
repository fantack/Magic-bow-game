// Game Configuration
const config = {
    canvasWidth: 800,
    canvasHeight: 600,
    bow: {
        x: 50,
        y: 300,
        width: 20,
        height: 120,
        color: '#8B4513', // Brown color for bow
        pullLimit: 200
    },
    arrow: {
        width: 3,
        height: 40,
        color: '#F5F5DC', // Beige color for arrow
        speed: 15,
        gravity: 0.2,
        drag: 0.99
    },
    target: {
        width: 60,
        height: 60,
        color: '#FF6347', // Tomato color for target
        innerColor: '#FF4500', // OrangeRed for inner circle
        startY: -50,
        endY: 650,
        speed: 3,
        minSpeed: 1,
        maxSpeed: 10
    },
    magic: {
        curveStrength: 0.1,
        autoHitThreshold: 5 // Miss this many times to trigger auto-curve
    }
};

// Game State
const state = {
    canvas: null,
    ctx: null,
    arrows: [],
    target: {
        x: 0,
        y: 0,
        width: config.target.width,
        height: config.target.height
    },
    bow: {
        x: config.bow.x,
        y: config.bow.y,
        width: config.bow.width,
        height: config.bow.height,
        angle: 0,
        isPulled: false,
        pullDistance: 0
    },
    isPaused: false,
    isMagicActive: false,
    score: 0,
    missedShots: 0,
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    targetSpeed: config.target.speed,
    animationId: null
};

// DOM Elements
let pauseOverlay, resumeBtn, pauseBtn, magicBtn, magicIndicator, speedSlider, speedValue, scoreDisplay;

// Initialize the game
function init() {
    // Get canvas and context
    state.canvas = document.getElementById('gameCanvas');
    state.ctx = state.canvas.getContext('2d');
    
    // Set canvas dimensions
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Get DOM elements
    pauseOverlay = document.getElementById('pauseOverlay');
    resumeBtn = document.getElementById('resumeBtn');
    pauseBtn = document.getElementById('pauseBtn');
    magicBtn = document.getElementById('magicBtn');
    magicIndicator = document.getElementById('magicIndicator');
    speedSlider = document.getElementById('speedSlider');
    speedValue = document.getElementById('speedValue');
    scoreDisplay = document.getElementById('scoreDisplay');
    
    // Initialize target position
    resetTarget();
    
    // Event Listeners
    setupEventListeners();
    
    // Start game loop
    gameLoop();
}

// Resize canvas to fit container
function resizeCanvas() {
    const container = document.querySelector('.game-container');
    state.canvas.width = container.clientWidth;
    state.canvas.height = container.clientHeight;
    config.canvasWidth = state.canvas.width;
    config.canvasHeight = state.canvas.height;
    
    // Adjust bow position based on new width
    config.bow.x = state.canvas.width * 0.06; // 6% from left
    state.bow.x = config.bow.x;
    state.bow.y = state.canvas.height / 2;
}

// Setup event listeners
function setupEventListeners() {
    // Mouse events for bow
    state.canvas.addEventListener('mousedown', onMouseDown);
    state.canvas.addEventListener('mousemove', onMouseMove);
    state.canvas.addEventListener('mouseup', onMouseUp);
    state.canvas.addEventListener('mouseleave', onMouseUp);
    
    // Touch events for mobile
    state.canvas.addEventListener('touchstart', onTouchStart, { passive: false });
    state.canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    state.canvas.addEventListener('touchend', onTouchEnd);
    
    // Keyboard events
    document.addEventListener('keydown', onKeyDown);
    
    // Pause/Resume buttons
    pauseBtn.addEventListener('click', togglePause);
    resumeBtn.addEventListener('click', togglePause);
    
    // Magic button
    magicBtn.addEventListener('click', toggleMagic);
    
    // Speed slider
    speedSlider.addEventListener('input', updateTargetSpeed);
}

// Mouse event handlers
function onMouseDown(e) {
    if (state.isPaused) return;
    
    const rect = state.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Check if click is near the bow
    const bowCenterX = state.bow.x + state.bow.width / 2;
    const bowCenterY = state.bow.y + state.bow.height / 2;
    const distance = Math.sqrt(
        Math.pow(mouseX - bowCenterX, 2) + Math.pow(mouseY - bowCenterY, 2)
    );
    
    if (distance < 50) {
        state.isDragging = true;
        state.dragStart = { x: mouseX, y: mouseY };
        state.bow.isPulled = true;
    }
}

function onMouseMove(e) {
    if (!state.isDragging || state.isPaused) return;
    
    const rect = state.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate pull distance
    const bowCenterX = state.bow.x + state.bow.width / 2;
    const bowCenterY = state.bow.y + state.bow.height / 2;
    const dx = mouseX - bowCenterX;
    const dy = mouseY - bowCenterY;
    
    state.bow.pullDistance = Math.min(
        Math.sqrt(dx * dx + dy * dy),
        config.bow.pullLimit
    );
    
    // Calculate angle (bow points to the right, so limit angle range)
    state.bow.angle = Math.atan2(dy, dx);
    
    // Limit angle to prevent bow from pointing too far up or down
    const maxAngle = Math.PI / 3; // 60 degrees
    if (state.bow.angle > maxAngle) {
        state.bow.angle = maxAngle;
    } else if (state.bow.angle < -maxAngle) {
        state.bow.angle = -maxAngle;
    }
}

function onMouseUp(e) {
    if (!state.isDragging || state.isPaused) return;
    
    state.isDragging = false;
    state.bow.isPulled = false;
    
    // Shoot arrow
    shootArrow();
}

// Touch event handlers
function onTouchStart(e) {
    if (state.isPaused) return;
    e.preventDefault();
    
    const rect = state.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    const bowCenterX = state.bow.x + state.bow.width / 2;
    const bowCenterY = state.bow.y + state.bow.height / 2;
    const distance = Math.sqrt(
        Math.pow(touchX - bowCenterX, 2) + Math.pow(touchY - bowCenterY, 2)
    );
    
    if (distance < 50) {
        state.isDragging = true;
        state.dragStart = { x: touchX, y: touchY };
        state.bow.isPulled = true;
    }
}

function onTouchMove(e) {
    if (!state.isDragging || state.isPaused) return;
    e.preventDefault();
    
    const rect = state.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    
    const bowCenterX = state.bow.x + state.bow.width / 2;
    const bowCenterY = state.bow.y + state.bow.height / 2;
    const dx = touchX - bowCenterX;
    const dy = touchY - bowCenterY;
    
    state.bow.pullDistance = Math.min(
        Math.sqrt(dx * dx + dy * dy),
        config.bow.pullLimit
    );
    
    state.bow.angle = Math.atan2(dy, dx);
    
    const maxAngle = Math.PI / 3;
    if (state.bow.angle > maxAngle) {
        state.bow.angle = maxAngle;
    } else if (state.bow.angle < -maxAngle) {
        state.bow.angle = -maxAngle;
    }
}

function onTouchEnd(e) {
    if (!state.isDragging || state.isPaused) return;
    e.preventDefault();
    
    state.isDragging = false;
    state.bow.isPulled = false;
    
    shootArrow();
}

// Keyboard event handler
function onKeyDown(e) {
    if (e.key === 'Escape') {
        togglePause();
    }
}

// Toggle pause
function togglePause() {
    state.isPaused = !state.isPaused;
    pauseOverlay.classList.toggle('active', state.isPaused);
    
    if (!state.isPaused) {
        // Continue game loop
        gameLoop();
    }
}

// Toggle magic mode
function toggleMagic() {
    state.isMagicActive = !state.isMagicActive;
    magicBtn.classList.toggle('active', state.isMagicActive);
    magicIndicator.textContent = state.isMagicActive ? 'ON' : 'OFF';
}

// Update target speed
function updateTargetSpeed() {
    state.targetSpeed = parseInt(speedSlider.value);
    speedValue.textContent = state.targetSpeed;
}

// Shoot arrow
function shootArrow() {
    if (state.bow.pullDistance < 20) return; // Minimum pull distance to shoot
    
    const bowTipX = state.bow.x + state.bow.width / 2 + Math.cos(state.bow.angle) * (state.bow.height / 2);
    const bowTipY = state.bow.y + state.bow.height / 2 + Math.sin(state.bow.angle) * (state.bow.height / 2);
    
    const arrow = {
        x: bowTipX,
        y: bowTipY,
        width: config.arrow.width,
        height: config.arrow.height,
        angle: state.bow.angle,
        speed: config.arrow.speed * (state.bow.pullDistance / config.bow.pullLimit),
        vx: Math.cos(state.bow.angle) * config.arrow.speed * (state.bow.pullDistance / config.bow.pullLimit),
        vy: Math.sin(state.bow.angle) * config.arrow.speed * (state.bow.pullDistance / config.bow.pullLimit),
        rotation: state.bow.angle,
        isMagic: state.isMagicActive,
        magicTargetX: state.target.x + state.target.width / 2,
        magicTargetY: state.target.y + state.target.height / 2,
        hasHit: false,
        curveFactor: 0
    };
    
    state.arrows.push(arrow);
    
    // Reset bow pull
    state.bow.pullDistance = 0;
}

// Reset target position
function resetTarget() {
    state.target.x = config.canvasWidth - 100;
    state.target.y = config.target.startY;
    state.target.width = config.target.width;
    state.target.height = config.target.height;
}

// Check collision between arrow and target
function checkCollision(arrow, target) {
    // Simple AABB collision detection
    const arrowLeft = arrow.x - arrow.width / 2;
    const arrowRight = arrow.x + arrow.width / 2;
    const arrowTop = arrow.y - arrow.height / 2;
    const arrowBottom = arrow.y + arrow.height / 2;
    
    const targetLeft = target.x;
    const targetRight = target.x + target.width;
    const targetTop = target.y;
    const targetBottom = target.y + target.height;
    
    return !(
        arrowRight < targetLeft ||
        arrowLeft > targetRight ||
        arrowBottom < targetTop ||
        arrowTop > targetBottom
    );
}

// Check if arrow hits the center of the target (bullseye)
function checkBullseye(arrow, target) {
    const centerX = target.x + target.width / 2;
    const centerY = target.y + target.height / 2;
    const centerSize = target.width * 0.3; // 30% of target size for bullseye
    
    const arrowCenterX = arrow.x;
    const arrowCenterY = arrow.y;
    
    const dx = Math.abs(arrowCenterX - centerX);
    const dy = Math.abs(arrowCenterY - centerY);
    
    return dx < centerSize / 2 && dy < centerSize / 2;
}

// Update game state
function update() {
    if (state.isPaused) return;
    
    // Move target
    state.target.y += state.targetSpeed;
    
    // Reset target if it goes off screen
    if (state.target.y > config.canvasHeight + config.target.height) {
        resetTarget();
        state.missedShots = 0; // Reset miss counter when target resets
    }
    
    // Update arrows
    for (let i = state.arrows.length - 1; i >= 0; i--) {
        const arrow = state.arrows[i];
        
        if (arrow.hasHit) {
            // Arrow has hit, remove it after a short delay
            arrow.lifetime = (arrow.lifetime || 0) + 1;
            if (arrow.lifetime > 30) {
                state.arrows.splice(i, 1);
            }
            continue;
        }
        
        // Apply gravity
        arrow.vy += config.arrow.gravity;
        
        // Apply drag
        arrow.vx *= config.arrow.drag;
        arrow.vy *= config.arrow.drag;
        
        // Magic arrow behavior
        if (arrow.isMagic) {
            // If magic is active, guide arrow toward target
            const targetCenterX = state.target.x + state.target.width / 2;
            const targetCenterY = state.target.y + state.target.height / 2;
            
            const dx = targetCenterX - arrow.x;
            const dy = targetCenterY - arrow.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            
            // If arrow is getting too far from target or we've missed a lot, apply strong correction
            const shouldCurve = state.missedShots >= config.magic.autoHitThreshold || 
                               (distance > 100 && Math.random() < 0.1);
            
            if (shouldCurve) {
                // Apply curve toward target
                const curveStrength = config.magic.curveStrength * (state.missedShots >= config.magic.autoHitThreshold ? 2 : 0.5);
                arrow.vx += (dx / distance) * curveStrength;
                arrow.vy += (dy / distance) * curveStrength;
                arrow.curveFactor = Math.min(arrow.curveFactor + 0.01, 1);
            } else {
                // Gentle guidance
                arrow.vx += (dx / distance) * 0.01;
                arrow.vy += (dy / distance) * 0.01;
            }
        }
        
        // Update arrow position
        arrow.x += arrow.vx;
        arrow.y += arrow.vy;
        
        // Update arrow rotation based on velocity
        arrow.rotation = Math.atan2(arrow.vy, arrow.vx);
        
        // Check for collision with target
        if (checkCollision(arrow, state.target)) {
            arrow.hasHit = true;
            
            // Check for bullseye
            if (checkBullseye(arrow, state.target)) {
                state.score += 10; // Bullseye = 10 points
            } else {
                state.score += 5; // Regular hit = 5 points
            }
            
            state.missedShots = 0; // Reset miss counter on hit
            
            // Reset target after hit
            setTimeout(() => {
                resetTarget();
            }, 500);
        }
        
        // Remove arrows that are off screen
        if (arrow.x > config.canvasWidth + 50 || 
            arrow.x < -50 || 
            arrow.y > config.canvasHeight + 50 || 
            arrow.y < -50) {
            
            // Count as miss if arrow goes off screen without hitting
            if (!arrow.hasHit) {
                state.missedShots++;
            }
            
            state.arrows.splice(i, 1);
        }
    }
    
    // Update score display
    scoreDisplay.textContent = `Score: ${state.score}`;
}

// Draw game elements
function draw() {
    // Clear canvas
    state.ctx.clearRect(0, 0, config.canvasWidth, config.canvasHeight);
    
    // Draw background gradient
    const bgGradient = state.ctx.createLinearGradient(0, 0, 0, config.canvasHeight);
    bgGradient.addColorStop(0, '#0f0f1a');
    bgGradient.addColorStop(1, '#1a1a2e');
    state.ctx.fillStyle = bgGradient;
    state.ctx.fillRect(0, 0, config.canvasWidth, config.canvasHeight);
    
    // Draw stars in background
    drawStars();
    
    // Draw target
    drawTarget();
    
    // Draw arrows
    for (const arrow of state.arrows) {
        drawArrow(arrow);
    }
    
    // Draw bow
    drawBow();
    
    // Draw pause button indicator
    if (state.isPaused) {
        drawPauseIndicator();
    }
}

// Draw stars in background
function drawStars() {
    state.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    
    // Draw some random stars
    for (let i = 0; i < 50; i++) {
        const x = Math.random() * config.canvasWidth;
        const y = Math.random() * config.canvasHeight;
        const size = Math.random() * 2;
        
        state.ctx.beginPath();
        state.ctx.arc(x, y, size, 0, Math.PI * 2);
        state.ctx.fill();
    }
}

// Draw target
function drawTarget() {
    const x = state.target.x;
    const y = state.target.y;
    const width = state.target.width;
    const height = state.target.height;
    
    // Draw outer circle
    state.ctx.beginPath();
    state.ctx.arc(x + width / 2, y + height / 2, width / 2, 0, Math.PI * 2);
    state.ctx.fillStyle = config.target.color;
    state.ctx.fill();
    
    // Draw inner circle (bullseye)
    state.ctx.beginPath();
    state.ctx.arc(x + width / 2, y + height / 2, width / 4, 0, Math.PI * 2);
    state.ctx.fillStyle = config.target.innerColor;
    state.ctx.fill();
    
    // Draw concentric circles for target appearance
    state.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    state.ctx.lineWidth = 2;
    
    state.ctx.beginPath();
    state.ctx.arc(x + width / 2, y + height / 2, width / 2 - 5, 0, Math.PI * 2);
    state.ctx.stroke();
    
    state.ctx.beginPath();
    state.ctx.arc(x + width / 2, y + height / 2, width / 4 + 5, 0, Math.PI * 2);
    state.ctx.stroke();
}

// Draw arrow
function drawArrow(arrow) {
    state.ctx.save();
    state.ctx.translate(arrow.x, arrow.y);
    state.ctx.rotate(arrow.rotation);
    
    // Draw arrow shaft
    state.ctx.fillStyle = arrow.hasHit ? '#FFD700' : config.arrow.color;
    state.ctx.fillRect(-arrow.width / 2, -arrow.height / 2, arrow.width, arrow.height);
    
    // Draw arrow head
    state.ctx.beginPath();
    state.ctx.moveTo(-arrow.width / 2, -arrow.height / 2);
    state.ctx.lineTo(arrow.width / 2, 0);
    state.ctx.lineTo(-arrow.width / 2, arrow.height / 2);
    state.ctx.closePath();
    state.ctx.fill();
    
    // Draw arrow fletching (feathers)
    state.ctx.fillStyle = '#8B4513';
    state.ctx.fillRect(-arrow.width / 2 - 5, -arrow.height / 4, 5, arrow.height / 2);
    
    // Magic effect
    if (arrow.isMagic && !arrow.hasHit) {
        state.ctx.strokeStyle = 'rgba(106, 17, 203, 0.5 + arrow.curveFactor * 0.5)';
        state.ctx.lineWidth = 2;
        state.ctx.beginPath();
        state.ctx.arc(0, 0, arrow.width * 2, 0, Math.PI * 2);
        state.ctx.stroke();
    }
    
    state.ctx.restore();
}

// Draw bow
function drawBow() {
    const x = state.bow.x;
    const y = state.bow.y;
    const width = state.bow.width;
    const height = state.bow.height;
    
    state.ctx.save();
    
    // Draw bow body
    state.ctx.fillStyle = config.bow.color;
    state.ctx.fillRect(x, y, width, height);
    
    // Draw bow curve
    state.ctx.strokeStyle = '#654321';
    state.ctx.lineWidth = 3;
    
    // Bow is pointing to the right, so the curve is on the right side
    const curveHeight = height * 0.8;
    const curveWidth = width * 2;
    
    state.ctx.beginPath();
    state.ctx.moveTo(x + width, y + height / 2);
    
    // Control points for the bow curve
    const cp1x = x + width + curveWidth / 2;
    const cp1y = y + height / 2 - curveHeight / 2;
    const cp2x = x + width + curveWidth / 2;
    const cp2y = y + height / 2 + curveHeight / 2;
    
    // Draw the bow string (straight when not pulled)
    if (!state.bow.isPulled || state.bow.pullDistance < 5) {
        state.ctx.lineTo(x + width + 50, y + height / 2);
    } else {
        // When pulled, the string follows the pull direction
        const stringEndX = x + width + Math.cos(state.bow.angle) * state.bow.pullDistance;
        const stringEndY = y + height / 2 + Math.sin(state.bow.angle) * state.bow.pullDistance;
        state.ctx.lineTo(stringEndX, stringEndY);
    }
    
    state.ctx.stroke();
    
    // Draw bow string (when pulled)
    if (state.bow.isPulled && state.bow.pullDistance > 5) {
        state.ctx.strokeStyle = '#8B4513';
        state.ctx.lineWidth = 2;
        
        state.ctx.beginPath();
        state.ctx.moveTo(x + width, y + height / 2);
        
        const stringEndX = x + width + Math.cos(state.bow.angle) * state.bow.pullDistance;
        const stringEndY = y + height / 2 + Math.sin(state.bow.angle) * state.bow.pullDistance;
        
        state.ctx.lineTo(stringEndX, stringEndY);
        state.ctx.stroke();
        
        // Draw pull indicator (small circle at pull point)
        state.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        state.ctx.beginPath();
        state.ctx.arc(stringEndX, stringEndY, 5, 0, Math.PI * 2);
        state.ctx.fill();
    }
    
    // Draw bow grip
    state.ctx.fillStyle = '#654321';
    state.ctx.fillRect(x - 5, y + height / 2 - 15, width + 10, 30);
    
    state.ctx.restore();
}

// Draw pause indicator
function drawPauseIndicator() {
    state.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    state.ctx.font = '20px Arial';
    state.ctx.textAlign = 'center';
    state.ctx.fillText('PAUSED', config.canvasWidth / 2, config.canvasHeight / 2 - 50);
}

// Game loop
function gameLoop() {
    if (state.isPaused) {
        draw();
        return;
    }
    
    update();
    draw();
    
    state.animationId = requestAnimationFrame(gameLoop);
}

// Start the game when the page loads
window.addEventListener('load', init);

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (state.animationId) {
        cancelAnimationFrame(state.animationId);
    }
});
