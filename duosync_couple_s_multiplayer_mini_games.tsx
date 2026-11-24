import React, { useState, useEffect, useRef, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  signInWithCustomToken, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  Heart, 
  Sparkles, 
  Users, 
  Copy, 
  Check, 
  Play, 
  Trophy, 
  ArrowLeft, 
  Zap, 
  MessageCircleHeart,
  SplitSquareHorizontal,
  Gamepad2,
  RefreshCw,
  Crown,
  Share2,
  Flame,
  Star
} from 'lucide-react';

// ==========================================
// FIREBASE INITIALIZATION (STRICT RULES)
// ==========================================
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : { apiKey: "demo-key", authDomain: "demo.firebaseapp.com", projectId: "demo-project" };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'duosync-couple-app';

// ==========================================
// GAME DATA & CONSTANTS
// ==========================================
const QUIZ_QUESTIONS = [
  {
    id: 1,
    category: "Dream Date",
    question: "What is our ideal spontaneous Friday night?",
    options: [
      { id: 'A', text: "Cozy blanket fort, takeout & movies", emoji: "🍿" },
      { id: 'B', text: "Dressing up for a rooftop dinner", emoji: "🥂" },
      { id: 'C', text: "Midnight drive with loud music", emoji: "🚗" },
      { id: 'D', text: "Competitive board game tournament", emoji: "🎲" }
    ]
  },
  {
    id: 2,
    category: "Superpowers",
    question: "If we could teleport anywhere right now for 24 hours?",
    options: [
      { id: 'A', text: "A cozy cabin in snowy Switzerland", emoji: "🏔️" },
      { id: 'B', text: "Street food tour in Tokyo", emoji: "🍜" },
      { id: 'C', text: "Sunset beach villa in Bali", emoji: "🌴" },
      { id: 'D', text: "Stargazing in the desert", emoji: "🌌" }
    ]
  },
  {
    id: 3,
    category: "Love Language",
    question: "Which small gesture melts hearts the fastest?",
    options: [
      { id: 'A', text: "Surprise coffee/snack brought over", emoji: "🧋" },
      { id: 'B', text: "A long, tight hug after a busy day", emoji: "🫂" },
      { id: 'C', text: "A handwritten note or sweet text", emoji: "💌" },
      { id: 'D', text: "Planning everything so the other relaxes", emoji: "✨" }
    ]
  },
  {
    id: 4,
    category: "Hypothetical",
    question: "In a zombie apocalypse, what is our team strategy?",
    options: [
      { id: 'A', text: "Fortify a luxury shopping mall", emoji: "🏰" },
      { id: 'B', text: "Steal a yacht and live at sea", emoji: "⛵" },
      { id: 'C', text: "Hide in an underground bunker with snacks", emoji: "🥫" },
      { id: 'D', text: "Become dramatic action movie heroes", emoji: "🦸" }
    ]
  },
  {
    id: 5,
    category: "Morning Vibes",
    question: "Sunday morning at 10:00 AM looks like...",
    options: [
      { id: 'A', text: "Still fast asleep until noon", emoji: "😴" },
      { id: 'B', text: "Making pancakes together in the kitchen", emoji: "🥞" },
      { id: 'C', text: "Morning walk & iced lattes", emoji: "☀️" },
      { id: 'D', text: "Scrolling memes side-by-side in bed", emoji: "📱" }
    ]
  }
];

const REACTION_EMOJIS = ["❤️", "😘", "🔥", "😂", "🥺", "🎉"];

