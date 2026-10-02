const screens = [...document.querySelectorAll('.screen')];
const dots = [...document.querySelectorAll('.progress-dot')];
const stepLabel = document.getElementById('step-label');
const particles = document.getElementById('particles');
const toast = document.getElementById('toast');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

let currentStep = 0;
let isTransitioning = false;
let toastTimer;

const dodgeMessages = {
    'miss-you': [
        'Uy, casi 😌',
        'Ese botón se puso tímido…',
        'Parece que la respuesta correcta es “sí” 💗',
        'Insistir solo hace crecer el “sí” 👀',
        'Listo: aceptamos tu sí oficialmente.'
    ],
    song: [
        'Esa opción no venía en el contrato.',
        'Kuromi recomienda reconsiderarlo 😈',
        'La canción ya está casi elegida…',
        'Perfecto: eso cuenta como un sí ✨'
    ]
};

function updateProgress(step) {
    stepLabel.textContent = `${String(step + 1).padStart(2, '0')} / ${String(screens.length).padStart(2, '0')}`;

    dots.forEach((dot, index) => {
        dot.classList.toggle('is-current', index === step);
        dot.classList.toggle('is-complete', index < step);
    });
}

function goToStep(nextStep) {
    if (isTransitioning || nextStep === currentStep || !screens[nextStep]) return;

    isTransitioning = true;
    const previous = screens[currentStep];
    const next = screens[nextStep];

    previous.classList.remove('is-active');
    previous.classList.add('is-leaving');
    previous.setAttribute('aria-hidden', 'true');

    next.classList.add('is-active');
    next.setAttribute('aria-hidden', 'false');
    next.scrollTop = 0;

    currentStep = nextStep;
    updateProgress(nextStep);

    window.setTimeout(() => {
        previous.classList.remove('is-leaving');
        next.querySelector('h1, h2')?.focus({ preventScroll: true });
        isTransitioning = false;
    }, prefersReducedMotion ? 20 : 520);

    createHeartBurst(nextStep === screens.length - 1 ? 34 : 8);
}

document.querySelectorAll('[data-next]').forEach((button) => {
    button.addEventListener('click', () => goToStep(Number(button.dataset.next)));
});

function boxesOverlap(a, b, padding = 12) {
    return !(
        a.right + padding < b.left ||
        a.left > b.right + padding ||
        a.bottom + padding < b.top ||
        a.top > b.bottom + padding
    );
}

function convertDodgeButton(button) {
    const zone = button.closest('.choice-zone');
    const target = Number(button.dataset.target);

    button.dataset.converted = 'true';
    button.classList.remove('is-dodging');
    button.classList.add('is-converted');
    button.textContent = button.dataset.dodge === 'song'
        ? 'Bueno, sí quiero 💕'
        : 'Sí, también te extraño 💕';
    button.setAttribute('aria-label', `${button.textContent}. Continuar`);

    const centeredLeft = Math.max(0, (zone.clientWidth - button.offsetWidth) / 2);
    const lowerTop = Math.max(78, zone.clientHeight - button.offsetHeight - 4);
    button.style.transform = 'none';
    button.style.right = 'auto';
    button.style.left = `${centeredLeft}px`;
    button.style.top = `${lowerTop}px`;

    const hint = document.getElementById(button.getAttribute('aria-describedby'));
    if (hint) hint.textContent = dodgeMessages[button.dataset.dodge].at(-1);

    button.onclick = () => goToStep(target);
}

function dodgeButton(button, event) {
    event?.preventDefault();
    if (button.dataset.converted === 'true') return;

    const now = Date.now();
    if (now - Number(button.dataset.lastDodge || 0) < 180) return;
    button.dataset.lastDodge = String(now);

    const zone = button.closest('.choice-zone');
    const yesButton = zone.querySelector('.btn-primary');
    const attempt = Number(button.dataset.attempt || 0) + 1;
    const maxAttempts = Number(button.dataset.max || 4);
    button.dataset.attempt = String(attempt);

    const messages = dodgeMessages[button.dataset.dodge];
    const hint = document.getElementById(button.getAttribute('aria-describedby'));
    if (hint) hint.textContent = messages[Math.min(attempt - 1, messages.length - 1)];

    yesButton.style.setProperty('--yes-scale', String(Math.min(1.22, 1 + attempt * 0.045)));

    if (attempt >= maxAttempts) {
        convertDodgeButton(button);
        return;
    }

    button.style.transform = 'none';
    button.style.right = 'auto';
    const maxX = Math.max(0, zone.clientWidth - button.offsetWidth);
    const maxY = Math.max(0, zone.clientHeight - button.offsetHeight);
    const zoneRect = zone.getBoundingClientRect();
    const yesRectViewport = yesButton.getBoundingClientRect();
    const yesRect = {
        left: yesRectViewport.left - zoneRect.left,
        right: yesRectViewport.right - zoneRect.left,
        top: yesRectViewport.top - zoneRect.top,
        bottom: yesRectViewport.bottom - zoneRect.top
    };

    let x = 0;
    let y = 0;
    for (let tries = 0; tries < 18; tries += 1) {
        x = Math.random() * maxX;
        y = Math.random() * maxY;

        const candidate = {
            left: x,
            right: x + button.offsetWidth,
            top: y,
            bottom: y + button.offsetHeight
        };

        if (!boxesOverlap(candidate, yesRect)) break;
    }

    button.style.left = `${x}px`;
    button.style.top = `${y}px`;
    button.classList.remove('is-dodging');
    void button.offsetWidth;
    button.classList.add('is-dodging');
}

