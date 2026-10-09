// Canvas

import { PARAMS } from './params';
import { initAudio, getPitch } from './audio';
import { pipes, character, PIPE_WIDTH, pipe_gap } from './entities';

; (async () => {

  const canvas = document.querySelector<HTMLCanvasElement>('canvas')
  if (!canvas) return

  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Elements graphiques
  const buttonStartgame = document.getElementById('startButton')
  const buttonPausegame = document.getElementById('pauseButton')
  const buttonContinuegame = document.getElementById('continueButton')
  const finishPanel = document.getElementById('finishPanel')
  const mainTitle = document.getElementById('mainTitle')
  const pauseOverlay = document.getElementById('pauseOverlay')
  const finalScore = document.getElementById('finalScore')
  const scoreDisplay = document.getElementById('scoreDisplay')
  const restartButton = document.getElementById('restartButton')

  // Backgrounds
  const backgroundImage = new Image()
  backgroundImage.src = 'arbres.png'
  const backgroundImage2 = new Image()
  backgroundImage2.src = 'nuages.png'

  // Tuyau (sprite)
  const pipeImage = new Image()
  pipeImage.src = 'pipe.png'
  const PIPE_CAP_H = 100
  const PIPE_OVERFLOW = 40

  // Character Sprite
  const duckSprite = new Image()
  duckSprite.src = 'duck.png'
  const spritesWidth = 45
  const spritesHeight = 45
  let duckFrame = 0
  let duckFrameTimer = 0
  const DUCK_TOTAL_FRAMES = 5
  const FRAME_DURATION = 100

  // SFX
  const addPointSound = new Audio("pointSound.mp3");
  addPointSound.volume = 0.2

  const deathSound = new Audio("deathSound.mp3");
  deathSound.volume = 0.2

  let frameRequest: number | undefined = undefined
  let time: number = 0
  let delta: number = 0
  let elapsed: number = 0
  let startGame: boolean = false
  let score = 0
  let isGamePaused: boolean = false
  let isGameFinished: boolean = false
  let currentPitchHz = 0
  let currentVolume = 0

  let positionBg = 0
  let positionBg2 = 1940
  let positionBg3 = 0
  let positionBg4 = 1940
  let increasedifficulty = 0
  let intervalId: any = null;

  if (scoreDisplay) {
    scoreDisplay.textContent = score.toString();
    scoreDisplay.setAttribute('data-text', score.toString());
  }

  initAudio();

  function randomGapY(): number {
    const minGapY = 60
    const maxGapY = (canvas?.height ?? 650) - pipe_gap - 10
    return minGapY + Math.random() * (maxGapY - minGapY)
  }

  function drawPipe(x: number, y: number, h: number, flipped: boolean): void {
    if (!ctx || !pipeImage.complete || h <= 0) return

    const scale = PIPE_WIDTH / pipeImage.width
    const capH = Math.min(PIPE_CAP_H * scale, h)

    ctx.save()
    if (flipped) {
      ctx.translate(0, y + h)
      ctx.scale(1, -1)
      y = 0
    }

    ctx.drawImage(
      pipeImage,
      0, 0, pipeImage.width, PIPE_CAP_H,
      x, y, PIPE_WIDTH, capH
    )

    if (h > capH) {
      ctx.drawImage(
        pipeImage,
        0, PIPE_CAP_H, pipeImage.width, pipeImage.height - PIPE_CAP_H,
        x, y + capH, PIPE_WIDTH, h - capH
      )
    }

    ctx.restore()
  }

  buttonStartgame?.addEventListener('click', gameStart)
  buttonPausegame?.addEventListener('click', pause)
  buttonContinuegame?.addEventListener('click', gameContinue)
  restartButton?.addEventListener('click', gameRestart)

  addEventListener('resize', resize)
  resize()
  play()

  function resize(): void {
    if (!canvas) return
    canvas.width = window.innerWidth
    canvas.height = 650
  }

  function render(): void {
    if (!ctx || !canvas) return

    if (isGamePaused !== true) {

      const currentTime = Date.now()
      delta = currentTime - time
      time = currentTime
      elapsed += delta

      duckFrameTimer += delta
      if (duckFrameTimer >= FRAME_DURATION) {
        duckFrame = (duckFrame + 1) % DUCK_TOTAL_FRAMES
        duckFrameTimer = 0
      }

      // Analyse audio stable par autocorrélation
      const audioInfo = getPitch();
      currentPitchHz = audioInfo.pitchHz;
      currentVolume = audioInfo.volume;

      if (startGame) {
        // Seuil de détection du bruit
        if (currentVolume > 20 && currentPitchHz > 0) {
          const moveSpeed = 5;

          // Voix aiguë (> 230 Hz) -> Monte
          if (currentPitchHz > 230) {
            character.targetY -= moveSpeed;
          }
          // Voix grave (< 180 Hz) -> Descend
          else if (currentPitchHz < 180) {
            character.targetY += moveSpeed;
          }

          const minY = 60;
          const maxY = canvas.height - 100;
          character.targetY = Math.max(minY, Math.min(maxY, character.targetY));
        }

        character.y += (character.targetY - character.y) * 0.15;
      }

      if (startGame === true) {
        pipes.forEach(pipe => {
          pipe.x -= PARAMS.speed

          if (pipe.x < -PIPE_WIDTH) {
            const rightmostX = Math.max(...pipes.map(p => p.x))
            const spacing = 400 + Math.random() * 200
            pipe.x = Math.max(rightmostX + spacing, window.innerWidth + 30)
            pipe.passed = false
            pipe.gapY = randomGapY()
          }

          // Augmentation du score
          if (!pipe.passed && pipe.x + PIPE_WIDTH < character.x) {
            score += 1;
            pipe.passed = true;
            addPointSound.currentTime = 0;
            addPointSound.play();

            if (increasedifficulty < 2) {
              increasedifficulty += 1;
            } else {
              increasedifficulty = 0;
              PARAMS.speed += 0.5;
            }

            if (scoreDisplay) {
              scoreDisplay.textContent = score.toString();
              scoreDisplay.setAttribute('data-text', score.toString());
            }
          }

          // Collisions
          const inset = PARAMS.radius * 0.5
          const duckLeft = character.x + inset
          const duckRight = character.x + PARAMS.radius - inset
          const duckTop = character.y + inset
          const duckBottom = character.y + PARAMS.radius - inset

          const overlapX = duckRight > pipe.x && duckLeft < pipe.x + PIPE_WIDTH
          const hitTop = duckTop < pipe.gapY
          const hitBottom = duckBottom > pipe.gapY + pipe_gap

          if (overlapX && (hitTop || hitBottom)) {
            isGamePaused = true
            isGameFinished = true
            deathSound.currentTime = 0
            deathSound.play()
          }
        })

        if (isGameFinished === true) {
          finishPanel?.classList.remove('hidden')
          buttonPausegame?.classList.add("hidden")
          buttonContinuegame?.classList.add("hidden")
          scoreDisplay?.classList.add('hidden')
          finalScore && (finalScore.textContent = score.toString());
        }
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Nuages
      ctx.drawImage(backgroundImage2, positionBg3, canvas.height - 200)
      ctx.drawImage(backgroundImage2, positionBg4, canvas.height - 200)

      positionBg3 -= PARAMS.speed - 0.3
      positionBg4 -= PARAMS.speed - 0.3

      if (positionBg3 <= -1940) positionBg3 = positionBg4 + 1940
      if (positionBg4 <= -1940) positionBg4 = positionBg3 + 1940

      // Arbres
      ctx.drawImage(backgroundImage, positionBg, canvas.height - 132)
      ctx.drawImage(backgroundImage, positionBg2, canvas.height - 132)

      const speedTrees = PARAMS.speed
      positionBg -= speedTrees
      positionBg2 -= speedTrees

      if (positionBg <= -1940) positionBg = positionBg2 + 1940
      if (positionBg2 <= -1940) positionBg2 = positionBg + 1940

      // Tuyaux
      ctx.imageSmoothingEnabled = false
      pipes.forEach(pipe => {
        drawPipe(pipe.x, -PIPE_OVERFLOW, pipe.gapY + PIPE_OVERFLOW, true)
        const bottomY = pipe.gapY + pipe_gap
        drawPipe(pipe.x, bottomY, canvas.height - bottomY + PIPE_OVERFLOW, false)
      })

      // Character
      ctx.beginPath()
      ctx.drawImage(
        duckSprite,
        duckFrame * spritesWidth,
        0,
        spritesWidth,
        spritesHeight,
        character.x,
        character.y,
        PARAMS.radius,
        PARAMS.radius
      )
      ctx.fill()

      // HUD Debug
      ctx.save();
      ctx.font = '16px monospace';
      ctx.fillStyle = currentVolume > 20 ? '#00ff66' : '#ff3333';
      ctx.fillText(`Vol: ${currentVolume}`, 20, 40);
      ctx.fillText(currentPitchHz > 0 ? `Freq: ${currentPitchHz} Hz` : `Freq: -- Hz`, 20, 65);
      ctx.restore();

    }
  }

  function tick(): void {
    frameRequest = requestAnimationFrame(tick)
    render()
  }

  function play(): void {
    if (frameRequest === undefined) {
      time = Date.now()
      tick()
    }
  }

  function pauseTitleTogle() {
    pauseOverlay?.classList.toggle('hidden')
  }

  function pause(): void {
    isGamePaused = true
    buttonPausegame?.classList.add("hidden")
    buttonContinuegame?.classList.remove("hidden")
    pauseOverlay?.classList.remove('hidden')
    intervalId ??= setInterval(pauseTitleTogle, 600);
  }

  function gameStart() {
    startGame = true
    buttonStartgame?.classList.add("hidden")
    buttonPausegame?.classList.remove("hidden")
    scoreDisplay?.classList.remove("hidden")
    mainTitle?.classList.add("hidden")
  }

  function gameContinue() {
    isGamePaused = false
    buttonPausegame?.classList.remove("hidden")
    buttonContinuegame?.classList.add("hidden")
    pauseOverlay?.classList.add('hidden')
    clearInterval(intervalId);
    intervalId = null;
  }

  function gameRestart() {
    startGame = false;
    isGamePaused = false;
    isGameFinished = false;
    score = 0;

    character.y = 285;
    character.targetY = 250;

    pipes.forEach((pipe, i) => {
      pipe.x = window.innerWidth + 30 + i * (400 + Math.random() * 200)
      pipe.passed = false
      pipe.gapY = randomGapY()
    })

    positionBg = 0;
    positionBg2 = 1940;
    positionBg3 = 0;
    positionBg4 = 1940;
    increasedifficulty = 0
    PARAMS.speed = 2

    if (scoreDisplay) {
      scoreDisplay.textContent = '0';
      scoreDisplay.setAttribute('data-text', '0');
      scoreDisplay.classList.add('hidden');
    }

    finishPanel?.classList.add('hidden');
    buttonPausegame?.classList.add('hidden');
    buttonContinuegame?.classList.add('hidden');
    buttonStartgame?.classList.remove('hidden');
    mainTitle?.classList.remove('hidden');
  }

})()