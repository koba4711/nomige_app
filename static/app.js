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
let pulledPixels = 0;
let totalPulledKm = 0;
let currentRotation = 0;
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

function updateRoll(deltaY) {
    currentRotation += deltaY * 0.45;
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

function applyPull(deltaY) {
    if (deltaY <= 0) return;

    pulledPixels = deltaY;
    totalPulledKm = pulledPixels * kmPerPixel;

    updatePaper();
    updateRemaining();
    updateStage();
    updateRoll(deltaY / 12);
}

function startDrag(clientY) {
    if (rollbackTimer) {
        cancelAnimationFrame(rollbackTimer);
        rollbackTimer = null;
    }
    isDragging = true;
    startY = clientY;
}

function moveDrag(clientY) {
    if (!isDragging) return;
    const deltaY = Math.max(clientY - startY, 0);
    applyPull(deltaY);
}

function rollback() {
    if (pulledPixels <= 0.5) {
        pulledPixels = 0;
        totalPulledKm = 0;
        updatePaper();
        updateRemaining();
        updateStage();
        return;
    }

    pulledPixels *= 0.86;
    totalPulledKm = pulledPixels * kmPerPixel;
    updatePaper();
    updateRemaining();
    updateStage();
    rollbackTimer = requestAnimationFrame(rollback);
}

function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    rollback();
}

function getClientY(event) {
    if (event.touches && event.touches.length > 0) {
        return event.touches[0].clientY;
    }
    return event.clientY;
}

gameArea.addEventListener("mousedown", (event) => {
    startDrag(getClientY(event));
});

window.addEventListener("mousemove", (event) => {
    moveDrag(getClientY(event));
});

window.addEventListener("mouseup", () => {
    endDrag();
});

gameArea.addEventListener("touchstart", (event) => {
    startDrag(getClientY(event));
}, { passive: true });

gameArea.addEventListener("touchmove", (event) => {
    moveDrag(getClientY(event));
}, { passive: true });

gameArea.addEventListener("touchend", () => {
    endDrag();
});

updateRemaining();
updateStage();
updatePaper();