document.querySelectorAll('[data-dodge]').forEach((button) => {
    button.addEventListener('pointerenter', (event) => {
        if (event.pointerType !== 'touch') dodgeButton(button, event);
    });

    button.addEventListener('pointerdown', (event) => {
        if (event.pointerType === 'touch') dodgeButton(button, event);
    });

    button.addEventListener('click', (event) => {
        if (button.dataset.converted === 'true') return;
        event.preventDefault();
        dodgeButton(button, event);
    });
});

function createHeartBurst(amount = 20) {
    const symbols = ['♥', '♡', '✦', '💗', '✨'];
    const colors = ['#ff4f91', '#ff8eb8', '#b895ff', '#ffffff'];
    const total = prefersReducedMotion ? Math.min(5, amount) : amount;

    for (let index = 0; index < total; index += 1) {
        window.setTimeout(() => {
            const particle = document.createElement('span');
            particle.className = 'floating-heart';
            particle.textContent = symbols[Math.floor(Math.random() * symbols.length)];
            particle.style.setProperty('--x', `${Math.random() * 100}vw`);
            particle.style.setProperty('--drift', `${Math.random() * 150 - 75}px`);
            particle.style.setProperty('--turn', `${Math.random() * 440 - 220}deg`);
            particle.style.setProperty('--size', `${15 + Math.random() * 20}px`);
            particle.style.setProperty('--duration', `${2.7 + Math.random() * 2}s`);
            particle.style.setProperty('--color', colors[Math.floor(Math.random() * colors.length)]);
            particles.appendChild(particle);
            window.setTimeout(() => particle.remove(), 5000);
        }, index * 42);
    }
}

function showToast() {
    window.clearTimeout(toastTimer);
    toast.classList.add('is-visible');
    toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 3300);
}

document.getElementById('seal-promise').addEventListener('click', (event) => {
    const button = event.currentTarget;
    button.textContent = 'Promesa sellada ✓';
    button.setAttribute('aria-pressed', 'true');
    createHeartBurst(48);
    showToast();
});

document.getElementById('restart').addEventListener('click', () => {
    document.querySelectorAll('[data-dodge]').forEach((button) => {
        button.textContent = button.dataset.original;
        button.dataset.converted = 'false';
        button.dataset.attempt = '0';
        button.dataset.lastDodge = '0';
        button.classList.remove('is-converted', 'is-dodging');
        button.style.left = '';
        button.style.right = '';
        button.style.top = '';
        button.style.transform = '';
        button.onclick = null;
        button.removeAttribute('aria-label');
        button.closest('.choice-zone').querySelector('.btn-primary').style.removeProperty('--yes-scale');
    });

    document.getElementById('miss-hint').textContent = 'Pista: hay una respuesta con más futuro que la otra.';
    document.getElementById('song-hint').textContent = 'Este contrato favorece descaradamente a quien lo escribió.';

    const sealButton = document.getElementById('seal-promise');
    sealButton.textContent = 'Sellar la promesa 💗';
    sealButton.setAttribute('aria-pressed', 'false');
    goToStep(0);
});

function addAmbientSparkles() {
    const ambient = document.querySelector('.ambient');

    for (let index = 0; index < 16; index += 1) {
        const sparkle = document.createElement('span');
        sparkle.className = 'sparkle';
        sparkle.style.left = `${4 + Math.random() * 92}%`;
        sparkle.style.top = `${4 + Math.random() * 92}%`;
        sparkle.style.setProperty('--speed', `${2.2 + Math.random() * 3.2}s`);
        sparkle.style.animationDelay = `${Math.random() * -4}s`;
        ambient.appendChild(sparkle);
    }
}

addAmbientSparkles();
updateProgress(0);
