import { useEffect, useRef, useState } from 'react';
import { colors } from '../../theme/colors';
import * as signalR from '@microsoft/signalr';
import { useApp } from '../../../Context/AppContext.jsx';

type Screen3Props = {
  isActive: boolean;
   onStartOver: () => void;
};

const STEP_ORDER = ["Transcoding", "Transcribing", "Extracting", "Completed"];

const MIN_STEP_DISPLAY_MS = 1000; // minimum time each stage stays visible

const AVAILABLE_LANGUAGES = [
  { code: 'ar', name: 'العربية (Arabic)' },
  { code: 'zh', name: '中文 (Chinese)' },
  { code: 'de', name: 'Deutsch (German)' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Español (Spanish)' },
  { code: 'fr', name: 'Français (French)' },
  { code: 'it', name: 'Italiano (Italian)' },
  { code: 'ja', name: '日本語 (Japanese)' },
  { code: 'pt', name: 'Português (Portuguese)' },
  { code: 'tr', name: 'Türkçe (Turkish)' }
];

type Summary = {
  executiveSummary: string;
  actionItems: string[];
  whatsappReplies: string[];
};

export default function Screen3({ isActive, onStartOver }: Screen3Props) {
  const [currentstep, setCurrentStep] = useState<string>("Transcoding");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [currentlang, setCurrentLang] = useState("English");
  const [progress, setProgress] = useState(0);
  const [showtag, setShowTag] = useState(false);
  const [copy, setCopy] = useState(false);
  const [lang, setLang] = useState(null);

  const [targetLang, setTargetLang] = useState('en');
  const [isLangOpen, setIsLangOpen] = useState(false);
  const langDropdownRef = useRef<HTMLDivElement>(null);

  const [index, setIndex] = useState(null);
  const targetStepRef = useRef<string>("Transcoding");
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const isAnimatingRef = useRef(false);
  const { audioId, setAudioId } = useApp();

  const [istranslating, setIsTranslating] = useState(false);

  const advanceTowardTarget = () => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    const step = () => {
      setCurrentStep((current) => {
        const currentIdx = STEP_ORDER.indexOf(current);
        const targetIdx = STEP_ORDER.indexOf(targetStepRef.current);

        if (currentIdx >= targetIdx) {
          isAnimatingRef.current = false;
          return current;
        }

        const next = STEP_ORDER[currentIdx + 1];
        setTimeout(step, MIN_STEP_DISPLAY_MS);
        return next;
      });
    };

    setTimeout(step, MIN_STEP_DISPLAY_MS);
  };

  // 1. Live SignalR Hub Connection
  useEffect(() => {
    if (!isActive || !audioId) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl('/api/pipelineHub')
      .withAutomaticReconnect()
      .build();

    connectionRef.current = connection;

    connection.on('ReceiveStatus', (id: string, status: string) => {
      if (id === audioId) {
        console.log(`Received status for audioId ${audioId}: ${status}`);
        targetStepRef.current = status;
        advanceTowardTarget();
      }
    });

    connection
      .start()
      .then(async () => {
        console.log('SignalR connected');
        try {
          const status = await connection.invoke('GetCurrentStatus', audioId);
          if (status) {
            targetStepRef.current = status;
            advanceTowardTarget();
          }
        } catch (err) {
          console.error('Failed to sync:', err);
        }
      })
      .catch((err) => console.error('SignalR connection error:', err));

    connection.onreconnected(async () => {
      try {
        const status = await connection.invoke('GetCurrentStatus', audioId);
        if (status) {
          targetStepRef.current = status;
          advanceTowardTarget();
        }
      } catch (err) {
        console.error('Failed to re-sync status:', err);
      }
    });

    return () => {
      connection.off('ReceiveStatus');
      connection.stop();
    };
  }, [isActive, audioId]);

  // --- Fluid progress bar for the currently displayed step ---
  useEffect(() => {
    if (!isActive) return;

    if (currentstep === "Completed") {
      setProgress(100);
      return;
    }

    setProgress(0);
    const fluidProgressBar = setInterval(() => {
      setProgress((prev) => (prev >= 95 ? 95 : prev + Math.random() * 10));
    }, 700);

    return () => clearInterval(fluidProgressBar);
  }, [isActive, currentstep]);

  useEffect(() => {
    if (currentstep !== "Completed" || !connectionRef.current || !audioId) return;

    const fetchSummary = async () => {
      try {
        const raw = await connectionRef.current!.invoke('GetSummary', audioId);
        if (raw) {
          try {
            setSummary(JSON.parse(raw));
          } catch (parseErr) {
            console.error('Summary was not valid JSON:', raw, parseErr);
          }
        }
      } catch (err) {
        console.error('Failed to fetch summary:', err);
      }
    };
    fetchSummary();
  }, [currentstep, audioId]);

  useEffect(() => {
    if (currentstep !== "Completed" || !connectionRef.current || !audioId) return;

    const fetchlang = async () => {
      try {
        const raw = await connectionRef.current!.invoke('GetDetectedLanguage', audioId);
        if (raw) {
          try {
            setLang(raw);
          } catch (parseErr) {
            console.error('Language was not valid JSON:', raw, parseErr);
          }
        }
      } catch (err) {
        console.error('Failed to fetch language:', err);
      }
    };

    fetchlang();
  }, [currentstep, audioId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setIsLangOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleStartOver = () => {
  setCurrentStep("Transcoding");
  targetStepRef.current = "Transcoding";
  setSummary(null);
  setLang(null);
  setProgress(0);
  setIsTranslating(false);
  isAnimatingRef.current = false;
  
  setAudioId(null);
  onStartOver();
};

useEffect(() => {
  if (isActive && audioId) {
    setCurrentStep("Transcoding");
    targetStepRef.current = "Transcoding";
    setSummary(null);
    setLang(null);
    setProgress(0);
    setIsTranslating(false);
    isAnimatingRef.current = false;
  }
}, [audioId, isActive]);

  const handlechanglang = async (targetlang: string) => {
    console.log('Changing language to:', targetlang);

    setIsTranslating(true);

    if (targetlang === currentlang) {
      setIsTranslating(false);
      return;
    }

    try {
      console.log('inside try', targetlang);

      const req = await fetch(`/api/Audio/change-language`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ audioId: audioId, targetlang: targetlang, currentlang: currentlang })
      });

      const res = await req.json();
      console.log('Response from change-language:', res.data);
      if (res.success && res.data) {
        setSummary(res.data);
        setCurrentLang(targetlang);
      }
    } catch (err) {
      console.error('Failed to change language: ', err);
    } finally {
      setIsTranslating(false);
    }
  };

  const selectedLangName = AVAILABLE_LANGUAGES.find((l) => l.code === targetLang)?.name ?? 'Select language';

  const handlecopy = async (reply: string, i: any) => {
    try {
      await navigator.clipboard.writeText(reply);
      setCopy(true);
      setShowTag(true);
      setIndex(i);
      setTimeout(() => setCopy(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const getStepState = (stepKey: string) => {
    const currentIndex = STEP_ORDER.indexOf(currentstep);
    const stepIndex = STEP_ORDER.indexOf(stepKey);
    if (stepIndex < currentIndex || currentstep === "Completed") return "completed";
    if (stepIndex === currentIndex) return "active";
    return "pending";
  };

  const currentIdx = STEP_ORDER.indexOf(currentstep);

  const isCompleted = currentstep === "Completed";

  const isTranscoding = currentstep === "Transcoding";
  const transcodingDone = currentIdx > STEP_ORDER.indexOf("Transcoding");

  const isTranscribing = currentstep === "Transcribing";
  const transcribingDone = currentIdx > STEP_ORDER.indexOf("Transcribing");

  const isExtracting = currentstep === "Extracting";
  const extractingDone = currentIdx > STEP_ORDER.indexOf("Extracting");

//   

return (
  <div
    className={`absolute inset-0 transition-all duration-700 ease-in-out ${
      isActive ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0 pointer-events-none'
    }`}
  >
    <div className="mx-auto flex h-full w-full max-w-[1600px] items-center justify-center px-4 py-6">
      <div className="grid h-full w-full grid-cols-1 gap-8 md:grid-cols-2">

        {/* Left Panel - Live Pipeline */}
        <div
          className="relative flex h-full flex-col overflow-hidden rounded-[2rem] border p-8 shadow-[0_30px_80px_rgba(0,0,0,0.28)]"
          style={{
            borderColor: 'rgba(255,255,255,0.1)',
            backgroundColor: '#0e1116',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at center, ${colors.button.primaryText}33, transparent 48%)`,
            }}
          />

          <div className="relative z-10 flex h-full flex-col">
            {/* Header — pinned, never scrolls */}
            <div className="mb-8 flex shrink-0 items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: `${colors.button.primaryText}20`,
                    color: colors.button.primaryText,
                  }}
                >
                  <svg
                    className={`h-4 w-4 ${!isCompleted ? 'animate-spin' : ''}`}
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="2" />
                    <circle cx="12" cy="6" r="2" opacity="0.4" />
                    <circle cx="12" cy="18" r="2" opacity="0.4" />
                  </svg>
                </div>
                <span
                  className="truncate text-xs font-semibold uppercase tracking-[0.25em]"
                  style={{ color: colors.button.primaryText }}
                >
                  {isCompleted ? 'Analysis Complete' : 'Live Pipeline'}
                </span>
              </div>

              {isCompleted && (
                <button
                  onClick={handleStartOver}
                  className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors hover:bg-white/10"
                  style={{
                    backgroundColor: `${colors.button.primaryText}18`,
                    color: colors.button.primaryText,
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 5v14M5 12l7-7 7 7" />
                  </svg>
                  <span className="hidden sm:inline">New recording</span>
                </button>
              )}
            </div>

            {/* Title — pinned */}
            <h2 className="mb-10 shrink-0 text-2xl font-bold leading-tight" style={{ color: 'rgba(255,255,255,0.95)' }}>
              {isCompleted ? 'Processing Done!' : 'Making sense of your audio...'}
            </h2>

            {/* Steps — scrolls internally if it ever overflows */}
            <div className="flex-1 space-y-4 overflow-y-auto pr-1">

              {/* ================= STEP 1: TRANSCODING AUDIO ================= */}
              {isTranscoding ? (
                <div
                  className="scale-[1.01] rounded-[1rem] border p-4 transition-all duration-500"
                  style={{
                    borderColor: `${colors.button.primaryText}60`,
                    backgroundColor: `${colors.button.primaryText}08`,
                  }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border"
                        style={{
                          borderColor: colors.button.primaryText,
                          color: colors.button.primaryText,
                        }}
                      >
                        <span className="text-xs font-semibold">01</span>
                      </div>
                      <div className="font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                        Transcoding Audio
                      </div>
                    </div>
                    <span
                      className="animate-pulse text-xs font-semibold uppercase tracking-[0.15em]"
                      style={{ color: colors.button.primaryText }}
                    >
                      LIVE
                    </span>
                  </div>
                  <div className="mb-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Optimizing bitrate (16kHz Mono)...
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: colors.button.primaryText,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className={`flex mt-2 items-start gap-4 transition-all duration-500 ${!transcodingDone ? 'opacity-50' : ''}`}>
                  <div
                    className="mt-1 mb-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: transcodingDone ? colors.button.primaryText : 'transparent',
                      border: !transcodingDone ? '1px solid rgba(255,255,255,0.2)' : 'none',
                    }}
                  >
                    {transcodingDone ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>01</span>
                    )}
                  </div>
                  <div className="flex-1 ">
                    <div className="font-semibold" style={{ color: transcodingDone ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)' }}>
                      Transcoding Audio
                    </div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {transcodingDone ? 'Audio profile optimized.' : 'Optimizing bitrate (16kHz Mono)...'}
                    </div>
                  </div>
                </div>
              )}

              {/* ================= STEP 2: TRANSCRIBING ================= */}
              {isTranscribing ? (
                <div
                  className="scale-[1.01] rounded-[1rem] border p-4 transition-all duration-500"
                  style={{
                    borderColor: `${colors.button.primaryText}60`,
                    backgroundColor: `${colors.button.primaryText}08`,
                  }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border"
                        style={{
                          borderColor: colors.button.primaryText,
                          color: colors.button.primaryText,
                        }}
                      >
                        <span className="text-xs font-semibold">02</span>
                      </div>
                      <div className="font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                        Transcribing Audio
                      </div>
                    </div>
                    <span
                      className="animate-pulse text-xs font-semibold uppercase tracking-[0.15em]"
                      style={{ color: colors.button.primaryText }}
                    >
                      LIVE
                    </span>
                  </div>
                  <div className="mb-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Generating text speech timestamps...
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: colors.button.primaryText,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className={`flex items-start gap-4 transition-all duration-500 ${!transcribingDone ? 'opacity-50' : ''}`}>
                  <div
                    className="mt-1 mb-3 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: transcribingDone ? colors.button.primaryText : 'transparent',
                      border: !transcribingDone ? '1px solid rgba(255,255,255,0.2)' : 'none',
                    }}
                  >
                    {transcribingDone ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>02</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold" style={{ color: transcribingDone ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)' }}>
                      Transcribing Audio
                    </div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {transcribingDone ? 'Transcription complete.' : 'Waiting for transcoding...'}
                    </div>
                  </div>
                </div>
              )}

              {/* ================= STEP 3: TRANSLATING & EXTRACTING ================= */}
              {isExtracting ? (
                <div
                  className="scale-[1.01] rounded-[1rem] border p-4 transition-all duration-500"
                  style={{
                    borderColor: `${colors.button.primaryText}60`,
                    backgroundColor: `${colors.button.primaryText}08`,
                  }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border"
                        style={{
                          borderColor: colors.button.primaryText,
                          color: colors.button.primaryText,
                        }}
                      >
                        <span className="text-xs font-semibold">03</span>
                      </div>
                      <div className="font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                        Translating & Extracting
                      </div>
                    </div>
                    <span
                      className="animate-pulse text-xs font-semibold uppercase tracking-[0.15em]"
                      style={{ color: colors.button.primaryText }}
                    >
                      LIVE
                    </span>
                  </div>
                  <div className="mb-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Extracting key entities and metadata...
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500 ease-out"
                      style={{
                        width: `${progress}%`,
                        backgroundColor: colors.button.primaryText,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <div className={`flex items-start gap-4 transition-all duration-500 ${!extractingDone ? 'opacity-50' : ''}`}>
                  <div
                    className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                    style={{
                      backgroundColor: extractingDone ? colors.button.primaryText : 'transparent',
                      border: !extractingDone ? '1px solid rgba(255,255,255,0.2)' : 'none',
                    }}
                  >
                    {extractingDone ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : (
                      <span className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.4)' }}>03</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold" style={{ color: extractingDone ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.6)' }}>
                      Translating & Extracting
                    </div>
                    <div className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {extractingDone ? 'Insights extracted successfully.' : 'Waiting for transcription...'}
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Right Panel - Summary / Waveform */}
        <div
          className="relative flex h-full flex-col overflow-hidden rounded-[2rem] border p-8 shadow-[0_30px_80px_rgba(0,0,0,0.28)]"
          style={{
            borderColor: 'rgba(255,255,255,0.1)',
            backgroundColor: '#0e1116',
          }}
        >
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at center, ${colors.button.primaryText}33, transparent 48%)`,
            }}
          />

          {istranslating && summary && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 rounded-[2rem] bg-slate-950/20 backdrop-blur-xs">
              <div
                className="h-8 w-8 animate-spin rounded-full border-4 border-t-transparent"
                style={{ borderColor: `${colors.button.primaryText}20`, borderTopColor: colors.button.primaryText }}
              />
              <span
                className="animate-pulse text-[10px] font-bold uppercase tracking-[0.25em]"
                style={{ color: colors.button.primaryText }}
              >
                Translating...
              </span>
            </div>
          )}

          {!summary ? (
            <div className={`relative z-10 flex h-full flex-col items-center justify-between ${istranslating ? 'pointer-events-none' : ''}`}>
              <div className="flex items-center gap-3 self-start">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${colors.button.primaryText}20`, color: colors.button.primaryText }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8z" />
                  </svg>
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: colors.button.primaryText }}>
                  Signal Detected
                </span>
              </div>

              <div className="relative flex items-center justify-center">
                {[1, 2, 3].map((ring) => (
                  <div
                    key={ring}
                    className="absolute rounded-full animate-ping"
                    style={{
                      width: `${120 + ring * 60}px`,
                      height: `${120 + ring * 60}px`,
                      border: `1px solid ${colors.button.primaryText}40`,
                      animationDuration: `${2 + ring * 0.5}s`,
                      animationDelay: `${ring * 0.3}s`,
                    }}
                  />
                ))}
                <div className="relative flex items-center justify-center gap-1.5">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-[3px] rounded-full"
                      style={{
                        backgroundColor: colors.button.primaryText,
                        height: '24px',
                        animation: `waveform-bar 900ms ease-in-out infinite`,
                        animationDelay: `${i * 60}ms`,
                        opacity: 0.8,
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="text-center">
                <div className="text-xs font-semibold uppercase tracking-[0.25em]" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Extracting signal from noise
                </div>
              </div>

              <style>{`
                @keyframes waveform-bar {
                  0%, 100% { height: 10px; }
                  50% { height: 48px; }
                }
              `}</style>
            </div>
          ) : (
            <div className={`relative z-10 flex h-full flex-col ${istranslating ? 'pointer-events-none' : ''}`}>
              {/* Header row — pinned, shrink-0 so it never scrolls out of view */}
              <div className="mb-5 flex shrink-0 items-center justify-between gap-2">
                <span
                  className="min-w-0 truncate text-xs font-semibold uppercase tracking-[0.25em]"
                  style={{ color: colors.button.primaryText }}
                >
                  Analysis Results
                </span>

                {lang && (
                  <div className="relative shrink-0" ref={langDropdownRef}>
                    <button
                      onClick={() => setIsLangOpen((prev) => !prev)}
                      className="flex max-w-[240px] items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium transition-colors hover:bg-white/10"
                      style={{
                        backgroundColor: `${colors.button.primaryText}18`,
                        color: colors.button.primaryText,
                      }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                        <circle cx="12" cy="12" r="10" />
                        <line x1="2" y1="12" x2="22" y2="12" />
                        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      </svg>
                      <span className="">{lang} → {selectedLangName.split(' (')[0]}</span>
                      <svg
                        width="11" height="11" viewBox="0 0 24 24" fill="none"
                        className={`shrink-0 transition-transform duration-200 ${isLangOpen ? 'rotate-180' : ''}`}
                      >
                        <path d="M6 9L12 15L18 9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>

                    {isLangOpen && (
                      <div
                        className="absolute right-0 z-20 mt-2 max-h-56 w-40 overflow-y-auto rounded-[0.9rem] border shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                        style={{ borderColor: 'rgba(255,255,255,0.1)', backgroundColor: '#14181f' }}
                      >
                        {AVAILABLE_LANGUAGES.map((langOption) => (
                          <button
                            key={langOption.code}
                            onClick={() => {
                              handlechanglang(langOption.code);
                              setTargetLang(langOption.code);
                              setIsLangOpen(false);
                            }}
                            className="flex w-full items-center justify-between px-3.5 py-2 text-left text-xs font-medium transition-colors hover:bg-white/5"
                            style={{ color: langOption.code === targetLang ? colors.button.primaryText : 'rgba(255,255,255,0.75)' }}
                          >
                            <span className="truncate">{langOption.name}</span>
                            {langOption.code === targetLang && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="ml-2 shrink-0">
                                <polyline points="20 6 9 17 4 12" stroke={colors.button.primaryText} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Content — this is what actually scrolls now, header stays put */}
              <div className="flex-1 space-y-3 overflow-y-auto pr-2">
                <div className="rounded-[1rem] p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                  <div className="mb-2 flex items-center gap-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: colors.button.primaryText }}>
                      Summary
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.85)' }}>
                    {summary.executiveSummary}
                  </p>
                </div>

                {summary.actionItems?.length > 0 && (
                  <div className="rounded-[1rem] p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    <div className="mb-2.5 flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: colors.button.primaryText }}>
                        Action Items
                      </span>
                    </div>
                    <ul className="space-y-2">
                      {summary.actionItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>
                          <span
                            className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 rounded-[4px] border"
                            style={{ borderColor: `${colors.button.primaryText}70` }}
                          />
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.whatsappReplies?.length > 0 && (
                  <div className="rounded-[1rem] p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                    <div className="mb-2.5 flex items-center gap-2">
                      <span className="text-[11px] font-semibold uppercase tracking-[0.15em]" style={{ color: colors.button.primaryText }}>
                        Quick Replies
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {summary.whatsappReplies.map((reply, loopid) => {
                        const isCopied = index === loopid;
                        return (
                          <button
                            key={loopid}
                            onClick={() => handlecopy(reply, loopid)}
                            className="flex max-w-full items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium transition-transform hover:scale-[1.02] active:scale-[0.98]"
                            style={{
                              backgroundColor: colors.button.primaryText,
                              color: '#14180a',
                            }}
                          >
                            <span className="truncate">{reply}</span>
                            {!isCopied ? (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0">
                                <path
                                  d="M8 8V5.2C8 4.0799 8 3.51984 8.21799 3.09202C8.40973 2.71569 8.71569 2.40973 9.09202 2.21799C9.51984 2 10.0799 2 11.2 2H18.8C19.9201 2 20.4802 2 20.908 2.21799C21.2843 2.40973 21.5903 2.71569 21.782 3.09202C22 3.51984 22 4.0799 22 5.2V12.8C22 13.9201 22 14.4802 21.782 14.908C21.5903 15.2843 21.2843 15.5903 20.908 15.782C20.4802 16 19.9201 16 18.8 16H16M5.2 22H12.8C13.9201 22 14.4802 22 14.908 21.782C15.2843 21.5903 15.5903 21.2843 15.782 20.908C16 20.4802 16 19.9201 16 18.8V11.2C16 10.0799 16 9.51984 15.782 9.09202C15.5903 8.71569 15.2843 8.40973 14.908 8.21799C14.4802 8 13.9201 8 12.8 8H5.2C4.0799 8 3.51984 8 3.09202 8.21799C2.71569 8.40973 2.40973 8.71569 2.21799 9.09202C2 9.51984 2 10.0799 2 11.2V18.8C2 19.9201 2 20.4802 2.21799 20.908C2.40973 21.2843 2.71569 21.5903 3.09202 21.782C3.51984 22 4.07989 22 5.2 22Z"
                                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                                />
                              </svg>
                            ) : (
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  </div>
);
}