const generateRoomCode = () => {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// ==========================================
// FLOATING REACTIONS COMPONENT
// ==========================================
const FloatingReactions = ({ reactions }) => {
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {reactions.map((r) => (
        <div
          key={r.id}
          style={{
            left: `${r.left}%`,
            animationDuration: '2.4s'
          }}
          className="absolute bottom-16 animate-float-up flex flex-col items-center"
        >
          <span className="text-4xl drop-shadow-md">{r.emoji}</span>
          {r.senderName && (
            <span className="mt-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-rose-600 shadow-sm">
              {r.senderName}
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

// ==========================================
// MINI-GAME 1: SYNC COMPATIBILITY QUIZ
// ==========================================
const SyncQuizGame = ({ 
  roomData, 
  playerRole, // 'p1' or 'p2'
  onSelectAnswer, 
  onNextQuestion, 
  onBackToHub 
}) => {
  const quizState = roomData.quiz || {
    questionIndex: 0,
    p1Answer: null,
    p2Answer: null,
    matches: 0,
    history: []
  };

  const currentIdx = quizState.questionIndex;
  const isFinished = currentIdx >= QUIZ_QUESTIONS.length;
  const currentQ = QUIZ_QUESTIONS[Math.min(currentIdx, QUIZ_QUESTIONS.length - 1)];

  const myAnswer = playerRole === 'p1' ? quizState.p1Answer : quizState.p2Answer;
  const partnerAnswer = playerRole === 'p1' ? quizState.p2Answer : quizState.p1Answer;
  const bothAnswered = quizState.p1Answer !== null && quizState.p2Answer !== null;
  const isMatch = bothAnswered && quizState.p1Answer === quizState.p2Answer;

  const p1Name = roomData.p1?.name || "Player 1";
  const p2Name = roomData.p2?.name || "Player 2";
  const partnerName = playerRole === 'p1' ? p2Name : p1Name;

  if (isFinished) {
    const percentage = Math.round((quizState.matches / QUIZ_QUESTIONS.length) * 100);
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center animate-fade-in">
        <div className="relative mb-4">
          <div className="absolute -inset-3 rounded-full bg-gradient-to-r from-rose-400 to-amber-400 opacity-30 blur-lg animate-pulse" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-xl">
            <Trophy className="h-12 w-12" />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800">
          Sync Score: <span className="text-rose-600">{percentage}%</span>
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          You matched on <span className="font-bold text-rose-600">{quizState.matches}</span> out of {QUIZ_QUESTIONS.length} questions!
        </p>

        <div className="mt-4 w-full max-w-md rounded-2xl bg-rose-50/80 p-4 border border-rose-100">
          <p className="text-sm font-semibold text-rose-800">
            {percentage === 100 
              ? "Telepathic Soulmates! Are you sure you aren't sharing one brain?" 
              : percentage >= 60 
              ? "In Sync & Thriving! You know each other's vibe inside out." 
              : "Opposites Attract! Plenty of fun surprises left to discover."}
          </p>
        </div>

        <button
          onClick={onBackToHub}
          className="mt-6 flex items-center gap-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-600 px-6 py-3 font-bold text-white shadow-lg shadow-rose-200 transition hover:scale-105 active:scale-95"
        >
          <Gamepad2 className="h-5 w-5" />
          Back to Game Lounge
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full justify-between p-3 sm:p-5">
      {/* Top Progress Header */}
      <div>
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-2">
          <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-600">
            {currentQ.category}
          </span>
          <span>
            Question {currentIdx + 1} / {QUIZ_QUESTIONS.length}
          </span>
          <span className="flex items-center gap-1 text-amber-600">
            <Sparkles className="h-3.5 w-3.5" /> {quizState.matches} Matches
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
          <div 
            className="h-full bg-gradient-to-r from-rose-500 to-amber-400 transition-all duration-500"
            style={{ width: `${((currentIdx + (bothAnswered ? 1 : 0.3)) / QUIZ_QUESTIONS.length) * 100}%` }}
          />
        </div>

        {/* Question Card */}
        <div className="mt-4 rounded-2xl bg-gradient-to-br from-rose-50 via-white to-amber-50 p-4 sm:p-5 border border-rose-100 shadow-sm">
          <h3 className="text-base sm:text-lg font-extrabold text-slate-800 leading-snug">
            {currentQ.question}
          </h3>
          
          {/* Live Partner Thinking Indicator */}
          <div className="mt-3 flex items-center gap-2 text-xs">
            {bothAnswered ? (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-bold ${
                isMatch 
                  ? "bg-emerald-100 text-emerald-700" 
                  : "bg-amber-100 text-amber-700"
              }`}>
                {isMatch ? "🎉 IT'S A MATCH! Same wavelength!" : "💫 Different picks! Opposites attract!"}
              </span>
            ) : partnerAnswer ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 font-semibold text-rose-700 animate-pulse">
                <Check className="h-3.5 w-3.5" /> {partnerName} locked in their answer!
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 font-medium text-slate-500">
                <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
                Waiting for {partnerName} to pick...
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Options Grid */}
      <div className="my-3 grid grid-cols-1 gap-2.5">
        {currentQ.options.map((opt) => {
          const isSelectedByMe = myAnswer === opt.id;
          const isSelectedByPartner = bothAnswered && partnerAnswer === opt.id;

          let cardStyle = "border-slate-200 bg-white hover:border-rose-300 hover:bg-rose-50/40";
          if (isSelectedByMe && isSelectedByPartner) {
            cardStyle = "border-emerald-500 bg-emerald-50 ring-2 ring-emerald-400/50";
          } else if (isSelectedByMe) {
            cardStyle = "border-rose-500 bg-rose-50 ring-2 ring-rose-400/40";
          } else if (isSelectedByPartner) {
            cardStyle = "border-indigo-400 bg-indigo-50/70";
          }

          return (
            <button
              key={opt.id}
              disabled={bothAnswered}
              onClick={() => onSelectAnswer(opt.id)}
              className={`group relative flex items-center justify-between rounded-xl border-2 p-3 text-left transition-all duration-200 active:scale-[0.99] ${cardStyle}`}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-lg group-hover:scale-110 transition-transform">
                  {opt.emoji}
                </span>
                <span className="text-xs sm:text-sm font-bold text-slate-700">
                  {opt.text}
                </span>
              </div>

              {/* Badges showing who picked what */}
              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                {isSelectedByMe && (
                  <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    You
                  </span>
                )}
                {isSelectedByPartner && (
                  <span className="rounded-full bg-indigo-500 px-2 py-0.5 text-[10px] font-bold text-white">
                    {partnerName}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Next Button when both answered */}
      <div className="h-12 flex items-center justify-center">
        {bothAnswered ? (
          <button
            onClick={onNextQuestion}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 py-3 font-bold text-white shadow-md shadow-rose-200 transition hover:brightness-110 active:scale-95"
          >
            {currentIdx + 1 >= QUIZ_QUESTIONS.length ? "See Compatibility Results" : "Next Question"}
            <Sparkles className="h-4 w-4" />
          </button>
        ) : (
          <p className="text-xs text-slate-400 font-medium">
            {myAnswer ? "Answer locked! Waiting for reveal..." : "Tap an option to lock in your choice"}
          </p>
        )}
      </div>
    </div>
  );
};

// ==========================================
// MINI-GAME 2: TANDEM HEART RUSH (CO-OP TAPPER)
// ==========================================
const TandemHeartRush = ({
  roomData,
  playerRole,
  onSendTap,
  onStartRace,
  onBackToHub
}) => {
  const race = roomData.race || {
    status: 'waiting', // 'waiting' | 'playing' | 'finished'
    p1Taps: 0,
    p2Taps: 0,
    goal: 60,
    startTime: null
  };

  const [localBounce, setLocalBounce] = useState(false);

  const p1Name = roomData.p1?.name || "Player 1";
  const p2Name = roomData.p2?.name || "Player 2";

  const p1Count = race.p1Taps || 0;
  const p2Count = race.p2Taps || 0;
  const totalTaps = p1Count + p2Count;
  const goal = race.goal || 60;
  const progressPct = Math.min(100, Math.round((totalTaps / goal) * 100));
  const isGoalReached = totalTaps >= goal;

  const handleHeartTap = () => {
    if (race.status !== 'playing' || isGoalReached) return;
    setLocalBounce(true);
    setTimeout(() => setLocalBounce(false), 120);
    onSendTap();
  };

  return (
    <div className="flex flex-col h-full justify-between p-4 sm:p-6 text-center">
      {/* Header */}
      <div>
        <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-extrabold text-amber-700">
          <Flame className="h-3.5 w-3.5 fill-amber-500" /> CO-OP LOVE METER CHALLENGE
        </div>
        <h3 className="mt-2 text-lg sm:text-xl font-extrabold text-slate-800">
          Tandem Heart Rush
        </h3>
        <p className="text-xs text-slate-500">
          Combine your taps together to fill the Love Meter to {goal} hearts!
        </p>
      </div>

      {/* Shared Love Meter Progress */}
      <div className="my-4 rounded-2xl bg-gradient-to-b from-rose-50 to-pink-50 p-4 border border-rose-100 shadow-inner">
        <div className="flex items-end justify-between mb-2">
          <div className="text-left">
            <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">
              Combined Power
            </span>
            <div className="text-2xl font-black text-rose-600">
              {totalTaps} <span className="text-sm font-bold text-rose-400">/ {goal} ❤️</span>
            </div>
          </div>
          <div className="text-right text-xs font-bold text-slate-600">
            <div>{p1Name}: <span className="text-rose-600">{p1Count}</span></div>
            <div>{p2Name}: <span className="text-indigo-600">{p2Count}</span></div>
          </div>
        </div>

        {/* Dual-colored stacked progress bar */}
        <div className="h-5 w-full overflow-hidden rounded-full bg-white p-1 shadow-inner flex">
          <div 
            className="h-full rounded-l-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-150"
            style={{ width: `${Math.min(100, (p1Count / goal) * 100)}%` }}
          />
          <div 
            className="h-full rounded-r-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-150"
            style={{ width: `${Math.min(100 - (p1Count / goal) * 100, (p2Count / goal) * 100)}%` }}
          />
        </div>
      </div>

      {/* Center Interactive Heart Button */}
      <div className="flex flex-col items-center justify-center my-2">
        {race.status === 'waiting' && (
          <button
            onClick={onStartRace}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 px-8 py-4 text-base font-extrabold text-white shadow-xl shadow-rose-200 transition hover:scale-105 active:scale-95"
          >
            <Play className="h-5 w-5 fill-white" />
            Start Tandem Rush!
          </button>
        )}

        {race.status === 'playing' && !isGoalReached && (
          <button
            onClick={handleHeartTap}
            className={`relative flex h-36 w-36 sm:h-40 sm:w-40 flex-col items-center justify-center rounded-full bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-2xl shadow-rose-300 transition-transform select-none touch-manipulation ${
              localBounce ? 'scale-90' : 'hover:scale-105 active:scale-90'
            }`}
          >
            <Heart className="h-16 w-16 fill-white animate-pulse" />
            <span className="mt-1 text-xs font-black uppercase tracking-widest">
              TAP FAST!
            </span>
          </button>
        )}

        {isGoalReached && (
          <div className="animate-fade-in flex flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
              <Crown className="h-10 w-10" />
            </div>
            <h4 className="text-xl font-black text-slate-800">
              Love Meter Overflowing! 🎉
            </h4>
            <p className="text-xs text-slate-600 mt-1">
              {p1Name} contributed {Math.round((p1Count / totalTaps) * 100)}% & {p2Name} contributed {Math.round((p2Count / totalTaps) * 100)}%
            </p>
            <div className="mt-4 flex gap-3">
              <button
                onClick={onStartRace}
                className="flex items-center gap-1.5 rounded-xl bg-rose-100 px-4 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-200"
              >
                <RefreshCw className="h-4 w-4" /> Play Again
              </button>
              <button
                onClick={onBackToHub}
                className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-700"
              >
                Game Lounge
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer Tip */}
      <div className="text-[11px] font-medium text-slate-400">
        {race.status === 'playing' && !isGoalReached 
          ? "Both partners tap at the same time for double speed!" 
          : "Synced live across both screens"}
      </div>
    </div>
  );
};

// ==========================================
// SHARED COUPLE ROOM SCREEN COMPONENT
// ==========================================
const CoupleRoomScreen = ({
  roomData,
  playerRole,
  onUpdateRoom,
  onTriggerReaction,
  onLeaveRoom,
  isDemoPane = false
}) => {
  const [copied, setCopied] = useState(false);

  const activeGame = roomData.activeGame || 'lobby';
  const me = playerRole === 'p1' ? roomData.p1 : roomData.p2;

  const shareUrl = useMemo(() => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('room', roomData.code);
      return url.toString();
    } catch {
      return `${window.location.origin}/?room=${roomData.code}`;
    }
  }, [roomData.code]);

  const handleCopyInvite = async () => {
    const textToCopy = `Join my DuoSync couple room! Code: ${roomData.code} — Link: ${shareUrl}`;
    let copySuccess = false;

    // 1. Try modern Clipboard API first (with try/catch for iframe permissions policy)
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(textToCopy);
        copySuccess = true;
      }
    } catch (err) {
      // Clipboard API blocked by iframe permissions policy; fall back below
    }

    // 2. Fallback to textarea + execCommand('copy') for sandboxed environments
    if (!copySuccess) {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.left = '-9999px';
        textArea.style.top = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        copySuccess = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (fallbackErr) {
        console.warn('Fallback copy failed:', fallbackErr);
      }
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  // Quiz Handlers
  const handleSelectQuizAnswer = (optionId) => {
    const currentQuiz = roomData.quiz || {
      questionIndex: 0,
      p1Answer: null,
      p2Answer: null,
      matches: 0
    };
    const updatedQuiz = {
      ...currentQuiz,
      [playerRole === 'p1' ? 'p1Answer' : 'p2Answer']: optionId
    };
    onUpdateRoom({ quiz: updatedQuiz });
  };

  const handleNextQuizQuestion = () => {
    const currentQuiz = roomData.quiz;
    if (!currentQuiz) return;
    const wasMatch = currentQuiz.p1Answer && currentQuiz.p1Answer === currentQuiz.p2Answer;
    onUpdateRoom({
      quiz: {
        questionIndex: currentQuiz.questionIndex + 1,
        p1Answer: null,
        p2Answer: null,
        matches: currentQuiz.matches + (wasMatch ? 1 : 0)
      }
    });
  };

  const handleStartQuiz = () => {
    onUpdateRoom({
      activeGame: 'quiz',
      quiz: {
        questionIndex: 0,
        p1Answer: null,
        p2Answer: null,
        matches: 0
      }
    });
  };

  // Tandem Race Handlers
  const handleStartRace = () => {
    onUpdateRoom({
      activeGame: 'race',
      race: {
        status: 'playing',
        p1Taps: 0,
        p2Taps: 0,
        goal: 50
      }
    });
  };

  const handleRaceTap = () => {
    const currentRace = roomData.race || { status: 'playing', p1Taps: 0, p2Taps: 0, goal: 50 };
    const field = playerRole === 'p1' ? 'p1Taps' : 'p2Taps';
    onUpdateRoom({
      race: {
        ...currentRace,
        [field]: (currentRace[field] || 0) + 1
      }
    });
  };

  return (
    <div className={`flex flex-col bg-white/95 backdrop-blur-md shadow-xl border border-rose-100 overflow-hidden ${
      isDemoPane ? 'h-full rounded-2xl' : 'min-h-[600px] w-full max-w-xl rounded-3xl'
    }`}>
      {/* TOP PRESENCE & ROOM BAR */}
      <div className="flex items-center justify-between border-b border-rose-100 bg-gradient-to-r from-rose-50/90 via-white to-indigo-50/90 px-4 py-3">
        <div className="flex items-center gap-2">
          {!isDemoPane && (
            <button
              onClick={onLeaveRoom}
              title="Leave Room"
              className="rounded-full p-1.5 text-slate-400 hover:bg-rose-100 hover:text-rose-600 transition"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Room
              </span>
              <span className="rounded-md bg-rose-100 px-2 py-0.5 font-mono text-xs font-black text-rose-600">
                {roomData.code}
              </span>
            </div>
          </div>
        </div>

        {/* Couple Presence Pills */}
        <div className="flex items-center gap-2">
          {/* Player 1 Pill */}
          <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border ${
            playerRole === 'p1' 
              ? 'border-rose-300 bg-rose-50 text-rose-700' 
              : 'border-slate-200 bg-white text-slate-600'
          }`}>
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="max-w-[75px] truncate">{roomData.p1?.name || 'Player 1'}</span>
          </div>

          <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500 animate-pulse" />

          {/* Player 2 Pill */}
          {roomData.p2 ? (
            <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold border ${
              playerRole === 'p2' 
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700' 
                : 'border-slate-200 bg-white text-slate-600'
            }`}>
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="max-w-[75px] truncate">{roomData.p2.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 rounded-full border border-dashed border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              <span>Waiting...</span>
            </div>
          )}
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col justify-between overflow-y-auto">
        {activeGame === 'lobby' && (
          <div className="p-4 sm:p-6 flex flex-col justify-between h-full space-y-5">
            {/* Invite Banner if Partner hasn't joined yet */}
            {!roomData.p2 ? (
              <div className="rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 p-5 text-white shadow-lg shadow-rose-200">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="rounded-full bg-white/20 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider">
                      Step 1: Invite Your Partner
                    </span>
                    <h3 className="mt-2 text-xl font-extrabold">
                      Share Room Code: {roomData.code}
                    </h3>
                    <p className="mt-1 text-xs text-rose-100">
                      Send this code or invite link so your partner can join your shared screen!
                    </p>
                  </div>
                  <Heart className="h-12 w-12 text-white/30 fill-white/20 shrink-0" />
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    onClick={handleCopyInvite}
                    className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-extrabold text-rose-600 shadow-sm transition hover:bg-rose-50 active:scale-95"
                  >
                    {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    {copied ? "Copied Invite Link!" : "Copy Invite Link & Code"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-emerald-900">
                      Both Connected! ({roomData.p1.name} & {roomData.p2.name})
                    </h4>
                    <p className="text-xs text-emerald-700">
                      Pick any mini-game below — it launches simultaneously on both devices!
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleCopyInvite}
                  title="Copy Room Link"
                  className="rounded-lg bg-white p-2 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                >
                  {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
                </button>
              </div>
            )}

            {/* Mini-Game Selection Cards */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-3">
                Choose a Synchronized Mini-Game
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {/* Game 1: Sync Quiz */}
                <button
                  onClick={handleStartQuiz}
                  className="group relative flex items-center justify-between rounded-2xl border-2 border-rose-100 bg-white p-4 text-left shadow-sm transition-all hover:border-rose-400 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 text-white shadow-md group-hover:scale-110 transition-transform">
                      <MessageCircleHeart className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-extrabold text-slate-800">Sync Compatibility Quiz</h5>
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-600">
                          5 Rounds
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Answer playful questions simultaneously and see if your minds match!
                      </p>
                    </div>
                  </div>
                  <Play className="h-5 w-5 text-rose-400 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
                </button>

                {/* Game 2: Tandem Heart Rush */}
                <button
                  onClick={handleStartRace}
                  className="group relative flex items-center justify-between rounded-2xl border-2 border-amber-100 bg-white p-4 text-left shadow-sm transition-all hover:border-amber-400 hover:shadow-md active:scale-[0.99]"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-md group-hover:scale-110 transition-transform">
                      <Zap className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h5 className="font-extrabold text-slate-800">Tandem Heart Rush</h5>
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                          Co-Op Tapper
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        Team up in real-time and tap together to fill the shared Love Meter!
                      </p>
                    </div>
                  </div>
                  <Play className="h-5 w-5 text-amber-400 group-hover:translate-x-1 transition-transform shrink-0 ml-2" />
                </button>
              </div>
            </div>
          </div>
        )}

        {activeGame === 'quiz' && (
          <SyncQuizGame
            roomData={roomData}
            playerRole={playerRole}
            onSelectAnswer={handleSelectQuizAnswer}
            onNextQuestion={handleNextQuizQuestion}
            onBackToHub={() => onUpdateRoom({ activeGame: 'lobby' })}
          />
        )}

        {activeGame === 'race' && (
          <TandemHeartRush
            roomData={roomData}
            playerRole={playerRole}
            onSendTap={handleRaceTap}
            onStartRace={handleStartRace}
            onBackToHub={() => onUpdateRoom({ activeGame: 'lobby' })}
          />
        )}
      </div>

      {/* BOTTOM LIVE EMOJI REACTION DOCK */}
      <div className="border-t border-rose-100 bg-rose-50/60 px-4 py-2.5 flex items-center justify-between">
        <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
          Send Live Vibe:
        </span>
        <div className="flex items-center justify-around w-full sm:w-auto sm:gap-2">
          {REACTION_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onTriggerReaction(emoji, me?.name || 'Partner')}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg shadow-sm border border-rose-100 transition hover:scale-125 hover:bg-rose-50 active:scale-90"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ==========================================
// MAIN APPLICATION COMPONENT
// ==========================================
export default function App() {
  // Firebase Auth State
  const [user, setUser] = useState(null);

  // App Mode: 'home' | 'live' | 'demo'
  const [mode, setMode] = useState('home');
  const [playerName, setPlayerName] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Live Multiplayer State
  const [roomCode, setRoomCode] = useState('');
  const [playerRole, setPlayerRole] = useState('p1'); // 'p1' or 'p2'
  const [liveRoomData, setLiveRoomData] = useState(null);

  // Split-Screen Demo State (In-memory instant sync for both P1 & P2)
  const [demoRoomData, setDemoRoomData] = useState({
    code: 'LOVE24',
    activeGame: 'lobby',
    p1: { name: 'Alex' },
    p2: { name: 'Sam' },
    quiz: { questionIndex: 0, p1Answer: null, p2Answer: null, matches: 0 },
    race: { status: 'waiting', p1Taps: 0, p2Taps: 0, goal: 50 },
    latestReaction: null
  });

  // Floating Emoji Reactions Queue
  const [floatingReactions, setFloatingReactions] = useState([]);
  const lastReactionIdRef = useRef(null);

  // 1. Initialize Firebase Authentication FIRST
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth initialization error:", err);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  // Check URL query param ?room=XXXXXX on mount
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlRoom = params.get('room');
      if (urlRoom) {
        setJoinCodeInput(urlRoom.toUpperCase());
      }
    } catch (e) {
      // Ignore URL parsing errors in sandboxed iframes
    }
  }, []);

  // Spawn visual floating emoji helper
  const spawnFloatingEmoji = (emoji, senderName) => {
    const id = `${Date.now()}-${Math.random()}`;
    const left = 15 + Math.floor(Math.random() * 70);
    setFloatingReactions((prev) => [...prev.slice(-12), { id, emoji, senderName, left }]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((item) => item.id !== id));
    }, 2400);
  };

  // 2. Real-time Firestore Listener for Live Room
  useEffect(() => {
    if (!user || mode !== 'live' || !roomCode) return;

    const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'couple_rooms', roomCode);
    const unsubscribe = onSnapshot(
      roomRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setLiveRoomData(data);

          // Trigger floating reaction if a new one arrived
          if (data.latestReaction && data.latestReaction.id !== lastReactionIdRef.current) {
            lastReactionIdRef.current = data.latestReaction.id;
            spawnFloatingEmoji(data.latestReaction.emoji, data.latestReaction.sender);
          }
        } else {
          setErrorMsg("Room was closed or doesn't exist.");
          setMode('home');
        }
      },
      (error) => {
        console.error("Firestore room sync error:", error);
        setErrorMsg("Connection issue syncing room.");
      }
    );

    return () => unsubscribe();
  }, [user, mode, roomCode]);

  // Create a Private Room
  const handleCreateRoom = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!user) {
      setErrorMsg("Connecting to server... please try again in a second.");
      return;
    }
    const cleanName = playerName.trim() || "Player 1";
    const newCode = generateRoomCode();
    setLoading(true);

    try {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'couple_rooms', newCode);
      const initialData = {
        code: newCode,
        createdAt: Date.now(),
        activeGame: 'lobby',
        p1: { uid: user.uid, name: cleanName },
        p2: null,
        quiz: { questionIndex: 0, p1Answer: null, p2Answer: null, matches: 0 },
        race: { status: 'waiting', p1Taps: 0, p2Taps: 0, goal: 50 },
        latestReaction: null
      };

      await setDoc(roomRef, initialData);
      setRoomCode(newCode);
      setPlayerRole('p1');
      setLiveRoomData(initialData);
      setMode('live');
    } catch (err) {
      console.error("Create room error:", err);
      setErrorMsg("Could not create room. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Join an Existing Room
  const handleJoinRoom = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!user) {
      setErrorMsg("Connecting to server... please try again.");
      return;
    }
    const code = joinCodeInput.trim().toUpperCase();
    if (code.length < 4) {
      setErrorMsg("Please enter a valid room code.");
      return;
    }
    const cleanName = playerName.trim() || "Player 2";
    setLoading(true);

    try {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'couple_rooms', code);
      const snap = await getDoc(roomRef);

      if (!snap.exists()) {
        setErrorMsg(`Room "${code}" not found. Double-check the code!`);
        setLoading(false);
        return;
      }

      const existing = snap.data();
      // If user is already p1, rejoin as p1; otherwise join as p2
      if (existing.p1?.uid === user.uid) {
        setPlayerRole('p1');
      } else {
        await updateDoc(roomRef, {
          p2: { uid: user.uid, name: cleanName }
        });
        setPlayerRole('p2');
      }

      setRoomCode(code);
      setMode('live');
    } catch (err) {
      console.error("Join room error:", err);
      setErrorMsg("Failed to join room. Check the code and try again.");
    } finally {
      setLoading(false);
    }
  };

  // Update Live Room State in Firestore
  const handleUpdateLiveRoom = async (partialUpdate) => {
    if (!roomCode) return;
    try {
      const roomRef = doc(db, 'artifacts', appId, 'public', 'data', 'couple_rooms', roomCode);
      await updateDoc(roomRef, partialUpdate);
    } catch (err) {
      console.error("Update room error:", err);
    }
  };

  // Send Live Emoji Reaction
  const handleLiveReaction = async (emoji, senderName) => {
    const reactionObj = {
      id: `${Date.now()}-${Math.random()}`,
      emoji,
      sender: senderName
    };
    spawnFloatingEmoji(emoji, senderName);
    lastReactionIdRef.current = reactionObj.id;
    await handleUpdateLiveRoom({ latestReaction: reactionObj });
  };

  // Demo Mode Update Handlers
  const handleUpdateDemoRoom = (partialUpdate) => {
    setDemoRoomData((prev) => ({
      ...prev,
      ...partialUpdate
    }));
  };

  const handleDemoReaction = (emoji, senderName) => {
    spawnFloatingEmoji(emoji, senderName);
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-rose-50 via-pink-50 to-amber-50 text-slate-800 font-sans selection:bg-rose-200">
      {/* Custom Keyframe Animations */}
      <style>{`
        @keyframes floatUp {
          0% { transform: translateY(0) scale(0.7); opacity: 0; }
          15% { opacity: 1; transform: translateY(-20px) scale(1.1); }
          100% { transform: translateY(-320px) scale(1.3); opacity: 0; }
        }
        .animate-float-up {
          animation-name: floatUp;
          animation-timing-function: ease-out;
          animation-fill-mode: forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 0.35s ease-out forwards;
        }
      `}</style>

      {/* Global Floating Reactions Overlay */}
      <FloatingReactions reactions={floatingReactions} />

      {/* Top Navigation Brand Header */}
      <header className="w-full px-4 py-4 sm:px-8 flex items-center justify-between max-w-7xl mx-auto">
        <button 
          onClick={() => setMode('home')}
          className="flex items-center gap-2.5 group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200 group-hover:rotate-6 transition-transform">
            <Heart className="h-5 w-5 fill-white" />
          </div>
          <div className="text-left">
            <span className="text-lg font-black tracking-tight text-slate-800">
              Duo<span className="text-rose-500">Sync</span>
            </span>
            <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-400 -mt-1">
              Couples Playroom
            </span>
          </div>
        </button>

        {/* Quick Switch to Split-Screen Demo Mode */}
        {mode !== 'demo' ? (
          <button
            onClick={() => setMode('demo')}
            className="flex items-center gap-2 rounded-full border border-rose-200 bg-white/80 px-3.5 py-2 text-xs font-bold text-rose-600 shadow-sm backdrop-blur transition hover:bg-rose-50 active:scale-95"
          >
            <SplitSquareHorizontal className="h-4 w-4" />
            <span>Split-Screen Demo</span>
          </button>
        ) : (
          <button
            onClick={() => setMode('home')}
            className="flex items-center gap-2 rounded-full bg-slate-800 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-slate-700 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Exit Demo</span>
          </button>
        )}
      </header>

      {/* ==========================================
          VIEW 1: HOME LOBBY (CREATE OR JOIN)
         ========================================== */}
      {mode === 'home' && (
        <main className="mx-auto max-w-4xl px-4 pt-4 pb-12 sm:pt-8 animate-fade-in">
          {/* Hero Section */}
          <div className="text-center max-w-xl mx-auto mb-8">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white px-3.5 py-1 text-xs font-extrabold text-rose-500 shadow-sm border border-rose-100 mb-3">
              <Sparkles className="h-3.5 w-3.5" /> Real-Time Two-Player Experience
            </div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-900 leading-tight">
              Play, laugh & sync <span className="text-transparent bg-clip-text bg-gradient-to-r from-rose-500 to-amber-500">together.</span>
            </h1>
            <p className="mt-3 text-sm sm:text-base text-slate-600">
              Create a private room in one click, share your link, and play synchronized couple mini-games in real time—whether you're on the same couch or miles apart.
            </p>
          </div>

          {/* Error Alert Banner */}
          {errorMsg && (
            <div className="mx-auto mb-6 max-w-md rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-xs font-bold text-rose-700">
              {errorMsg}
            </div>
          )}

          {/* Nickname Input Card */}
          <div className="mx-auto max-w-md mb-6 rounded-3xl bg-white/90 p-5 shadow-lg shadow-rose-100/60 border border-rose-100">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">
              Your Display Name
            </label>
            <input
              type="text"
              maxLength={18}
              placeholder="e.g. Alex, Babe, Honey..."
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              className="w-full rounded-xl border-2 border-slate-100 bg-slate-50/70 px-4 py-3 text-sm font-bold text-slate-800 placeholder:text-slate-400 focus:border-rose-400 focus:bg-white focus:outline-none transition"
            />
          </div>

          {/* Create vs Join Two-Column Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-3xl mx-auto">
            {/* Create Room Card */}
            <div className="flex flex-col justify-between rounded-3xl bg-white p-6 shadow-xl shadow-rose-100/60 border border-rose-100">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-100 text-rose-600 mb-4">
                  <Heart className="h-6 w-6 fill-rose-500" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-800">
                  Create Private Room
                </h2>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                  Start a brand new room and get an instant 6-character invite code and shareable link for your partner.
                </p>
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={loading}
                className="mt-6 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-rose-200 transition hover:brightness-110 active:scale-95 disabled:opacity-50"
              >
                <Sparkles className="h-4 w-4" />
                {loading ? "Creating Room..." : "Create Couple Room"}
              </button>
            </div>

            {/* Join Room Card */}
            <form 
              onSubmit={handleJoinRoom}
              className="flex flex-col justify-between rounded-3xl bg-white p-6 shadow-xl shadow-indigo-100/50 border border-indigo-100"
            >
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 mb-4">
                  <Users className="h-6 w-6" />
                </div>
                <h2 className="text-xl font-extrabold text-slate-800">
                  Join Partner's Room
                </h2>
                <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                  Already have a code from your partner? Enter it below to connect screens immediately.
                </p>

                <input
                  type="text"
                  maxLength={6}
                  placeholder="ENTER 6-DIGIT CODE"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="mt-4 w-full rounded-xl border-2 border-indigo-100 bg-indigo-50/40 px-4 py-3 text-center font-mono text-base font-black tracking-widest text-indigo-700 placeholder:font-sans placeholder:text-xs placeholder:font-bold placeholder:tracking-normal placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:outline-none uppercase"
                />
              </div>

              <button
                type="submit"
                disabled={loading || !joinCodeInput.trim()}
                className="mt-4 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-indigo-200 transition hover:brightness-110 active:scale-95 disabled:opacity-40"
              >
                <Play className="h-4 w-4 fill-white" />
                Join Room Instantly
              </button>
            </form>
          </div>

          {/* Try Split-Screen Preview Callout */}
          <div className="mt-8 text-center">
            <button
              onClick={() => setMode('demo')}
              className="inline-flex items-center gap-2 rounded-2xl bg-white/80 px-5 py-3 text-xs font-bold text-slate-600 border border-slate-200/80 shadow-sm hover:border-rose-300 hover:text-rose-600 transition"
            >
              <SplitSquareHorizontal className="h-4 w-4 text-rose-500" />
              Playing solo right now? Try the <span className="underline decoration-rose-400 font-extrabold">Interactive Split-Screen Demo</span>
            </button>
          </div>
        </main>
      )}

      {/* ==========================================
          VIEW 2: LIVE MULTIPLAYER ROOM
         ========================================== */}
      {mode === 'live' && liveRoomData && (
        <main className="mx-auto flex flex-col items-center justify-center px-4 py-4 sm:py-6 animate-fade-in">
          <CoupleRoomScreen
            roomData={liveRoomData}
            playerRole={playerRole}
            onUpdateRoom={handleUpdateLiveRoom}
            onTriggerReaction={handleLiveReaction}
            onLeaveRoom={() => {
              setMode('home');
              setRoomCode('');
              setLiveRoomData(null);
            }}
          />
        </main>
      )}

      {/* ==========================================
          VIEW 3: SPLIT-SCREEN DUAL DEVICE DEMO MODE
         ========================================== */}
      {mode === 'demo' && (
        <main className="mx-auto max-w-7xl px-3 sm:px-6 pb-8 animate-fade-in">
          <div className="mb-4 rounded-2xl bg-white/90 border border-rose-200 px-4 py-3 flex flex-col sm:flex-row items-center justify-between gap-2 shadow-sm">
            <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-slate-700">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-rose-500 text-white">
                <SplitSquareHorizontal className="h-3.5 w-3.5" />
              </span>
              <span>
                <strong>Split-Screen Preview Mode:</strong> Interact with both phones side-by-side to experience real-time couple sync!
              </span>
            </div>
            <span className="text-[11px] font-bold text-rose-500 bg-rose-50 px-2.5 py-1 rounded-full">
              Simulated Low-Latency Sync
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
            {/* Left Device: Player 1 */}
            <div className="flex flex-col">
              <div className="mb-2 flex items-center justify-between px-2">
                <span className="text-xs font-black uppercase tracking-wider text-rose-600 flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-rose-500" /> Partner 1 Screen (Alex)
                </span>
                <span className="text-[11px] font-semibold text-slate-400">Device A</span>
              </div>
              <div className="h-[580px]">
                <CoupleRoomScreen
                  roomData={demoRoomData}
                  playerRole="p1"
                  onUpdateRoom={handleUpdateDemoRoom}
                  onTriggerReaction={handleDemoReaction}
                  isDemoPane={true}
                />
              </div>
            </div>

            {/* Right Device: Player 2 */}
            <div className="flex flex-col">
              <div className="mb-2 flex items-center justify-between px-2">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 fill-indigo-500" /> Partner 2 Screen (Sam)
                </span>
                <span className="text-[11px] font-semibold text-slate-400">Device B</span>
              </div>
              <div className="h-[580px]">
                <CoupleRoomScreen
                  roomData={demoRoomData}
                  playerRole="p2"
                  onUpdateRoom={handleUpdateDemoRoom}
                  onTriggerReaction={handleDemoReaction}
                  isDemoPane={true}
                />
              </div>
            </div>
          </div>
        </main>
      )}
    </div>
  );
}