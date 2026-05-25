import React, { useState, useEffect, useRef } from "react";
import { Calculator, X, Delete } from "lucide-react";

interface FloatingCalculatorProps {
  onBackdoorTriggered: () => void;
  onClose: () => void;
}

export default function FloatingCalculator({ onBackdoorTriggered, onClose }: FloatingCalculatorProps) {
  const [display, setDisplay] = useState<string>("");
  const [result, setResult] = useState<string>("");
  // Track continuous formula inputs to catch 1+1+1+1+2=
  const [inputBuffer, setInputBuffer] = useState<string>("");
  
  // Dragging state
  const [position, setPosition] = useState({ x: window.innerWidth - 320, y: 150 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const calcRef = useRef<HTMLDivElement>(null);

  // Monitor buffer for backdoor sequence
  useEffect(() => {
    // Look at the buffer. If it contains exactly 1+1+1+1+2=, trigger the backdoor!
    if (inputBuffer.endsWith("1+1+1+1+2=")) {
      onBackdoorTriggered();
      // Clear or reduce buffer so it doesn't trigger repeatedly
      setInputBuffer("");
    }
  }, [inputBuffer, onBackdoorTriggered]);

  // Handle calculator button presses
  const handleNumPress = (num: string) => {
    setDisplay(prev => prev + num);
    setInputBuffer(prev => prev + num);
  };

  const handleOpPress = (op: string) => {
    // Avoid double operators
    if (display === "" && op !== "-") return;
    const lastChar = display.slice(-1);
    if (["+", "-", "*", "/"].includes(lastChar)) {
      setDisplay(prev => prev.slice(0, -1) + op);
      setInputBuffer(prev => prev.slice(0, -1) + op);
    } else {
      setDisplay(prev => prev + op);
      setInputBuffer(prev => prev + op);
    }
  };

  const handleClear = () => {
    setDisplay("");
    setResult("");
    setInputBuffer("");
  };

  const handleBackspace = () => {
    setDisplay(prev => prev.slice(0, -1));
    setInputBuffer(prev => prev.slice(0, -1));
  };

  const handleEqual = () => {
    // Append '=' to the input buffer first to let the backdoor effect trigger
    setInputBuffer(prev => prev + "=");
    
    try {
      if (!display) return;
      // Evaluate basic mathematical expression securely
      // Replace safe multiplication/division characters if we used symbols
      const sanitized = display.replace(/x/g, "*").replace(/÷/g, "/");
      // Use clean safe math evaluation
      // Since it's only digits, operators +, -, *, /, parentheses, and decimals, we can safely compute it.
      if (!/^[0-9+\-*/().\s]+$/.test(sanitized)) {
        throw new Error("Invalid Input");
      }
      // Simple math evaluator function to avoid unsafe eval()
      const evalResult = new Function(`return (${sanitized})`)();
      
      if (evalResult === undefined || isNaN(evalResult) || !isFinite(evalResult)) {
        setResult("Error");
      } else {
        setResult(Number(evalResult).toLocaleString(undefined, { maximumFractionDigits: 6 }));
      }
    } catch {
      setResult("Error");
    }
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target instanceof HTMLButtonElement) return; // Prevent drag on button clicks
    setIsDragging(true);
    dragStartPos.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y
    };
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      
      // Boundaries
      const newX = Math.max(10, Math.min(window.innerWidth - 300, e.clientX - dragStartPos.current.x));
      const newY = Math.max(10, Math.min(window.innerHeight - 400, e.clientY - dragStartPos.current.y));
      
      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  // Support direct keyboard input on the calculator
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Direct keyboard typing logic when active
      const key = e.key;
      if (/[0-9]/.test(key)) {
        handleNumPress(key);
      } else if (["+", "-", "*", "/"].includes(key)) {
        handleOpPress(key);
      } else if (key === "Enter" || key === "=") {
        e.preventDefault();
        handleEqual();
      } else if (key === "Backspace") {
        handleBackspace();
      } else if (key === "Escape") {
        handleClear();
      }
    };

    // Listen only if calculator is hovered or active
    const calcEl = calcRef.current;
    if (calcEl) {
      calcEl.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      if (calcEl) {
        calcEl.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, [display, inputBuffer]);

  return (
    <div
      ref={calcRef}
      id="floating-calculator-widget"
      style={{ left: position.x, top: position.y }}
      className="fixed w-72 bg-slate-900/90 backdrop-blur-md border border-slate-700 rounded-2xl shadow-2xl z-50 overflow-hidden select-none transition-shadow duration-300 hover:shadow-cyan-500/10"
    >
      {/* Title Bar */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-slate-800/80 cursor-grab active:cursor-grabbing border-b border-slate-700/50"
        onMouseDown={handleMouseDown}
      >
        <div className="flex items-center space-x-2 text-slate-300">
          <Calculator className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-display font-semibold tracking-wider uppercase">Exam Calculator</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white hover:bg-slate-700 p-1 rounded-lg transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Screen Display */}
      <div className="bg-slate-950/60 p-4 border-b border-slate-800 flex flex-col justify-end text-right min-h-[84px] focus:outline-none" tabIndex={0}>
        <div className="text-slate-400 text-sm font-mono truncate h-6 selection:bg-cyan-500/20">
          {display || <span className="opacity-30">0</span>}
        </div>
        <div className="text-white text-2xl font-mono truncate font-bold h-8 text-cyan-400 selection:bg-cyan-500/20">
          {result || "0"}
        </div>
      </div>

      {/* Keypad Layout */}
      <div className="grid grid-cols-4 gap-1.5 p-3 bg-slate-900/40">
        {/* Row 1 */}
        <button
          onClick={handleClear}
          className="col-span-2 py-2 px-3 text-xs bg-red-900/40 hover:bg-red-850/60 border border-red-800/30 text-red-200 font-display font-medium rounded-lg transition-all transform active:scale-95 cursor-pointer"
        >
          CLEAR
        </button>
        <button
          onClick={handleBackspace}
          className="py-2 flex items-center justify-center bg-slate-800 hover:bg-slate-700 border border-slate-700/50 text-slate-300 rounded-lg transition-all transform active:scale-95 cursor-pointer"
        >
          <Delete className="w-4 h-4" />
        </button>
        <button
          onClick={() => handleOpPress("/")}
          className="py-2 bg-slate-800 hover:bg-cyan-950/40 hover:text-cyan-400 hover:border-cyan-800 border border-slate-700/50 text-cyan-300 font-mono text-lg font-semibold rounded-lg transition-all transform active:scale-95 cursor-pointer"
        >
          ÷
        </button>

        {/* Row 2 */}
        <button
          onClick={() => handleNumPress("7")}
          className="py-2 bg-slate-800/60 hover:bg-slate-750 hover:text-white border border-slate-700/30 text-slate-300 font-mono text-lg rounded-lg transition-all transform active:scale-95 cursor-pointer"
        >
          7
        </button>
        <button
          onClick={() => handleNumPress("8")}
          className="py-2 bg-slate-800/60 hover:bg-slate-750 hover:text-white border border-slate-700/30 text-slate-300 font-mono text-lg rounded-lg transition-all transform active:scale-95 cursor-pointer"
        >
          8
        </button>
        <button
          onClick={() => handleNumPress("9")}
          className="py-2 bg-slate-800/60 hover:bg-slate-750 hover:text-white border border-slate-700/30 text-slate-300 font-mono text-lg rounded-lg transition-all transform active:scale-95 cursor-pointer"
        >
          9
        </button>
        <button
          onClick={() => handleOpPress("*")}
          className="py-2 bg-slate-800 hover:bg-cyan-950/40 hover:text-cyan-400 hover:border-cyan-800 border border-slate-700/50 text-cyan-300 font-mono text-lg font-semibold rounded-lg transition-all transform active:scale-95 cursor-pointer"
        >
          ×
        </button>

        {/* Row 3 */}
        <button
          onClick={() => handleNumPress("4")}
          className="py-2 bg-slate-800/60 hover:bg-slate-750 hover:text-white border border-slate-700/30 text-slate-300 font-mono text-lg rounded-lg transition-all transform active:scale-95 cursor-pointer"
        >
          4
        </button>
        <button
          onClick={() => handleNumPress("5")}
          className="py-2 bg-slate-800/60 hover:bg-slate-750 hover:text-white border border-slate-700/30 text-slate-300 font-mono text-lg rounded-lg transition-all transform active:scale-95 cursor-pointer"
        >
          5
        </button>
        <button
          onClick={() => handleNumPress("6")}
          className="py-2 bg-slate-800/60 hover:bg-slate-750 hover:text-white border border-slate-700/30 text-slate-300 font-mono text-lg rounded-lg transition-all transform active:scale-95 cursor-pointer"
        >
          6
        </button>
        <button
          onClick={() => handleOpPress("-")}
          className="py-2 bg-slate-800 hover:bg-cyan-950/40 hover:text-cyan-400 hover:border-cyan-800 border border-slate-700/50 text-cyan-300 font-mono text-lg font-semibold rounded-lg transition-all transform active:scale-95 cursor-pointer"
        >
          -
        </button>

        {/* Row 4 */}
        <button
          onClick={() => handleNumPress("1")}
          className="py-2 bg-slate-800/60 hover:bg-slate-750 hover:text-white border border-slate-700/30 text-slate-300 font-mono text-lg rounded-lg transition-all transform active:scale-95 cursor-pointer"
        >
          1
        </button>
        <button
          onClick={() => handleNumPress("2")}
          className="py-2 bg-slate-800/60 hover:bg-slate-750 hover:text-white border border-slate-700/30 text-slate-300 font-mono text-lg rounded-lg transition-all transform active:scale-95 cursor-pointer"
        >
          2
        </button>
        <button
          onClick={() => handleNumPress("3")}
          className="py-2 bg-slate-800/60 hover:bg-slate-750 hover:text-white border border-slate-700/30 text-slate-300 font-mono text-lg rounded-lg transition-all transform active:scale-95 cursor-pointer"
        >
          3
        </button>
        <button
          onClick={() => handleOpPress("+")}
          className="py-2 bg-slate-800 hover:bg-cyan-950/40 hover:text-cyan-400 hover:border-cyan-800 border border-slate-700/50 text-cyan-300 font-mono text-lg font-semibold rounded-lg transition-all transform active:scale-95 cursor-pointer"
        >
          +
        </button>

        {/* Row 5 */}
        <button
          onClick={() => handleNumPress("0")}
          className="col-span-2 py-2 bg-slate-800/60 hover:bg-slate-750 hover:text-white border border-slate-700/30 text-slate-300 font-mono text-lg rounded-lg transition-all transform active:scale-95 cursor-pointer"
        >
          0
        </button>
        <button
          onClick={() => handleNumPress(".")}
          className="py-2 bg-slate-800/60 hover:bg-slate-750 hover:text-white border border-slate-700/30 text-slate-300 font-mono text-lg rounded-lg transition-all transform active:scale-95 cursor-pointer"
        >
          .
        </button>
        <button
          onClick={handleEqual}
          className="py-2 bg-cyan-600 hover:bg-cyan-500 border border-cyan-500/35 text-white font-mono text-lg font-bold rounded-lg transition-all transform active:scale-95 shadow-lg shadow-cyan-600/25 cursor-pointer"
        >
          =
        </button>
      </div>
    </div>
  );
}
