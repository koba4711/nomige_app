const appConfig = window.APP_CONFIG || {
    initialKm: 40075.0,
    kmPerPixel: 0.03,
};

const initialKm = appConfig.initialKm;
const kmPerPixel = appConfig.kmPerPixel;

const body = document.body;
const gameArea = document.getElementById("gameArea");
const paperStrip = document.getElementById("paperStrip");
const roll = document.getElementById("roll");
const remainingKmEl = document.getElementById("remainingKm");
const stageMessageEl = document.getElementById("stageMessage");

let isDragging = false;
let startY = 0;
let lastY = 0;
let lastMoveTime = 0;

let pulledPixels = 0;
let totalPulledKm = 0;
let currentRotation = 0;

let inertiaVelocity = 0;
let inertiaTimer = null;
let rollbackTimer = null;

const stageMessages = [
    { threshold: 0, message: "ようこそ。まだ何も始まっていない。", stage: "stage-1" },
    { threshold: 1, message: "1km到達。信じられないほど意味がない。", stage: "stage-2" },
    { threshold: 10, message: "10km到達。なぜ続けているのか、もう説明できない。", stage: "stage-3" },
    { threshold: 100, message: "100km到達。宇宙的虚無が近づいている。", stage: "stage-4" },
];

function formatKm(value) {
    return `${value.toLocaleString("ja-JP", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1,
    })} km`;
}

function updateRemaining() {
    const remaining = Math.max(initialKm - totalPulledKm, 0);
    remainingKmEl.textContent = formatKm(remaining);
}

function updatePaper() {
    const height = 260 + pulledPixels;
    paperStrip.style.height = `${height}px`;
}

function updateRoll(deltaPixels) {
    currentRotation += deltaPixels * 0.45;
    roll.style.transform = `rotate(${currentRotation}deg)`;
}

function updateStage() {
    let current = stageMessages[0];

    for (const stage of stageMessages) {
        if (totalPulledKm >= stage.threshold) {
            current = stage;
        }
    }

    stageMessageEl.textContent = current.message;
    body.classList.remove("stage-1", "stage-2", "stage-3", "stage-4");
    body.classList.add(current.stage);
}

function syncUI(deltaPixelsForRoll = 0) {
    totalPulledKm = pulledPixels * kmPerPixel;
    updatePaper();
    updateRemaining();
    updateStage();
    if (deltaPixelsForRoll !== 0) {
        updateRoll(deltaPixelsForRoll);
    }
}

function addPull(deltaPixels) {
    if (deltaPixels <= 0) return;
    pulledPixels += deltaPixels;
    syncUI(deltaPixels);
}

function stopInertia() {
    if (inertiaTimer) {
        cancelAnimationFrame(inertiaTimer);
        inertiaTimer = null;
    }
}

function stopRollback() {
    if (rollbackTimer) {
        cancelAnimationFrame(rollbackTimer);
        rollbackTimer = null;
    }
}

function startDrag(clientY) {
    stopInertia();
    stopRollback();

    if (idleTimer) {
        clearTimeout(idleTimer);
        idleTimer = null;
    }

    isDragging = true;
    startY = clientY;
    lastY = clientY;
    lastMoveTime = performance.now();
    inertiaVelocity = 0;
}

function moveDrag(clientY) {
    if (!isDragging) return;

    const now = performance.now();
    const deltaY = clientY - lastY;
    const deltaTime = now - lastMoveTime;

    if (deltaY > 0) {
        addPull(deltaY);
    }

    if (deltaTime > 0) {
        // px / frame 的な感覚に寄せるため少しスケール調整
        inertiaVelocity = deltaY / deltaTime * 16;
    }

    lastY = clientY;
    lastMoveTime = now;
}

// === 追加 ===
let idleTimer = null;
const IDLE_DELAY = 5000; // 5秒

function resetIdleTimer() {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
        startRollback();
    }, IDLE_DELAY);
}

function startInertia() {
    stopInertia();

    function step() {
        // 上方向の慣性は不要なので0未満は切る
        if (inertiaVelocity < 0) inertiaVelocity = 0;

        if (inertiaVelocity <= 0.2) {
            inertiaVelocity = 0;
            inertiaTimer = null;
            resetIdleTimer();
            return;
        }

        addPull(inertiaVelocity);

        // 減衰率：小さくすると長く滑る
        inertiaVelocity *= 0.94;

        inertiaTimer = requestAnimationFrame(step);
    }

    inertiaTimer = requestAnimationFrame(step);
}

const ROLLBACK_SPEED = 3; // px/frame

function startRollback() {
    stopRollback();

    function step() {
        if (pulledPixels <= 0) {
            pulledPixels = 0;
            syncUI();
            rollbackTimer = null;
            return;
        }

        pulledPixels -= ROLLBACK_SPEED;
        syncUI();

        rollbackTimer = requestAnimationFrame(step);
    }

    rollbackTimer = requestAnimationFrame(step);
}

function endDrag() {
    if (!isDragging) return;
    isDragging = false;

    if (inertiaVelocity > 0.3) {
        startInertia();
    } else {
        resetIdleTimer();
    }
}

function getClientY(event) {
    if (event.touches && event.touches.length > 0) {
        return event.touches[0].clientY;
    }
    if (event.changedTouches && event.changedTouches.length > 0) {
        return event.changedTouches[0].clientY;
    }
    return event.clientY;
}


// PC
gameArea.addEventListener("mousedown", (event) => {
    startDrag(getClientY(event));
});

window.addEventListener("mousemove", (event) => {
    moveDrag(getClientY(event));
});

window.addEventListener("mouseup", () => {
    endDrag();
});

// スマホ
gameArea.addEventListener("touchstart", (event) => {
    startDrag(getClientY(event));
}, { passive: true });

gameArea.addEventListener("touchmove", (event) => {
    moveDrag(getClientY(event));
}, { passive: true });

gameArea.addEventListener("touchend", (event) => {
    // 最後の位置も一応取得して慣性を自然にする
    const y = getClientY(event);
    if (typeof y === "number") {
        moveDrag(y);
    }
    endDrag();
});

gameArea.addEventListener("touchcancel", () => {
    endDrag();
});

syncUI();