import { useState, useCallback, useEffect, useRef } from 'react';

export type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
export type Position = { x: number; y: number };
export type Difficulty = 'easy' | 'medium' | 'hard';
export type GameState = 'idle' | 'playing' | 'paused' | 'gameover';

const GRID_SIZE = 20;
const SPEEDS: Record<Difficulty, number> = {
  easy: 180,
  medium: 110,
  hard: 65,
};

function getRandomPosition(snake: Position[]): Position {
  let pos: Position;
  do {
    pos = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (snake.some(s => s.x === pos.x && s.y === pos.y));
  return pos;
}

function getInitialSnake(): Position[] {
  const mid = Math.floor(GRID_SIZE / 2);
  return [
    { x: mid, y: mid },
    { x: mid - 1, y: mid },
    { x: mid - 2, y: mid },
  ];
}

export function useSnakeGame() {
  const [snake, setSnake] = useState<Position[]>(getInitialSnake());
  const [food, setFood] = useState<Position>(() => getRandomPosition(getInitialSnake()));
  const [direction, setDirection] = useState<Direction>('RIGHT');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [highScores, setHighScores] = useState<Record<Difficulty, number>>(() => {
    try {
      const saved = localStorage.getItem('snake-highscores');
      return saved ? JSON.parse(saved) : { easy: 0, medium: 0, hard: 0 };
    } catch {
      return { easy: 0, medium: 0, hard: 0 };
    }
  });

  const directionRef = useRef<Direction>('RIGHT');
  const gameStateRef = useRef<GameState>('idle');
  const snakeRef = useRef<Position[]>(getInitialSnake());
  const foodRef = useRef<Position>(food);
  const scoreRef = useRef(0);
  const gameLoopRef = useRef<number | null>(null);
  const lastDirectionRef = useRef<Direction>('RIGHT');

  // Sync refs
  useEffect(() => { directionRef.current = direction; }, [direction]);
  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { snakeRef.current = snake; }, [snake]);
  useEffect(() => { foodRef.current = food; }, [food]);
  useEffect(() => { scoreRef.current = score; }, [score]);

  // Save high scores
  useEffect(() => {
    try {
      localStorage.setItem('snake-highscores', JSON.stringify(highScores));
    } catch { /* ignore */ }
  }, [highScores]);

  const stopGameLoop = useCallback(() => {
    if (gameLoopRef.current !== null) {
      clearInterval(gameLoopRef.current);
      gameLoopRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    if (gameStateRef.current !== 'playing') return;

    const currentSnake = [...snakeRef.current];
    const head = { ...currentSnake[0] };
    const dir = directionRef.current;

    // Prevent reversing into self
    const opposite: Record<Direction, Direction> = {
      UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT'
    };
    if (opposite[dir] === lastDirectionRef.current) {
      // Use last valid direction
      dir; // no-op, use the stored direction
    }

    switch (dir) {
      case 'UP': head.y -= 1; break;
      case 'DOWN': head.y += 1; break;
      case 'LEFT': head.x -= 1; break;
      case 'RIGHT': head.x += 1; break;
    }

    lastDirectionRef.current = dir;

    // Check wall collision
    if (head.x < 0 || head.x >= GRID_SIZE || head.y < 0 || head.y >= GRID_SIZE) {
      setGameState('gameover');
      stopGameLoop();
      // Update high score
      const currentScore = scoreRef.current;
      setHighScores(prev => {
        const newScores = { ...prev };
        if (currentScore > newScores[difficulty]) {
          newScores[difficulty] = currentScore;
        }
        return newScores;
      });
      return;
    }

    // Check self collision (exclude tail since it will move)
    const willEat = head.x === foodRef.current.x && head.y === foodRef.current.y;
    const bodyToCheck = willEat ? currentSnake : currentSnake.slice(0, -1);
    if (bodyToCheck.some(s => s.x === head.x && s.y === head.y)) {
      setGameState('gameover');
      stopGameLoop();
      const currentScore = scoreRef.current;
      setHighScores(prev => {
        const newScores = { ...prev };
        if (currentScore > newScores[difficulty]) {
          newScores[difficulty] = currentScore;
        }
        return newScores;
      });
      return;
    }

    const newSnake = [head, ...currentSnake];
    if (willEat) {
      const newScore = scoreRef.current + 1;
      setScore(newScore);
      const newFood = getRandomPosition(newSnake);
      setFood(newFood);
    } else {
      newSnake.pop();
    }

    setSnake(newSnake);
  }, [difficulty, stopGameLoop]);

  const startGameLoop = useCallback(() => {
    stopGameLoop();
    const speed = SPEEDS[difficulty];
    gameLoopRef.current = window.setInterval(tick, speed);
  }, [difficulty, tick, stopGameLoop]);

  // Restart game loop when speed changes during play
  useEffect(() => {
    if (gameState === 'playing') {
      startGameLoop();
    }
    return stopGameLoop;
  }, [difficulty, gameState, startGameLoop, stopGameLoop]);

  const startGame = useCallback(() => {
    const initialSnake = getInitialSnake();
    setSnake(initialSnake);
    setFood(getRandomPosition(initialSnake));
    setDirection('RIGHT');
    lastDirectionRef.current = 'RIGHT';
    directionRef.current = 'RIGHT';
    setScore(0);
    setGameState('playing');
  }, []);

  const togglePause = useCallback(() => {
    if (gameState === 'playing') {
      setGameState('paused');
      stopGameLoop();
    } else if (gameState === 'paused') {
      setGameState('playing');
    }
  }, [gameState, stopGameLoop]);

  const changeDirection = useCallback((newDir: Direction) => {
    if (gameStateRef.current !== 'playing') return;
    const opposite: Record<Direction, Direction> = {
      UP: 'DOWN', DOWN: 'UP', LEFT: 'RIGHT', RIGHT: 'LEFT'
    };
    if (opposite[newDir] !== lastDirectionRef.current) {
      setDirection(newDir);
    }
  }, []);

  const changeDifficulty = useCallback((newDiff: Difficulty) => {
    setDifficulty(newDiff);
  }, []);

  return {
    snake,
    food,
    direction,
    gameState,
    score,
    difficulty,
    highScores,
    gridSize: GRID_SIZE,
    startGame,
    togglePause,
    changeDirection,
    changeDifficulty,
  };
}
