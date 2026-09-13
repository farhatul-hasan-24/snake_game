import { useEffect, useRef, useCallback } from 'react';
import { useSnakeGame, Direction, Difficulty } from '../hooks/useSnakeGame';

export default function SnakeGame() {
  const {
    snake,
    food,
    gameState,
    score,
    difficulty,
    highScores,
    gridSize,
    startGame,
    togglePause,
    changeDirection,
    changeDifficulty,
  } = useSnakeGame();

  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const keyMap: Record<string, Direction> = {
        ArrowUp: 'UP', ArrowDown: 'DOWN', ArrowLeft: 'LEFT', ArrowRight: 'RIGHT',
        w: 'UP', s: 'DOWN', a: 'LEFT', d: 'RIGHT',
        W: 'UP', S: 'DOWN', A: 'LEFT', D: 'RIGHT',
      };

      if (keyMap[e.key]) {
        e.preventDefault();
        changeDirection(keyMap[e.key]);
      } else if (e.key === ' ' || e.key === 'Escape') {
        e.preventDefault();
        if (gameState === 'idle' || gameState === 'gameover') {
          startGame();
        } else {
          togglePause();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        startGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeDirection, togglePause, startGame, gameState]);

  // Touch controls
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const minSwipe = 30;

    if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      changeDirection(dx > 0 ? 'RIGHT' : 'LEFT');
    } else {
      changeDirection(dy > 0 ? 'DOWN' : 'UP');
    }
    touchStartRef.current = null;
  }, [changeDirection]);

  // Generate grid cells
  const cells = [];
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const isSnakeHead = snake[0]?.x === x && snake[0]?.y === y;
      const snakeIndex = snake.findIndex(s => s.x === x && s.y === y);
      const isSnake = snakeIndex !== -1;
      const isFood = food.x === x && food.y === y;

      let cellClass = 'w-full h-full rounded-sm transition-all duration-75 ';

      if (isSnakeHead) {
        cellClass += 'bg-emerald-500 shadow-lg shadow-emerald-500/30 scale-110 rounded-md z-10';
      } else if (isSnake) {
        const opacity = Math.max(0.4, 1 - (snakeIndex / snake.length) * 0.6);
        cellClass += `bg-emerald-400 rounded-sm`;
        cells.push(
          <div
            key={`${x}-${y}`}
            className={cellClass}
            style={{ opacity }}
          />
        );
        continue;
      } else if (isFood) {
        cellClass += 'bg-red-500 rounded-full animate-pulse shadow-lg shadow-red-500/40 scale-90';
      } else {
        cellClass += 'bg-gray-800/30 dark:bg-gray-700/20';
      }

      cells.push(
        <div
          key={`${x}-${y}`}
          className={cellClass}
        />
      );
    }
  }

  const difficultyOptions: { value: Difficulty; label: string; color: string }[] = [
    { value: 'easy', label: 'Easy', color: 'bg-green-500' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
    { value: 'hard', label: 'Hard', color: 'bg-red-500' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex flex-col items-center justify-center p-4 select-none">
      {/* Header */}
      <div className="w-full max-w-lg mb-4">
        <h1 className="text-3xl md:text-4xl font-bold text-center text-white mb-2 tracking-tight">
          🐍 Snake
        </h1>

        {/* Score Display */}
        <div className="flex justify-between items-center mb-3 px-2">
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-gray-400">Score</div>
            <div className="text-2xl font-bold text-white">{score}</div>
          </div>
          <div className="text-center">
            <div className="text-xs uppercase tracking-wider text-gray-400">
              Best ({difficulty})
            </div>
            <div className="text-2xl font-bold text-amber-400">{highScores[difficulty]}</div>
          </div>
        </div>

        {/* Difficulty Selector */}
        <div className="flex justify-center gap-2 mb-3">
          {difficultyOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => changeDifficulty(opt.value)}
              disabled={gameState === 'playing' || gameState === 'paused'}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200
                ${difficulty === opt.value
                  ? `${opt.color} text-white shadow-lg scale-105`
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }
                ${(gameState === 'playing' || gameState === 'paused') ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Game Board */}
      <div
        ref={boardRef}
        className="relative w-full max-w-lg aspect-square bg-gray-900/80 rounded-xl border-2 border-gray-700/50 shadow-2xl overflow-hidden backdrop-blur-sm"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Grid */}
        <div
          className="w-full h-full grid gap-[1px] p-1"
          style={{
            gridTemplateColumns: `repeat(${gridSize}, 1fr)`,
            gridTemplateRows: `repeat(${gridSize}, 1fr)`,
          }}
        >
          {cells}
        </div>

        {/* Overlay for idle/paused/gameover */}
        {gameState !== 'playing' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-20">
            {gameState === 'idle' && (
              <>
                <div className="text-5xl mb-4 animate-bounce">🐍</div>
                <p className="text-white text-lg font-medium mb-2">Ready to play?</p>
                <p className="text-gray-400 text-sm mb-4">Use arrow keys, WASD, or swipe</p>
                <button
                  onClick={startGame}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  Start Game
                </button>
              </>
            )}
            {gameState === 'paused' && (
              <>
                <div className="text-4xl mb-4">⏸️</div>
                <p className="text-white text-xl font-bold mb-4">Paused</p>
                <button
                  onClick={togglePause}
                  className="px-6 py-3 bg-blue-500 hover:bg-blue-400 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 transition-all duration-200 hover:scale-105 active:scale-95"
                >
                  Resume
                </button>
              </>
            )}
            {gameState === 'gameover' && (
              <>
                <div className="text-4xl mb-3">💀</div>
                <p className="text-white text-xl font-bold mb-1">Game Over!</p>
                <p className="text-gray-300 text-lg mb-1">Score: <span className="text-emerald-400 font-bold">{score}</span></p>
                {score > 0 && score >= highScores[difficulty] && (
                  <p className="text-amber-400 text-sm font-semibold mb-3 animate-pulse">🏆 New High Score!</p>
                )}
                <button
                  onClick={startGame}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-xl shadow-lg shadow-emerald-500/30 transition-all duration-200 hover:scale-105 active:scale-95 mt-2"
                >
                  Play Again
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="w-full max-w-lg mt-4">
        {/* Action Buttons */}
        <div className="flex justify-center gap-3 mb-4">
          {gameState === 'playing' && (
            <button
              onClick={togglePause}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
            >
              ⏸ Pause
            </button>
          )}
          {(gameState === 'playing' || gameState === 'paused') && (
            <button
              onClick={startGame}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
            >
              🔄 Restart
            </button>
          )}
        </div>

        {/* Mobile D-Pad */}
        <div className="flex flex-col items-center gap-1 md:hidden">
          <button
            onTouchStart={(e) => { e.preventDefault(); changeDirection('UP'); }}
            className="w-14 h-14 bg-gray-700/80 hover:bg-gray-600 active:bg-emerald-600 rounded-xl flex items-center justify-center text-white text-xl transition-all duration-100 active:scale-90 shadow-md"
          >
            ▲
          </button>
          <div className="flex gap-1">
            <button
              onTouchStart={(e) => { e.preventDefault(); changeDirection('LEFT'); }}
              className="w-14 h-14 bg-gray-700/80 hover:bg-gray-600 active:bg-emerald-600 rounded-xl flex items-center justify-center text-white text-xl transition-all duration-100 active:scale-90 shadow-md"
            >
              ◀
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); changeDirection('DOWN'); }}
              className="w-14 h-14 bg-gray-700/80 hover:bg-gray-600 active:bg-emerald-600 rounded-xl flex items-center justify-center text-white text-xl transition-all duration-100 active:scale-90 shadow-md"
            >
              ▼
            </button>
            <button
              onTouchStart={(e) => { e.preventDefault(); changeDirection('RIGHT'); }}
              className="w-14 h-14 bg-gray-700/80 hover:bg-gray-600 active:bg-emerald-600 rounded-xl flex items-center justify-center text-white text-xl transition-all duration-100 active:scale-90 shadow-md"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Desktop hint */}
        <div className="hidden md:flex justify-center gap-4 text-gray-500 text-xs mt-2">
          <span>↑↓←→ or WASD to move</span>
          <span>Space to pause</span>
          <span>R to restart</span>
        </div>
      </div>
    </div>
  );
}
