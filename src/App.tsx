import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
// @ts-ignore
import generationImg from "./assets/images/generation_banner_1779586355502.png";
// @ts-ignore
import proctorImg from "./assets/images/proctor_secure_1779586406824.png";
// @ts-ignore
import libraryImg from "./assets/images/library_banner_1779586384680.png";
// @ts-ignore
import resultsImg from "./assets/images/results_banner_1779586429996.png";
// @ts-ignore
import bubbleBgImg from "./assets/images/bubble_sheet_bg_1779618142534.png";
import { 
  FileText, 
  Settings2, 
  Bookmark, 
  History, 
  Link2, 
  Play, 
  Copy, 
  Save, 
  Trash2, 
  Search, 
  Database, 
  ShieldAlert, 
  ShieldCheck, 
  Shield,
  Calculator, 
  Clock, 
  CheckCircle2, 
  X, 
  FileUp, 
  AlertTriangle, 
  Lock, 
  Unlock,
  Sun,
  Moon,
  LogOut,
  ChevronLeft,
  BookOpen,
  Info,
  ExternalLink,
  User,
  RefreshCw
} from "lucide-react";
import { MCQQuestion, TestConfig, StudentResult, TestDifficulty } from "./types";
import FloatingCalculator from "./components/FloatingCalculator";
import ResultsLedger from "./components/ResultsLedger";
import InteractiveDiagram from "./components/InteractiveDiagram";
import { ILLUSTRATED_STEM_CHALLENGE } from "./prebuiltTests";
import { audio } from "./utils/audio";

// Helper to encode UTF-8 to safe Base64
const safeBtoa = (str: string): string => {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
    return String.fromCharCode(parseInt(p1, 16));
  }));
};

// Helper to decode safe Base64 to UTF-8
const safeAtob = (str: string): string => {
  try {
    // Sanitization: strip whitespaces and convert space to '+' (often converted during URL copying)
    let cleaned = str.trim().replace(/\s/g, "");
    cleaned = cleaned.replace(/ /g, "+");
    
    // Auto-pad Base64 if needed
    const padNeeded = (4 - (cleaned.length % 4)) % 4;
    if (padNeeded > 0) {
      cleaned += "=".repeat(padNeeded);
    }

    try {
      const decodedCharBytes = atob(cleaned);
      return decodeURIComponent(decodedCharBytes.split('').map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
    } catch (innerErr) {
      // Fallback for standard/simple ASCII Base64 encoded links
      return atob(cleaned);
    }
  } catch (e: any) {
    throw new Error("Base64 decoding failed: " + e.message);
  }
};

// Helper to shuffle exam questions and options while preserving correct coordinates
const shuffleExam = (originalExam: TestConfig): TestConfig => {
  const examCopy = { ...originalExam };
  if (!examCopy.questions || !Array.isArray(examCopy.questions)) {
    return examCopy;
  }

  // Shuffle options of each question and update the correctIndex map
  const shuffledQuestions = examCopy.questions.map(q => {
    const correctOptionText = q.options[q.correctIndex] || "";
    const shuffledOptions = [...q.options];
    
    // Fisher-Yates shuffle
    for (let i = shuffledOptions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = shuffledOptions[i];
      shuffledOptions[i] = shuffledOptions[j];
      shuffledOptions[j] = temp;
    }
    
    const newCorrectIndex = shuffledOptions.indexOf(correctOptionText);
    return {
      ...q,
      options: shuffledOptions,
      correctIndex: newCorrectIndex !== -1 ? newCorrectIndex : q.correctIndex
    };
  });

  // Shuffle order of questions themselves
  for (let i = shuffledQuestions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = shuffledQuestions[i];
    shuffledQuestions[i] = shuffledQuestions[j];
    shuffledQuestions[j] = temp;
  }

  examCopy.questions = shuffledQuestions;
  return examCopy;
};

// Import our new unified cloud Firebase with local backup
import {
  isFirebaseConfigured,
  authenticateWithGoogle,
  logOutUser,
  onUserAuthStateChanged,
  fetchTestsCloud,
  fetchSingleTestCloud,
  saveTestCloud,
  deleteTestCloud,
  saveResultCloud,
  fetchResultsCloud,
  ActiveUser
} from "./utils/firebase";

export default function App() {
  // Authentication status
  const [currentUser, setCurrentUser] = useState<ActiveUser | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);

  // App Theme: 'dark' (Default premium slate/gold SunVault theme) | 'light'
  const [theme, setTheme] = useState<"light" | "dark">("dark");

  // STEM Lab Active Key
  const [activeLabKey, setActiveLabKey] = useState<string>("plant-cell");

  // Navigation mode: 'hub' (Grid) | 'generate' | 'saved'| 'results' | 'link'
  const [currentView, setCurrentView] = useState<"hub" | "generate" | "saved" | "results" | "link">("hub");

  // Create Test States
  const [generationType, setGenerationType] = useState<"notes" | "topic">("notes");
  const [notesText, setNotesText] = useState<string>("");
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  // Form inputs for Test Configuration
  const [assessmentName, setAssessmentName] = useState<string>("Quarterly Assessment");
  const [subject, setSubject] = useState<string>("Physics 101");
  const [classLevel, setClassLevel] = useState<string>("Grade 12");
  const [topics, setTopics] = useState<string>("Gravity, Orbit mechanics, Kepler's Laws");
  const [rollNumber, setRollNumber] = useState<string>("8821000");
  const [difficulty, setDifficulty] = useState<TestDifficulty>("Medium");
  const [duration, setDuration] = useState<number>(30); // in minutes
  const [numMcqs, setNumMcqs] = useState<number>(10);
  const [securityPin, setSecurityPin] = useState<string>("12345678");

  // Temporary container for newly created but not yet launched / saved test
  const [createdTest, setCreatedTest] = useState<TestConfig | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSavedNotify, setIsSavedNotify] = useState<boolean>(false);

  // Link tab states
  const [pastedLink, setPastedLink] = useState<string>("");
  const [linkError, setLinkError] = useState<string | null>(null);

  // Lists synced from cloud / LocalStorage
  const [savedTestsList, setSavedTestsList] = useState<TestConfig[]>([]);
  const [resultsList, setResultsList] = useState<StudentResult[]>([]);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Dynamic non-blocking confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
  } | null>(null);

  // Sound Effects State
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(() => audio.isMuted());

  const toggleMute = () => {
    setIsAudioMuted((prev) => {
      const next = !prev;
      audio.setMuted(next);
      if (!next) {
        setTimeout(() => {
          audio.playClick();
        }, 30);
      }
      return next;
    });
  };

  const handlePageRefresh = async () => {
    audio.playClick();
    setIsLoadingData(true);
    try {
      if (currentUser) {
        await syncPersonalHistory(currentUser);
      } else {
        const tests = await fetchTestsCloud();
        const results = await fetchResultsCloud();
        setSavedTestsList(tests);
        setResultsList(results);
      }
    } catch (e) {
      console.error("Manual in-app refresh failed:", e);
    } finally {
      setIsLoadingData(false);
    }
  };

  const requestConfirm = (title: string, message: string, onConfirm: () => void, confirmText = "Confirm") => {
    setConfirmDialog({
      title,
      message,
      confirmText,
      onConfirm: () => {
        onConfirm();
        setConfirmDialog(null);
      }
    });
  };

  // Active Test Engine States
  const [activeExam, setActiveExam] = useState<TestConfig | null>(null);
  const [studentName, setStudentName] = useState<string>("");
  const [studentRoll, setStudentRoll] = useState<string>("");
  const [isExamStarted, setIsExamStarted] = useState<boolean>(false);
  const [isQuestionBoxOpen, setIsQuestionBoxOpen] = useState<boolean>(false);
  const [examPinInput, setExamPinInput] = useState<string>("");
  const [examPinError, setExamPinError] = useState<string | null>(null);

  // Interactive Exam Session Variables
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({}); // questionIndex -> selected option index
  const [timeLeft, setTimeLeft] = useState<number>(0); // in seconds
  const [examCompleted, setExamCompleted] = useState<boolean>(false);
  const [examResult, setExamResult] = useState<StudentResult | null>(null);
  const [examDurationTaken, setExamDurationTaken] = useState<number>(0);

  // Anti-Cheat Variables
  const [isExamLocked, setIsExamLocked] = useState<boolean>(false);
  const [lastViolationReason, setLastViolationReason] = useState<string>("");
  const [pinUnlockInput, setPinUnlockInput] = useState<string>("");
  const [pinUnlockError, setPinUnlockError] = useState<string | null>(null);
  const [cheatLogs, setCheatLogs] = useState<string[]>([]);
  const [hasCheatedFlag, setHasCheatedFlag] = useState<boolean>(false);
  
  // Secret backdoor math-bypass state (unlocked via calculator '1+1+1+1+2=')
  const [bypassUntil, setBypassUntil] = useState<number | null>(null);
  const [bypassTimeLeft, setBypassTimeLeft] = useState<number>(0);

  // Floating Calculator Toggle
  const [showCalculator, setShowCalculator] = useState<boolean>(false);

  // Timer Ref
  const examTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync Ambient Loop Sound - play when seen, but stop during active exam
  useEffect(() => {
    const handleGesture = () => {
      if (!isExamStarted && !isAudioMuted) {
        audio.startAmbient();
      }
    };

    if (!isExamStarted && !isAudioMuted) {
      audio.startAmbient();
      window.addEventListener("click", handleGesture, { passive: true });
      window.addEventListener("keydown", handleGesture, { passive: true });
    } else {
      audio.stopAmbient();
    }

    return () => {
      window.removeEventListener("click", handleGesture);
      window.removeEventListener("keydown", handleGesture);
      audio.stopAmbient();
    };
  }, [isExamStarted, isAudioMuted]);

  // Global button click sound interceptor - clicks play soft organic popping sound
  useEffect(() => {
    const handleDocumentClick = (e: MouseEvent) => {
      if (isAudioMuted) return;

      let target = e.target as HTMLElement | null;
      while (target && target !== document.body) {
        const tagName = target.tagName.toLowerCase();
        const role = target.getAttribute("role");
        const isClickable = target.classList.contains("cursor-pointer");

        if (
          tagName === "button" ||
          tagName === "a" ||
          role === "button" ||
          (tagName === "input" && (target as HTMLInputElement).type === "submit") ||
          isClickable
        ) {
          audio.playButtonClick();
          break;
        }
        target = target.parentElement;
      }
    };

    window.addEventListener("click", handleDocumentClick, { passive: true });
    return () => {
      window.removeEventListener("click", handleDocumentClick);
    };
  }, [isAudioMuted]);

  // Sync Google Auth State Change
  useEffect(() => {
    const unsub = onUserAuthStateChanged((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      if (user) {
        // Sync active user's personal cloud history on login instantly
        syncPersonalHistory(user);
      } else {
        setSavedTestsList([]);
        setResultsList([]);
      }
    });

    // Theme recovery
    const savedTheme = localStorage.getItem("mcq_app_theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }

    return () => unsub();
  }, []);

  // Check URL parameter auto-routing on start for student testing convenience
  useEffect(() => {
    // Only check once auth isn't loading
    if (authLoading) return;

    const urlParams = new URLSearchParams(window.location.search);
    const testDataParam = urlParams.get("testData");
    if (testDataParam) {
      try {
        const decoded = JSON.parse(safeAtob(testDataParam));
        if (decoded && decoded.questions && decoded.questions.length > 0) {
          // Instantly target the student to join this test
          setActiveExam(decoded);
          setStudentRoll(decoded.rollNumber || "");
          setCurrentView("link");
        }
      } catch (e) {
        console.error("URL decoding failed on test entry parameters", e);
      }
    }
  }, [authLoading]);

  // Method to fetch all dynamic cloud credentials/saved histories associated
  const syncPersonalHistory = async (user: ActiveUser) => {
    setIsLoadingData(true);
    try {
      const tests = await fetchTestsCloud();
      const results = await fetchResultsCloud();
      setSavedTestsList(tests);
      setResultsList(results);
    } catch (e) {
      console.error("Cloud database sync fail", e);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Google Login click handler
  const handleGoogleLogin = async () => {
    if (!isFirebaseConfigured()) {
      alert("Firebase is not properly set up at this moment. Please check the firebase-applet-config.json file contents.");
      return;
    }
    if (authLoading) return;
    try {
      setAuthLoading(true);
      await authenticateWithGoogle();
    } catch (e: any) {
      console.error("Authentication error background info:", e);
      const errMsg = e?.message || String(e);
      // Clean, user-friendly cancellation check
      if (
        errMsg.includes("cancelled-popup-request") || 
        errMsg.includes("popup-closed-by-user") || 
        errMsg.includes("auth/popup-closed-by-user") || 
        errMsg.includes("auth/cancelled-popup-request")
      ) {
        console.warn("User closed or cancelled Google sign-in popup.");
      } else {
        alert(
          "Google Authentication failed: " + errMsg + 
          "\n\nTip: If you are inside the embedded sandbox preview, try opening the application in a new browser tab/window using the URL bar or top-right expansion button."
        );
      }
    } finally {
      setAuthLoading(false);
    }
  };

  // Google Logout
  const handleGoogleLogout = () => {
    requestConfirm(
      "Sign Out",
      "Are you sure you want to sign out of your secure educational Google account? Your history remains safe in the cloud.",
      async () => {
        await logOutUser();
        setCurrentView("hub");
      },
      "Sign Out"
    );
  };

  // Switch Theme & Persist
  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("mcq_app_theme", next);
  };

  // Backdoor countdown
  useEffect(() => {
    if (bypassUntil !== null) {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.round((bypassUntil - Date.now()) / 1000));
        setBypassTimeLeft(remaining);
        if (remaining <= 0) {
          setBypassUntil(null);
          if (isExamStarted && !examCompleted) {
            logViolation("Security Status: Anti-cheat system re-armed automatically.");
          }
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [bypassUntil, isExamStarted, examCompleted]);

  // Handle key triggers for Anti-cheat bypass (Prints, etc.)
  useEffect(() => {
    if (isExamStarted && !examCompleted && !isExamLocked) {
      // Visibility API
      const handleVisibilityChange = () => {
        if (document.visibilityState === "hidden") {
          triggerSecurityLock("Window Minimized or Tab Switched");
        }
      };

      // Blur API
      const handleBlur = () => {
        triggerSecurityLock("Focus lost (switched app, window, or monitor)");
      };

      // Mouse leaves screen space API
      const handleMouseLeave = () => {
        triggerSecurityLock("Cursor moved off-screen (attempted dual monitor departure)");
      };

      // Stop screenshots keys (like PrintScreen) & Copy Paste
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "PrintScreen") {
          e.preventDefault();
          triggerSecurityLock("Screenshot snapshot detected via physical PrintScreen key");
        }
        if ((e.ctrlKey || e.metaKey) && (e.key === "c" || e.key === "v" || e.key === "x" || e.key === "s" || e.key === "p")) {
          e.preventDefault();
          triggerSecurityLock(`Key command blocked: Ctrl/Cmd + ${e.key.toUpperCase()}`);
        }
      };

      // Register listeners
      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("blur", handleBlur);
      document.addEventListener("mouseleave", handleMouseLeave);
      window.addEventListener("keydown", handleKeyDown);

      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        window.removeEventListener("blur", handleBlur);
        document.removeEventListener("mouseleave", handleMouseLeave);
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [isExamStarted, examCompleted, isExamLocked, bypassUntil]);

  // Exam timer countdown
  useEffect(() => {
    if (isExamStarted && !examCompleted && !isExamLocked) {
      examTimerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            clearInterval(examTimerRef.current!);
            autoSubmitExam();
            return 0;
          }
          setExamDurationTaken(d => d + 1);
          return prev - 1;
        });
      }, 1000);
    } else {
      if (examTimerRef.current) clearInterval(examTimerRef.current);
    }
    return () => {
      if (examTimerRef.current) clearInterval(examTimerRef.current);
    };
  }, [isExamStarted, examCompleted, isExamLocked]);

  const logViolation = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setCheatLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  const lockAndSubmitExam = async (reason: string, currentLogs: string[]) => {
    if (!activeExam) return;

    let score = 0;
    activeExam.questions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correctIndex) {
        score++;
      }
    });

    const finalResult: StudentResult = {
      id: "res_" + Math.random().toString(36).substring(2, 11),
      testId: activeExam.id,
      testName: activeExam.name,
      subject: activeExam.subject,
      studentRoll: studentRoll.trim(),
      studentName: studentName.trim(),
      score: score,
      totalQuestions: activeExam.questions.length,
      durationTaken: examDurationTaken,
      completedAt: new Date().toISOString(),
      cheated: true,
      securityLogs: [...currentLogs, `[${new Date().toLocaleTimeString()}] EXAM FORCE-CLOSED & AUTO-SUBMITTED ON SECURITY LOCK. Final Score recorded: ${score}/${activeExam.questions.length}`],
      ownerUid: activeExam.ownerUid,
    };

    // Save in the background so slow cloud writes never hang the submission UI
    saveResultCloud(finalResult)
      .then(async () => {
        if (currentUser) {
          const updated = await fetchResultsCloud();
          setResultsList(updated);
        }
      })
      .catch((e) => {
        console.error("Failed saving locked student answers to secure cloud database", e);
      });

    setExamResult(finalResult);
  };

  const triggerSecurityLock = (reason: string) => {
    if (bypassUntil !== null && Date.now() < bypassUntil) {
      console.log(`Bypassed cheating action (${reason}) due to active calculator backdoor!`);
      return;
    }
    audio.playAlert();
    setHasCheatedFlag(true);
    setLastViolationReason(reason);
    setIsExamLocked(true);
    
    const timestamp = new Date().toLocaleTimeString();
    const violationMsg = `CRITICAL SECURITY VIOLATION: ${reason}`;
    const newLogLine = `[${timestamp}] ${violationMsg}`;
    
    setCheatLogs(prev => {
      const updatedLogs = [...prev, newLogLine];
      lockAndSubmitExam(reason, updatedLogs);
      return updatedLogs;
    });
  };

  const triggerBackdoorBypass = () => {
    const expiresAt = Date.now() + 60000; // 60s
    setBypassUntil(expiresAt);
    setBypassTimeLeft(60);
    if (isExamStarted && !examCompleted) {
      const timestamp = new Date().toLocaleTimeString();
      setCheatLogs(prev => [...prev, `[${timestamp}] Security System Override: Internal bypass activated.`]);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setNotesText(event.target.result as string);
      }
    };
    reader.readAsText(file);
  };

  // API Call to generate multiple choice questions via Node Backend
  const handleGenerateMCQs = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsExtracting(true);
    setExtractionError(null);
    setCreatedTest(null);

    try {
      if (generationType === "notes" && !notesText.trim()) {
        throw new Error("Please paste some lecture notes or drag-and-drop a text file first to build questions.");
      }
      if (generationType === "topic" && !topics.trim()) {
        throw new Error("Please specify at least one topic under 'Specify Topic Basis' first.");
      }

      const response = await fetch("/api/generate-mcqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: generationType,
          notes: generationType === "notes" ? notesText : undefined,
          subject: subject,
          topics: topics,
          difficulty: difficulty,
          classLevel: classLevel,
          numMcqs: numMcqs,
        }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to generate questions.");
      }

      const newTest: TestConfig = {
        id: "test_" + Math.random().toString(36).substring(2, 11),
        name: assessmentName || `${subject} Test`,
        class: classLevel,
        subject: subject,
        topics: topics,
        rollNumber: rollNumber,
        difficulty: difficulty,
        duration: duration,
        numMcqs: data.questions.length,
        pin: securityPin.trim() || "12345678",
        sourceType: generationType,
        notesContent: generationType === "notes" ? notesText : undefined,
        questions: data.questions,
        createdAt: new Date().toISOString(),
        ownerUid: currentUser?.uid,
      };

      setCreatedTest(newTest);
    } catch (err: any) {
      console.error(err);
      setExtractionError(err.message || "Failed parsing questions. Please verify your variables.");
    } finally {
      setIsExtracting(false);
    }
  };

  // Save the freshly generated test securely to the User's Cloud DB mapping
  const saveCreatedTestToLibrary = async () => {
    if (!createdTest) return;

    if (!currentUser) {
      requestConfirm(
        "Sign In Required",
        "Would you like to sign in with Google to save this assessment, keep track of security monitor keys, and receive live student scoring securely on the cloud?",
        async () => {
          try {
            setAuthLoading(true);
            const user = await authenticateWithGoogle();
            if (user) {
              await proceedToSave(user);
            }
          } catch (e: any) {
            console.error("Sign-in error before saving", e);
            const errMsg = e?.message || String(e);
            if (
              errMsg.includes("cancelled-popup-request") || 
              errMsg.includes("popup-closed-by-user") || 
              errMsg.includes("auth/popup-closed-by-user") || 
              errMsg.includes("auth/cancelled-popup-request")
            ) {
              console.warn("User closed or cancelled sign-in popup from save dialog.");
            } else {
              alert(
                "Google Authentication failed: " + errMsg + 
                "\n\nTip: If you are inside the embedded sandbox preview, try opening the application in a new browser tab/window first."
              );
            }
          } finally {
            setAuthLoading(false);
          }
        },
        "Sign In & Save"
      );
      return;
    }

    await proceedToSave(currentUser);
  };

  const proceedToSave = async (user: ActiveUser) => {
    if (!createdTest) return;
    setIsLoadingData(true);
    try {
      const updatedTestWithAuth: TestConfig = {
        ...createdTest,
        ownerUid: user.uid
      };
      await saveTestCloud(updatedTestWithAuth);
      setCreatedTest(updatedTestWithAuth);
      
      // reload live list
      const updated = await fetchTestsCloud();
      setSavedTestsList(updated);
      setIsSavedNotify(true);
      setTimeout(() => setIsSavedNotify(false), 3000);
    } catch (e) {
      console.error("Cloud save failed", e);
    } finally {
      setIsLoadingData(false);
    }
  };

  const deleteTestFromLibrary = (id: string) => {
    requestConfirm(
      "Delete Test",
      "Are you sure you want to delete this test configuration from the cloud?",
      async () => {
        setIsLoadingData(true);
        try {
          await deleteTestCloud(id);
          const updated = await fetchTestsCloud();
          setSavedTestsList(updated);
        } catch (e) {
          console.error("Delete action failed", e);
        } finally {
          setIsLoadingData(false);
        }
      },
      "Delete"
    );
  };

  const generateShareLink = (config: TestConfig): string => {
    const serialized = safeBtoa(JSON.stringify(config));
    const appUrl = window.location.origin + window.location.pathname;
    return `${appUrl}?testData=${serialized}`;
  };

  const copyTestLink = (config: TestConfig) => {
    const link = generateShareLink(config);
    navigator.clipboard.writeText(link);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

   const handleLaunchPastedLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLinkError(null);

    try {
      const trimmedToken = pastedLink.trim();
      if (!trimmedToken) {
        throw new Error("Please specify a valid exam portal link or configuration token.");
      }

      let base64Segment = "";
      if (trimmedToken.includes("testData=")) {
        // Robust parameter matching that doesn't crash on incomplete/protocol-less URLs
        const match = trimmedToken.match(/[?&]testData=([^&]+)/);
        if (match) {
          base64Segment = match[1];
        } else {
          // Fallback parsing strategy
          base64Segment = trimmedToken.split("testData=")[1] || "";
        }
      } else {
        base64Segment = trimmedToken;
      }

      let decodedBase64 = base64Segment;
      try {
        decodedBase64 = decodeURIComponent(base64Segment);
      } catch (e) {
        // Proceed with raw base64
      }

      if (!decodedBase64) {
        throw new Error("No exam configuration payload found inside this link.");
      }

      const decoded = JSON.parse(safeAtob(decodedBase64));
      if (!decoded.questions || !Array.isArray(decoded.questions)) {
        throw new Error("Invalid decoded JSON payload configuration.");
      }

      // If user is a teacher, try to auto-sync this test configuration directly on the cloud in the background so it never blocks launching the exam
      if (currentUser) {
        const decodedWithAuth = {
          ...decoded,
          ownerUid: currentUser.uid
        };
        // Load the exam immediately to prevent any UI freeze/hangs
        setActiveExam(decodedWithAuth);
        
        // Asynchronously save in background
        saveTestCloud(decodedWithAuth)
          .then(() => fetchTestsCloud())
          .then((updated) => {
            setSavedTestsList(updated);
          })
          .catch((dbErr) => {
            console.warn("Cloud DB sync in background skipped/skipped:", dbErr);
          });
      } else {
        setActiveExam(decoded);
      }

      setStudentRoll(decoded.rollNumber || "");
      setPastedLink("");
      setExamPinInput("");
      setExamPinError(null);
      setCurrentView("link");
    } catch (err: any) {
      setLinkError(err.message || "Failed decoding exam link. Please check the integrity of input.");
    }
  };

  const launchPrebuiltSTEMChallenge = () => {
    setActiveExam(ILLUSTRATED_STEM_CHALLENGE);
    setStudentRoll(ILLUSTRATED_STEM_CHALLENGE.rollNumber || "");
    setStudentName("");
    setExamPinInput("");
    setExamPinError(null);
    setCurrentView("link");
  };

  const startExamVerification = (e: React.FormEvent) => {
    e.preventDefault();
    setExamPinError(null);

    if (!activeExam) return;
    if (examPinInput.trim() !== activeExam.pin) {
      audio.playIncorrect();
      setExamPinError("Security Denial: The 8-digit supervisor PIN is invalid.");
      return;
    }

    if (!studentName.trim() || !studentRoll.trim()) {
      audio.playIncorrect();
      setExamPinError("Please provide both Student Name and Roll Number before entering.");
      return;
    }

    audio.playCorrect();
    const shuffled = shuffleExam(activeExam);
    setActiveExam(shuffled);
    setSelectedAnswers({});
    setCurrentQuestionIndex(0);
    setTimeLeft(shuffled.duration * 60);
    setExamCompleted(false);
    setExamDurationTaken(0);
    setHasCheatedFlag(false);
    setIsExamLocked(false);
    setIsQuestionBoxOpen(false);
    setCheatLogs([`[${new Date().toLocaleTimeString()}] exam locked session initiated by ${studentName} (Roll: ${studentRoll})`]);
    setIsExamStarted(true);
  };

  // Submit test and sync scores directly to cloud DB mapped to test-owner
  const submitExamHandled = async () => {
    if (!activeExam) return;

    let score = 0;
    activeExam.questions.forEach((q, index) => {
      if (selectedAnswers[index] === q.correctIndex) {
        score++;
      }
    });

    const finalResult: StudentResult = {
      id: "res_" + Math.random().toString(36).substring(2, 11),
      testId: activeExam.id,
      testName: activeExam.name,
      subject: activeExam.subject,
      studentRoll: studentRoll.trim(),
      studentName: studentName.trim(),
      score: score,
      totalQuestions: activeExam.questions.length,
      durationTaken: examDurationTaken,
      completedAt: new Date().toISOString(),
      cheated: hasCheatedFlag,
      securityLogs: [...cheatLogs, `[${new Date().toLocaleTimeString()}] Student exam ended with secure logging. Final score: ${score}/${activeExam.questions.length}`],
      ownerUid: activeExam.ownerUid,
    };

    // Direct non-blocking cloud sync representation
    saveResultCloud(finalResult)
      .then(async () => {
        if (currentUser) {
          const updated = await fetchResultsCloud();
          setResultsList(updated);
        }
      })
      .catch((e) => {
        console.error("Failed saving student score to secure database", e);
      });

    // Sound feedback on completion
    if (activeExam.questions.length > 0) {
      const pct = score / activeExam.questions.length;
      if (pct >= 0.70) {
        audio.playVictory();
      } else if (score > 0) {
        audio.playCorrect();
      } else {
        audio.playIncorrect();
      }
    } else {
      audio.playCorrect();
    }

    setExamResult(finalResult);
    setExamCompleted(true);
    setIsExamStarted(false);
  };

  const autoSubmitExam = () => {
    logViolation("Auto-submitting test due to time expiry.");
    submitExamHandled();
  };

  const verifyUnlockPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinUnlockError(null);

    if (!activeExam) return;
    if (pinUnlockInput.trim() === activeExam.pin) {
      setIsExamLocked(false);
      setPinUnlockInput("");
      logViolation("Supervising Proctor typed valid security PIN. Browser unlocking completed.");
    } else {
      setPinUnlockError("Incorrect PIN specified for unlock.");
    }
  };

  const resetExamStateAndNavigateHome = () => {
    setActiveExam(null);
    setIsExamStarted(false);
    setExamCompleted(false);
    setExamResult(null);
    setStudentName("");
    setStudentRoll("");
    setExamPinInput("");
    setPinUnlockInput("");
    setCheatLogs([]);
    
    // Switch to appropriate view
    if (currentUser) {
      setCurrentView("results");
      syncPersonalHistory(currentUser);
    } else {
      setCurrentView("hub");
    }
  };

  const clearAllAuditLedger = () => {
    requestConfirm(
      "Wipe Ledger Data",
      "Permanently wipe your complete secure Google account student results audit ledger? This action is irreversible.",
      async () => {
        setIsLoadingData(true);
        try {
          // Simple local storage partitioning wipe fallback or Cloud firestore strategy representation
          localStorage.removeItem(`mcq_portal_results_${currentUser?.uid}`);
          setResultsList([]);
          if (currentUser) {
            await syncPersonalHistory(currentUser);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoadingData(false);
        }
      },
      "Wipe Irreversibly"
    );
  };

  const handlesDragHover = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handlesDragDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setNotesText(event.target.result as string);
        }
      };
      reader.readAsText(file);
    }
  };

  // Helper flags
  const isDark = theme === "dark";

  const renderLoginRequired = (title: string, desc: string, emoji: string) => {
    return (
      <div className="max-w-md mx-auto w-full py-16 px-8 rounded-3xl border text-center space-y-8 shadow-xl transition-all duration-300 bg-[#111827]/30 border-[#1F2937]/50 backdrop-blur-xs select-none">
        <div className="space-y-3 pb-2">
          <div className="text-5xl">{emoji}</div>
          <h2 className="text-2xl font-display font-extrabold tracking-tight">{title}</h2>
          <p className={`text-sm ${isDark ? "text-slate-450" : "text-slate-600"} leading-relaxed`}>
            {desc}
          </p>
        </div>

        <div className="space-y-4 pt-2">
          <button
            onClick={handleGoogleLogin}
            disabled={authLoading}
            className={`w-full py-3.5 px-6 rounded-2xl font-bold flex items-center justify-center space-x-3 transition-all duration-200 cursor-pointer shadow-lg tracking-wide ${
              authLoading ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.01] active:scale-[0.99]"
            } ${
              isDark 
                ? "bg-indigo-600 text-white hover:bg-indigo-500 shadow-indigo-900/10" 
                : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-slate-900/10"
            }`}
          >
            {authLoading ? (
              <div className="flex items-center space-x-2">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Signing in...</span>
              </div>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.986 0-.745-.075-1.3-.173-1.854l-10.62-.355z"/>
                </svg>
                <span>Sign in with Google</span>
              </>
            )}
          </button>

          <button
            onClick={() => setCurrentView("hub")}
            className={`w-full py-2.5 px-6 rounded-2xl border font-bold text-xs transition-colors cursor-pointer flex items-center justify-center space-x-2 ${
              isDark 
                ? "bg-slate-950/40 border-[#1F2937] text-slate-350 hover:bg-[#111827] hover:text-white" 
                : "bg-white border-[#CDD2D2] text-slate-650 hover:bg-[#F8FAFC] hover:text-[#0F172A]"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Return to Central Hub</span>
          </button>
        </div>

        <div className={`text-[10px] uppercase font-mono tracking-widest pt-4 opacity-50 flex items-center justify-center space-x-2 ${
          isDark ? "text-slate-400" : "text-slate-550"
        }`}>
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Secured Sync Flow</span>
        </div>
      </div>
    );
  };

  return (
    <div className={`min-h-screen w-full font-sans transition-colors duration-300 relative ${
      isDark 
        ? "bg-[#090D16] text-slate-100 selection:bg-indigo-500/20 selection:text-indigo-400" 
        : "bg-[#F8FAFC] text-[#0F172A] selection:bg-indigo-500/10 selection:text-indigo-650"
    }`} id="main-app-container">

      {/* GLOBAL BLURRED BACKGROUND IMAGE */}
      <div 
        className="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden transition-opacity duration-500"
        style={{
          backgroundImage: `url(${bubbleBgImg})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          opacity: isDark ? 0.38 : 0.26,
          filter: 'blur(6px)',
          transform: 'scale(1.04)'
        }}
      />

      {/* RENDER EXAM - BLOCKS ENTIRE SCREEN FOR SECURITY */}
      {isExamStarted ? (
        <div className={`min-h-screen p-6 md:p-8 flex flex-col justify-between relative z-10 ${
          isDark ? "bg-[#141919]/65 backdrop-blur-md" : "bg-[#EDF0F0]/65 backdrop-blur-md"
        }`}>
          <motion.div 
            initial={{ opacity: 0, y: -60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 180 }}
            className="max-w-5xl mx-auto w-full flex-1 flex flex-col justify-between space-y-6"
          >
            
            {/* Security Lock State */}
            {isExamLocked ? (
              <div className={`my-auto max-w-xl mx-auto rounded-3xl p-8 border text-center space-y-6 transition-all duration-300 ${
                isDark ? "bg-[#1E1212] border-red-900/40 shadow-2xl shadow-red-950/30" : "bg-red-50/10 border-red-200 shadow-xl"
              }`}>
                <div className="w-16 h-16 rounded-2xl bg-red-600/10 text-red-500 flex items-center justify-center mx-auto border border-red-500/30 animate-pulse">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                
                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-black text-red-500 uppercase tracking-tight">EXAM PERMANENTLY LOCKED &amp; SUBMITTED</h2>
                  <p className={`text-sm leading-relaxed ${isDark ? "text-slate-350" : "text-slate-750"}`}>
                    This active browser assessment session was terminated immediately and auto-submitted to security records because a proctoring security violation was identified.
                  </p>
                  <p className={`text-xs font-semibold leading-relaxed p-3 rounded-xl border ${
                    isDark ? "bg-[#2E1515]/60 border-red-900/35 text-red-300" : "bg-red-50/80 border-red-200/80 text-red-800"
                  }`}>
                    ⚠️ Unlocking under supervisor standard authorization PINs is disabled. This incident has been permanently reported on your evaluation sheet.
                  </p>
                </div>

                <div className={`p-4 rounded-2xl border text-left space-y-3 ${
                  isDark ? "bg-[#151212] border-[#2E1D1D]" : "bg-white border-slate-250"
                }`}>
                  <h3 className={`text-xs font-mono uppercase tracking-wider font-extrabold pb-2 border-b ${
                    isDark ? "text-red-400 border-red-900/20" : "text-red-700 border-slate-150"
                  }`}>
                    Candidate Telemetry Log Dossier
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
                    <div>
                      <span className="opacity-50 block text-[10px]">CANDIDATE NAME</span>
                      <strong className={isDark ? "text-slate-200" : "text-slate-800"}>{studentName || "Guest Candidate"}</strong>
                    </div>
                    <div>
                      <span className="opacity-50 block text-[10px]">ROLL NUMBER IDENTIFIER</span>
                      <strong className={isDark ? "text-indigo-400" : "text-indigo-650"}>{studentRoll || "Unspecified"}</strong>
                    </div>
                    <div>
                      <span className="opacity-50 block text-[10px]">Incident Event</span>
                      <strong className="text-red-400">{lastViolationReason}</strong>
                    </div>
                    <div>
                      <span className="opacity-50 block text-[10px]">AUTOSUBMITTED STATUS</span>
                      <strong className="text-emerald-500">COMPLETE &amp; SIGNED</strong>
                    </div>
                  </div>
                </div>

                <div className={`p-4 rounded-xl border flex items-center justify-between font-mono ${
                  isDark ? "bg-[#1C1616] border-red-950/40 text-red-400" : "bg-red-50/70 border-red-200 text-red-800"
                }`}>
                  <span className="text-xs font-semibold">Candidate Recipient Score Saved (Archived):</span>
                  <span className="text-lg font-bold">{examResult?.score ?? 0} / {examResult?.totalQuestions ?? activeExam?.questions.length}</span>
                </div>

                <button
                  onClick={resetExamStateAndNavigateHome}
                  className="w-full py-4 bg-gradient-to-r from-red-700 to-red-600 hover:from-red-650 hover:to-red-550 text-white rounded-xl font-extrabold uppercase tracking-wider transition-all duration-300 cursor-pointer shadow-lg hover:shadow-red-950/20 flex items-center justify-center space-x-2 animate-pulse"
                >
                  <span>Close &amp; Exit Assessment Portal</span>
                </button>
              </div>
            ) : examCompleted ? (
              /* Completed Result screen overlay */
              <div className={`my-auto max-w-xl mx-auto rounded-3xl p-8 border text-center space-y-6 transition-all duration-300 ${
                isDark ? "bg-[#232B2B] border-[#2C3636] shadow-2xl" : "bg-white border-slate-200 shadow-lg"
              }`}>
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-sm border ${
                  isDark ? "bg-emerald-950/40 border-emerald-900/30 text-emerald-400" : "bg-emerald-50 border-emerald-250 text-emerald-650"
                }`}>
                  <CheckCircle2 className="w-8 h-8 font-light" />
                </div>
                

                <div>
                  <h2 className="text-2xl font-display font-bold">Assessment Completed</h2>
                  <p className={`text-sm mt-2 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    Your answers were submitted and synced to their associated clouds.
                  </p>
                </div>

                <div className={`grid grid-cols-2 gap-4 py-4 border-t border-b ${isDark ? "border-[#323D3D]/50" : "border-[#E5ECEC]"}`}>
                  <div className={`text-center p-4 rounded-xl border ${isDark ? "bg-[#181D1D]/75 border-[#323D3D]" : "bg-[#F5F8F8] border-[#E0E5E5]"}`}>
                    <p className={`text-xs font-display ${isDark ? "text-slate-500" : "text-slate-400"}`}>Score Achieved</p>
                    <p className={`text-3xl font-mono font-bold mt-1.5 ${isDark ? "text-indigo-400" : "text-indigo-600"}`}>
                      {examResult?.score} / {examResult?.totalQuestions}
                    </p>
                    <p className={`text-xs font-semibold mt-0.5 ${isDark ? "text-indigo-300" : "text-indigo-655"}`}>
                      {Math.round(((examResult?.score || 0) / (examResult?.totalQuestions || 1)) * 100)}% Accuracy
                    </p>
                  </div>

                  <div className={`text-center p-4 rounded-xl border ${isDark ? "bg-[#181D1D]/75 border-[#323D3D]" : "bg-[#F5F8F8] border-[#E0E5E5]"}`}>
                    <p className={`text-xs font-display ${isDark ? "text-slate-500" : "text-slate-400"}`}>Proctor Integrity Logs</p>
                    {examResult?.cheated ? (
                      <div className="text-red-500 mt-2 flex flex-col items-center justify-center">
                        <ShieldAlert className="w-6 h-6 mb-1" />
                        <span className="text-xs font-semibold">Violation Flags Raised</span>
                      </div>
                    ) : (
                      <div className="text-emerald-600 mt-2 flex flex-col items-center justify-center">
                        <ShieldCheck className="w-6 h-6 mb-1" />
                        <span className="text-xs font-semibold">100% Secure Integrity</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={resetExamStateAndNavigateHome}
                  className={`w-full py-3.5 rounded-xl font-semibold transition-all cursor-pointer shadow-md ${
                    isDark ? "bg-indigo-600 text-white hover:bg-indigo-500" : "bg-indigo-600 text-white hover:bg-indigo-700"
                  }`}
                >
                  Return to Dashboard &amp; Exit Portal
                </button>
              </div>
            ) : (
              /* Core Candidate testing screen */
              <div className="space-y-6">
                
                {/* Active Test details header */}
                <div className={`rounded-2xl border p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all duration-300 backdrop-blur-md ${
                  isDark ? "bg-[#111827]/40 border-[#2C3636]/60 shadow-md" : "bg-white/45 border-[#E0E5E5]/70 shadow-sm"
                }`}>
                  <div>
                    <span className={`text-[10px] font-mono uppercase px-2.5 py-1 rounded-full border ${
                      isDark 
                        ? "bg-indigo-950/40 text-indigo-400 border-indigo-900/30" 
                        : "bg-indigo-50 text-indigo-750 border-indigo-250"
                    }`}>
                      Secure Assessment Session Active
                    </span>
                    <h2 className="text-xl font-display font-medium mt-2">{activeExam?.name}</h2>
                    <p className={`text-xs mt-1 ${isDark ? "text-slate-450" : "text-slate-600"}`}>
                      Subject: <strong className={isDark ? "text-slate-350" : "text-slate-800"}>{activeExam?.subject}</strong> | Roll ID: <strong className={`font-mono font-bold ${isDark ? "text-indigo-400" : "text-indigo-650"}`}>{studentRoll}</strong> ({studentName})
                    </p>
                  </div>

                  {/* Timing & Calculator trigger shortcuts */}
                  <div className="flex items-center space-x-4 font-mono">
                    {bypassUntil !== null && (
                      <span className={`text-xs px-2.5 py-1 rounded-lg animate-pulse shrink-0 ${
                        isDark ? "text-indigo-400 border border-indigo-900/40 bg-indigo-950/20" : "text-indigo-850 border border-indigo-300 bg-indigo-50"
                      }`}>
                        Security Suspended ({bypassTimeLeft}s)
                      </span>
                    )}

                    <div className={`flex items-center space-x-2 px-4 py-2 border rounded-xl ${
                      isDark ? "bg-[#181D1D] border-[#323D3D]" : "bg-[#F3F5F5] border-[#D3D8D8]"
                    }`}>
                      <Clock className="w-4 h-4 text-slate-500" />
                      <span className={`text-sm font-bold ${timeLeft < 120 ? "text-red-500 animate-pulse" : ""}`}>
                        {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                      </span>
                    </div>

                    <button
                      onClick={() => setShowCalculator(true)}
                      className={`px-3 py-2 border rounded-xl text-xs font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
                        isDark 
                          ? "bg-[#181D1D] border-[#323D3D] text-indigo-400 hover:bg-slate-800" 
                          : "bg-white border-[#CDD2D2] text-[#1D4ED8] hover:bg-slate-50"
                      }`}
                    >
                      <Calculator className="w-3.5 h-3.5" />
                      <span>Calculator</span>
                    </button>
                  </div>
                </div>

                {/* Primary Card View representing target active Question index schema */}
                {activeExam && activeExam.questions && (
                  <div className={`rounded-3xl border p-6 sm:p-8 space-y-6 shadow-md transition-all duration-300 backdrop-blur-md ${
                    isDark ? "bg-[#111827]/45 border-[#2C3636]/60 shadow-lg" : "bg-white/50 border-[#D6DBDB]/80 shadow-md"
                  }`}>
                    
                    {/* Index Tags navigation progress trackers, moved to an expandable box button */}
                    <div className="pb-5 border-b border-dashed border-[#CDD2D2]/50 dark:border-slate-700/50 space-y-3">
                      <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsQuestionBoxOpen(!isQuestionBoxOpen);
                            audio.playClick();
                          }}
                          className={`w-full sm:w-auto px-5 py-3 rounded-2xl border flex items-center justify-between sm:space-x-4 transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer shadow-sm ${
                            isDark 
                              ? "bg-slate-800/80 border-slate-700 text-slate-100 hover:bg-slate-800" 
                              : "bg-[#F3F5F5] border-slate-200 text-slate-800 hover:bg-[#EBF0F0]"
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <span className="text-lg">📦</span>
                            <div className="text-left">
                              <span className="text-xs font-bold block tracking-tight">Question Navigator Box</span>
                              <span className="text-[10px] font-mono opacity-60">
                                Completed: <strong className="text-emerald-500 font-bold">{Object.keys(selectedAnswers).length}</strong> of {activeExam.questions.length}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            {/* Visual pill showing status */}
                            <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                              Object.keys(selectedAnswers).length === activeExam.questions.length
                                ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                            }`}>
                              {Math.round((Object.keys(selectedAnswers).length / activeExam.questions.length) * 100)}% Done
                            </span>
                            <span className="text-xs opacity-50 transition-all">
                              {isQuestionBoxOpen ? "▲" : "▼"}
                            </span>
                          </div>
                        </button>

                        {/* Fast HUD status summary next to it */}
                        <div className="hidden sm:flex items-center space-x-2 text-xs opacity-50 font-mono">
                          <span>Current Focus: Question #{currentQuestionIndex + 1}</span>
                        </div>
                      </div>

                      {/* Expandable Box content with the actual numbered buttons */}
                      {isQuestionBoxOpen && (
                        <div className={`p-4 rounded-2xl border p-5 space-y-3 animate-fadeIn duration-200 ${
                          isDark ? "bg-[#181D1D]/90 border-indigo-500/20" : "bg-indigo-50/20 border-indigo-100"
                        }`}>
                          <div className="flex items-center justify-between border-b border-dashed border-[#CDD2D2]/25 dark:border-slate-700/20 pb-2">
                            <span className="text-xs font-semibold">
                              Select a number to jump to question:
                            </span>
                            <button 
                              onClick={() => {
                                setIsQuestionBoxOpen(false);
                                audio.playClick();
                              }}
                              className="text-[10px] font-mono hover:underline text-indigo-500 cursor-pointer"
                            >
                              Hide Box [×]
                            </button>
                          </div>
                          
                          <div className="flex flex-wrap gap-2.5">
                            {activeExam.questions.map((_, index) => {
                              const isVisited = selectedAnswers[index] !== undefined;
                              const isCurrent = currentQuestionIndex === index;
                              return (
                                <button
                                  key={index}
                                  onClick={() => {
                                    setCurrentQuestionIndex(index);
                                    audio.playClick();
                                  }}
                                  className={`w-11 h-11 rounded-xl font-mono text-xs font-bold transition-all flex flex-col items-center justify-center border cursor-pointer relative ${
                                    isCurrent
                                      ? isDark 
                                        ? "bg-indigo-500/25 text-white border-indigo-400 font-extrabold ring-2 ring-indigo-500/40" 
                                        : "bg-indigo-100 text-indigo-900 border-indigo-400 font-extrabold ring-2 ring-indigo-600/20"
                                      : isVisited
                                      ? isDark ? "bg-emerald-950/40 text-emerald-400 border-emerald-500/30" : "bg-emerald-50 text-emerald-800 border-emerald-200"
                                      : isDark ? "text-slate-500 border-slate-750 bg-slate-800/30 hover:text-slate-350" : "text-slate-400 border-slate-200 bg-white hover:text-slate-800"
                                  }`}
                                  title={isVisited ? "Answered" : "Unanswered"}
                                >
                                  <span>{index + 1}</span>
                                  {isVisited && (
                                    <span className="absolute bottom-0.5 text-[8px] text-emerald-500 font-bold">•</span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                          
                          <div className="text-[10px] opacity-40 italic">
                            💡 Click on any of the question numbers above to navigate directly during the exam. Done/Answered questions have green tinted circles with indicator dots.
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Show Active Question and Optional Diagram */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      {activeExam.questions[currentQuestionIndex].diagramKey && (
                        <div className="lg:col-span-5 w-full flex flex-col space-y-3">
                          <span className={`text-[10px] font-mono tracking-widest uppercase font-bold ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            Visual Reference Diagram
                          </span>
                          <InteractiveDiagram 
                            diagramKey={activeExam.questions[currentQuestionIndex].diagramKey} 
                            theme={theme} 
                          />
                        </div>
                      )}
                      
                      <div className={activeExam.questions[currentQuestionIndex].diagramKey ? "lg:col-span-7 space-y-6" : "lg:col-span-12 space-y-6"}>
                        <div className="space-y-2">
                          <span className={`text-[10px] font-mono font-bold uppercase tracking-widest ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                            Question {currentQuestionIndex + 1} of {activeExam.questions.length}
                          </span>
                          <h3 className={`text-md sm:text-lg font-display font-semibold leading-relaxed ${isDark ? "text-slate-100" : "text-[#1C2222]"}`}>
                            {activeExam.questions[currentQuestionIndex].question}
                          </h3>
                        </div>

                        {/* Option Selections */}
                        <div className="grid grid-cols-1 gap-3.5 pt-2">
                          {activeExam.questions[currentQuestionIndex].options.map((option, idx) => {
                            const isSelected = selectedAnswers[currentQuestionIndex] === idx;
                            const letters = ["A", "B", "C", "D"];
                            return (
                              <button
                                key={idx}
                                onClick={() => {
                                  setSelectedAnswers(prev => ({ ...prev, [currentQuestionIndex]: idx }));
                                  audio.playClick();
                                }}
                                className={`text-left p-4 rounded-xl border text-sm transition-all flex items-center space-x-4 cursor-pointer transform active:scale-[0.99] ${
                                  isSelected
                                    ? isDark 
                                      ? "bg-indigo-500/10 border-indigo-400 text-white shadow-xs" 
                                      : "bg-indigo-50 border-indigo-500 text-indigo-950 shadow-xs font-medium"
                                    : isDark
                                    ? "bg-[#181D1D]/45 border-[#323D3D]/80 text-slate-300 hover:border-slate-650 hover:bg-[#181D1D]"
                                    : "bg-[#F6F8F8]/45 border-[#CDD2D2]/80 text-slate-700 hover:border-[#989E9E] hover:bg-white/60"
                                }`}
                              >
                                <span className={`w-6 h-6 shrink-0 rounded-lg text-xs font-bold font-mono flex items-center justify-center border transition-colors ${
                                  isSelected
                                    ? "bg-indigo-600 text-white border-transparent"
                                    : isDark ? "bg-[#2A3333] text-slate-400 border-[#323D3D]" : "bg-white text-slate-500 border-[#CDD2D2]"
                                }`}>
                                  {letters[idx]}
                                </span>
                                <span>{option}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Multi-action exam button triggers */}
                    <div className="flex justify-between items-center pt-6 border-t border-dashed border-slate-700/50">
                      <button
                        onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                        disabled={currentQuestionIndex === 0}
                        className={`px-4 py-2 text-sm border rounded-xl transition-all cursor-pointer ${
                          currentQuestionIndex === 0
                            ? "opacity-30 cursor-not-allowed"
                            : isDark ? "bg-[#181D1D] hover:bg-[#2C3636] border-[#323D3D]" : "bg-[#ECEFFF] hover:bg-[#DFE4E4] border-[#CDD2D2]"
                        }`}
                      >
                        Previous Question
                      </button>

                      {currentQuestionIndex < activeExam.questions.length - 1 ? (
                        <button
                          onClick={() => setCurrentQuestionIndex(prev => Math.min(activeExam.questions.length - 1, prev + 1))}
                          className={`px-5 py-2 text-sm rounded-xl transition-all font-medium cursor-pointer ${
                            isDark ? "bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/30" : "bg-indigo-600 text-white hover:bg-indigo-700"
                          }`}
                        >
                          Next Question
                        </button>
                      ) : (
                        <button
                          onClick={submitExamHandled}
                          className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold transition-all cursor-pointer shadow-md flex items-center space-x-2"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Submit Assessment Complete</span>
                        </button>
                      )}
                    </div>

                  </div>
                )}

              </div>
            )}

            {/* Micro Footer status enforcer audit */}
            <div className="flex justify-between items-center text-[10px] font-mono text-slate-500 pt-6">
              <span>Proctor Token UID: {activeExam?.id}</span>
              <span>UTC timestamp synchronization active</span>
            </div>

          </motion.div>
        </div>
      ) : (
        /* STANDARD WORKSPACE MAIN WRAPPER (Authenticated/Hub controls) */
        <div className="flex flex-col min-h-screen relative z-10">
          
          {/* TOP BAR BRANDING HEADER */}
          <header className={`h-20 shrink-0 sticky top-0 z-40 transition-all duration-300 border-b flex items-center justify-between px-6 sm:px-8 backdrop-blur-md ${
            isDark 
              ? "bg-[#181D1D]/75 border-[#2C3636]" 
              : "bg-white/75 border-[#E0E6E6] shadow-xs"
          }`}>
            
            {/* Logo */}
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setCurrentView("hub")}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-xs border ${
                isDark 
                  ? "bg-[#232B2B] text-slate-400 border-slate-700/30" 
                  : "bg-[#F3F5F5] text-slate-500 border-slate-200/40"
              }`}>
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-md sm:text-lg font-display font-bold tracking-tight">MCQs SHIELD</h1>
                <p className={`text-[9px] font-mono uppercase tracking-wider ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                  educational portal
                </p>
              </div>
            </div>

            {/* Middle Nav Option Shortcuts if in secondary view */}
            {currentView !== "hub" && currentUser && (
              <button
                onClick={() => setCurrentView("hub")}
                className={`hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-all ${
                  isDark 
                    ? "bg-[#232B2B] border-[#323D3D] text-slate-300 hover:text-indigo-400 hover:border-indigo-500/50" 
                    : "bg-[#FDFDFD] border-[#CDD2D2] text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Return to Central Hub</span>
              </button>
            )}

            {/* Right details panel toggles */}
            <div className="flex items-center space-x-4">
              
              {/* Backdoor overlay status bar */}
              {bypassUntil !== null && (
                <div className="hidden sm:flex items-center space-x-2 px-3 py-1 bg-indigo-950/20 text-indigo-400 border border-indigo-900/30 rounded-full text-[10px] font-mono font-bold animate-pulse">
                  <span>OVERRIDE ACTIVATED ({bypassTimeLeft}s)</span>
                </div>
              )}

              {/* Theme toggle option */}
              <button
                onClick={() => {
                  toggleTheme();
                  audio.playClick();
                }}
                className={`p-2 border rounded-xl hover:scale-105 transition-all cursor-pointer ${
                  isDark ? "bg-[#232B2B] border-[#323D3D] text-indigo-400" : "bg-[#F3F5F5] border-[#CDD2D2] text-slate-700"
                }`}
                title={isDark ? "Switch to Light Sage Theme" : "Switch to Dark Charcoal-Gold Theme"}
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              {/* Refresh option (dynamic in-app reload) */}
              <button
                onClick={handlePageRefresh}
                className={`p-2 border rounded-xl hover:scale-105 transition-all cursor-pointer flex items-center justify-center ${
                  isDark ? "bg-[#232B2B] border-[#323D3D] text-indigo-400" : "bg-[#F3F5F5] border-[#CDD2D2] text-slate-700"
                }`}
                title="Refresh Cloud Lists & Sync Profiles"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingData ? "animate-spin text-indigo-500" : "text-emerald-500"}`} />
              </button>

              {/* Account integration picture details */}
              {currentUser ? (
                <div className="flex items-center space-x-3 pl-2 border-l border-slate-750">
                  <div className="text-right hidden sm:block overflow-hidden">
                    <p className={`text-xs font-semibold truncate ${isDark ? "text-slate-200" : "text-[#1C2222]"}`}>
                      {currentUser.displayName}
                    </p>
                    <p className="text-[10px] font-mono text-slate-500 truncate">{currentUser.email}</p>
                  </div>
                  <div className="w-9 h-9 rounded-full overflow-hidden border shrink-0 border-indigo-500/30">
                    {currentUser.photoURL ? (
                      <img 
                        src={currentUser.photoURL} 
                        alt={currentUser.displayName} 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${
                        isDark ? "bg-[#1E2525] text-teal-400" : "bg-slate-100 text-slate-700"
                      }`}>
                        <User className="w-5 h-5" />
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleGoogleLogout}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      isDark 
                        ? "bg-[#111827] border-[#1F2937] text-slate-400 hover:text-indigo-400" 
                        : "bg-[#FFFFFF] border-red-200 text-[#1C2222] hover:text-red-500 hover:bg-red-50"
                    }`}
                    title="Sign Out Google Session"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <span className="hidden sm:inline text-[11px] font-mono opacity-50">Browsing as Guest</span>
                  <button
                    onClick={handleGoogleLogin}
                    disabled={authLoading}
                    className={`text-xs select-none cursor-pointer py-1.5 px-3.5 rounded-xl font-bold border flex items-center space-x-1.5 transition-all duration-200 ${
                      authLoading ? "opacity-60 cursor-not-allowed" : "hover:scale-[1.01] active:scale-[0.99]"
                    } ${
                      isDark 
                        ? "bg-[#111827] border-[#1F2937] text-indigo-400 hover:bg-slate-800 hover:border-indigo-500/50 hover:text-indigo-300" 
                        : "bg-white border-slate-300 text-indigo-600 hover:bg-slate-50 hover:border-indigo-500"
                    }`}
                  >
                    {authLoading ? (
                      <div className="flex items-center space-x-1.5">
                        <div className="w-3.5 h-3.5 border border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                        <span>Signing in...</span>
                      </div>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.24 10.285V13.4h6.887c-.275 1.565-1.88 4.604-6.887 4.604-4.33 0-7.859-3.578-7.859-8s3.53-8 7.859-8c2.46 0 4.105 1.025 5.047 1.926l2.427-2.334C17.955 2.192 15.34 1 12.24 1 6.033 1 12.24s5.033 11.24 11.24 11.24c6.478 0 10.793-4.537 10.793-10.986 0-.745-.075-1.3-.173-1.854l-10.62-.355z"/>
                        </svg>
                        <span>Sign in with Google</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

          </header>

          {/* MAIN WORKSPACE BODY */}
          <main className="flex-1 p-6 sm:p-10 pb-20 max-w-7xl mx-auto w-full flex flex-col justify-start">

            {/* PORTAL NAVIGATION VIEWS */}
            <AnimatePresence mode="wait">
              {currentView === "hub" ? (
                
                /* DETAILED LANDING HUB OPTION TILES - GRAPHICALLY POLISHED */
                <motion.div 
                  key="hub"
                  initial={{ opacity: 0, y: -40 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 30 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="space-y-12 py-6 w-full"
                >
                
                {/* Dashboard Intro text */}
                <div className="text-center space-y-4 max-w-2xl mx-auto">
                  <h2 className="text-3xl md:text-4xl font-display font-black tracking-tight leading-tight">
                    MCQs SHIELD Hub
                  </h2>
                  <p className={`text-sm md:text-md leading-relaxed ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                    Experience standard offline data with real-time automatic cloud synchronization. Generate custom MCQ configurations using AI, manage saved tests, and verify student audit results.
                  </p>
                </div>

                {/* 4 Center Options aligned elegantly in high-contrast tiles */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto" id="central-navigation-grid">
                  
                  {/* Card 1: Generate Assess */}
                  <div 
                    onClick={() => {
                      setCreatedTest(null);
                      setCurrentView("generate");
                      audio.playClick();
                    }}
                    className="group relative h-[210px] rounded-3xl border overflow-hidden text-left cursor-pointer transition-all duration-300 transform hover:-translate-y-1 bg-slate-900 border-slate-800 shadow-md hover:shadow-indigo-500/10"
                  >
                    <img 
                      src={generationImg} 
                      alt="Create MCQ Test" 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-65 group-hover:opacity-75"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                    
                    <div className="relative z-10 p-6 h-full flex flex-col justify-between">
                      <div className="bg-white/10 backdrop-blur-md text-white border border-white/20 w-11 h-11 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                        <Settings2 className="w-5 h-5 group-hover:rotate-45 transition-transform duration-300" />
                      </div>
                      <div>
                        <h3 className="text-base font-display font-bold text-white mb-1 drop-shadow-md">
                          CREATE MCQ TEST
                        </h3>
                        <p className="text-[11px] leading-normal text-slate-300 drop-shadow-xs max-w-sm">
                          Compile high-fidelity assessments instantly by copying course lecture notes or specifying global subjects via Gemini.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card 2: Joins link */}
                  <div 
                    onClick={() => {
                      setLinkError(null);
                      setCurrentView("link");
                      audio.playClick();
                    }}
                    className="group relative h-[210px] rounded-3xl border overflow-hidden text-left cursor-pointer transition-all duration-300 transform hover:-translate-y-1 bg-slate-900 border-slate-800 shadow-md hover:shadow-indigo-500/10"
                  >
                    <img 
                      src={proctorImg} 
                      alt="Enter Exam Session" 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-65 group-hover:opacity-75"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                    
                    <div className="relative z-10 p-6 h-full flex flex-col justify-between">
                      <div className="bg-white/10 backdrop-blur-md text-white border border-white/20 w-11 h-11 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                        <Play className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <div>
                        <h3 className="text-base font-display font-bold text-white mb-1 drop-shadow-md">
                          ENTER EXAM SESSION
                        </h3>
                        <p className="text-[11px] leading-normal text-slate-300 drop-shadow-xs max-w-sm">
                          Paste a secure test invitation link or payload signature token directly to launch a locked, full-screen anti-cheat verification page.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card 3: Library Browse */}
                  <div 
                    onClick={() => {
                      setCurrentView("saved");
                      if (currentUser) {
                        syncPersonalHistory(currentUser);
                      }
                      audio.playClick();
                    }}
                    className="group relative h-[210px] rounded-3xl border overflow-hidden text-left cursor-pointer transition-all duration-300 transform hover:-translate-y-1 bg-slate-900 border-slate-800 shadow-md hover:shadow-indigo-500/10"
                  >
                    <img 
                      src={libraryImg} 
                      alt="Saved Prebuilt Tests" 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-65 group-hover:opacity-75"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                    
                    <div className="relative z-10 p-6 h-full flex flex-col justify-between">
                      <div className="bg-white/10 backdrop-blur-md text-white border border-white/20 w-11 h-11 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                        <Bookmark className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <div>
                        <h3 className="text-base font-display font-bold text-white mb-1 drop-shadow-md">
                          SAVED PREBUILT TESTS
                        </h3>
                        <p className="text-[11px] leading-normal text-slate-300 drop-shadow-xs max-w-sm">
                          Manage assessment modules, view student security access PINs, retrieve launcher tokens, and download templates.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card 4: Ledger Audit */}
                  <div 
                    onClick={() => {
                      setCurrentView("results");
                      if (currentUser) {
                        syncPersonalHistory(currentUser);
                      }
                      audio.playClick();
                    }}
                    className="group relative h-[210px] rounded-3xl border overflow-hidden text-left cursor-pointer transition-all duration-300 transform hover:-translate-y-1 bg-slate-900 border-slate-800 shadow-md hover:shadow-indigo-500/10"
                  >
                    <img 
                      src={resultsImg} 
                      alt="Results Log Audits" 
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 opacity-65 group-hover:opacity-75"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
                    
                    <div className="relative z-10 p-6 h-full flex flex-col justify-between">
                      <div className="bg-white/10 backdrop-blur-md text-white border border-white/20 w-11 h-11 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                        <History className="w-4 h-4 group-hover:scale-110 transition-transform duration-300" />
                      </div>
                      <div>
                        <h3 className="text-base font-display font-bold text-white mb-1 drop-shadow-md">
                          RESULTS LOG AUDITS
                        </h3>
                        <p className="text-[11px] leading-normal text-slate-300 drop-shadow-xs max-w-sm">
                          Investigate candidate completion timings, correctness ratios, cheating warnings list, and verify browser blur reports.
                        </p>
                      </div>
                    </div>
                  </div>

                </div>

              </motion.div>

            ) : currentView === "generate" ? (
              <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 180 }}
                className="w-full flex flex-col items-center font-sans"
              >
                {!currentUser ? (
                  renderLoginRequired(
                    "AI Test Builder Gateway",
                    "Sign in with Google to compile robust dynamic tests with lecture notes or specific topics, which will be synced and stored safely in your cloud profile dashboard.",
                    "⚙️"
                  )
                ) : (
                  /* VIEW: GENERATE MCQ ASSESSMENT */
                  <div className="space-y-6 max-w-4xl mx-auto w-full">
                
                {/* Section Header */}
                <div className="flex items-center justify-between pb-4 border-b border-[#323D3D]/40">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setCurrentView("hub")}
                      className={`p-2 border rounded-xl hover:bg-slate-800 transition-colors cursor-pointer ${
                        isDark ? "bg-[#232B2B] border-[#323D3D]" : "bg-white border-[#CDD2D2]"
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h2 className="text-xl font-display font-bold">Generate MCQ Assessment</h2>
                      <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>Configured using premium Gemini AI models</p>
                    </div>
                  </div>
                  <div className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    isDark ? "bg-[#323D3D] text-slate-300" : "bg-slate-100/70 text-slate-650"
                  }`}>
                    Step 1: Configuration
                  </div>
                </div>


                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Configuration Input Panels */}
                  <form onSubmit={handleGenerateMCQs} className={`lg:col-span-7 rounded-2xl border p-6 space-y-5 transition-all duration-300 backdrop-blur-md ${
                    isDark ? "bg-[#111827]/10 border-[#2C3636]/30 shadow-lg" : "bg-white/10 border-slate-300/40 shadow-sm"
                  }`}>
                    
                    {/* Method Selector Option */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold block">Source Generation Method</label>
                      <div className="grid grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => setGenerationType("notes")}
                          className={`py-3 px-4 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                            generationType === "notes"
                              ? isDark ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-400" : "bg-indigo-50 border-indigo-400 text-indigo-800 font-bold"
                              : isDark ? "bg-[#181D1D]/30 border-[#323D3D]/50 text-slate-400" : "bg-white/25 border-slate-200 text-slate-500"
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                          <span>Paste Lecture Notes</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setGenerationType("topic")}
                          className={`py-3 px-4 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
                            generationType === "topic"
                              ? isDark ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-400" : "bg-indigo-50 border-indigo-400 text-indigo-800 font-bold"
                              : isDark ? "bg-[#181D1D]/30 border-[#323D3D]/50 text-slate-400" : "bg-white/25 border-slate-200 text-slate-500"
                          }`}
                        >
                          <BookOpen className="w-4 h-4" />
                          <span>Specify Topic Basis</span>
                        </button>
                      </div>
                    </div>

                    {/* Conditional input */}
                    {generationType === "notes" ? (
                      <div className="space-y-2">
                        <div className="flex justify-between items-center text-xs">
                          <label className="font-semibold block">Notes Text Body</label>
                          <span className={`${isDark ? "text-slate-520" : "text-slate-400"} font-mono`}>{notesText.length} characters</span>
                        </div>
                        <div
                          onDragOver={handlesDragHover}
                          onDrop={handlesDragDrop}
                          className={`relative border-2 border-dashed rounded-xl p-4 transition-all flex flex-col justify-center min-h-[160px] ${
                            isDark ? "bg-[#181D1D]/35 border-[#323D3D]" : "bg-[#FAFBFB]/30 border-slate-300"
                          }`}
                        >
                          <textarea
                            placeholder="Type or paste text content here. You may also drop a custom text file..."
                            value={notesText}
                            onChange={(e) => setNotesText(e.target.value)}
                            className={`w-full text-xs font-sans min-h-[110px] bg-transparent border-0 focus:ring-0 focus:outline-none resize-none ${
                              isDark ? "text-slate-200 placeholder-slate-600" : "text-slate-800 placeholder-slate-400"
                            }`}
                          />
                          <div className="flex items-center justify-between border-t border-slate-700/20 pt-3">
                            <label className={`text-[10px] font-semibold cursor-pointer py-1 px-3 border rounded-lg transition-colors flex items-center space-x-1.5 ${
                              isDark ? "bg-[#252E2E]/40 border-[#323D3D]" : "bg-white/40 border-[#CDD2D2]"
                            }`}>
                              <FileUp className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Upload File</span>
                              <input type="file" onChange={handleFileUpload} accept=".txt,.json,.md,.html" className="hidden" />
                            </label>
                            <span className="text-[10px] opacity-40">Drag PDF/TXT notes direct</span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-xs font-semibold block">Subject Name</label>
                          <input
                            type="text"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            className={`w-full py-2.5 px-3 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                              isDark ? "bg-[#181D1D]/40 border-[#323D3D] text-white" : "bg-white/40 border-[#CDD2D2] text-[#232A2A]"
                            }`}
                            placeholder="e.g. World History"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs font-semibold block">Topics Description</label>
                          <input
                            type="text"
                            value={topics}
                            onChange={(e) => setTopics(e.target.value)}
                            className={`w-full py-2.5 px-3 border rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 ${
                              isDark ? "bg-[#181D1D]/40 border-[#323D3D] text-white" : "bg-white/40 border-[#CDD2D2] text-[#232A2A]"
                            }`}
                            placeholder="e.g. Roman Republic, Punic Wars"
                          />
                        </div>
                      </div>
                    )}

                    {/* Metadata attributes row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold block">Assessment Name</label>
                        <input
                          type="text"
                          value={assessmentName}
                          onChange={(e) => setAssessmentName(e.target.value)}
                          className={`w-full py-2 px-3 border rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none focus:border-indigo-500 ${
                            isDark ? "bg-[#181D1D]/40 border-[#323D3D] text-white" : "bg-white/40 border-[#CDD2D2]"
                          }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold block">Assigned Grade / Class</label>
                        <input
                          type="text"
                          value={classLevel}
                          onChange={(e) => setClassLevel(e.target.value)}
                          className={`w-full py-2 px-3 border rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none focus:border-indigo-500 ${
                            isDark ? "bg-[#181D1D]/40 border-[#323D3D] text-white" : "bg-white/40 border-[#CDD2D2]"
                          }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold block">Target Roll Number</label>
                        <input
                          type="text"
                          value={rollNumber}
                          onChange={(e) => setRollNumber(e.target.value)}
                          className={`w-full py-2 px-3 border rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none focus:border-indigo-500 ${
                            isDark ? "bg-[#181D1D]/40 border-[#323D3D] text-white" : "bg-white/40 border-[#CDD2D2]"
                          }`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      
                      <div className="space-y-1">
                        <label className="text-xs font-semibold block">Difficulty</label>
                        <select
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value as TestDifficulty)}
                          className={`w-full py-2 px-3 border rounded-xl text-xs focus:outline-none ${
                            isDark ? "bg-[#181D1D]/40 border-[#323D3D] text-white" : "bg-white/40 border-[#CDD2D2]"
                          }`}
                        >
                          <option value="Easy">Easy</option>
                          <option value="Medium">Medium</option>
                          <option value="Hard">Hard</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold block">Duration (Mins)</label>
                        <input
                          type="number"
                          value={duration}
                          min={5}
                          max={180}
                          onChange={(e) => setDuration(Math.max(5, Number(e.target.value)))}
                          className={`w-full py-2 px-3 border rounded-xl text-xs focus:outline-none ${
                            isDark ? "bg-[#181D1D]/40 border-[#323D3D] text-white" : "bg-white/40 border-[#CDD2D2]"
                          }`}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold block">Number of MCQs</label>
                        <input
                          type="number"
                          value={numMcqs}
                          min={1}
                          max={40}
                          onChange={(e) => setNumMcqs(Math.min(40, Math.max(1, Number(e.target.value))))}
                          className={`w-full py-2 px-3 border rounded-xl text-xs focus:outline-none ${
                            isDark ? "bg-[#181D1D]/40 border-[#323D3D] text-white" : "bg-white/40 border-[#CDD2D2]"
                          }`}
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold block">Supervisor PIN</label>
                        <input
                          type="text"
                          maxLength={8}
                          value={securityPin}
                          onChange={(e) => setSecurityPin(e.target.value.replace(/\D/g, ''))}
                          className={`w-full py-2 px-3 border rounded-xl text-xs font-mono focus:outline-none text-center ${
                            isDark ? "bg-[#181D1D]/40 border-[#323D3D] text-indigo-400" : "bg-white/40 border-[#CDD2D2] text-indigo-650 font-bold"
                          }`}
                        />
                      </div>

                    </div>

                    {excitation_errors_and_info()}

                    <button
                      type="submit"
                      disabled={isExtracting}
                      className={`w-full py-3.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer shadow-md flex items-center justify-center space-x-2 ${
                        isExtracting
                          ? "opacity-50 cursor-not-allowed text-white bg-indigo-550"
                          : isDark ? "bg-indigo-600 text-white hover:bg-indigo-500" : "bg-indigo-600 text-white hover:bg-indigo-700"
                      }`}
                    >
                      {isExtracting ? (
                        <>
                          <Clock className="w-4 h-4 animate-spin" />
                          <span>Generating Batch Questions (Gemini 3.5)...</span>
                        </>
                      ) : (
                        <span>Execute Question Compiler</span>
                      )}
                    </button>

                  </form>

                  {/* compilator preview ledger */}
                  <div className="lg:col-span-5 h-full flex flex-col justify-stretch">
                    {test_compiler_preview_card()}
                  </div>

                </div>

              </div>
                )}
              </motion.div>
            ) : currentView === "saved" ? (
              <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 180 }}
                className="w-full flex flex-col items-center font-sans"
              >
                {!currentUser ? (
                  renderLoginRequired(
                    "Assessments Library Gateway",
                    "Sign in with Google to retrieve all your saved prebuilt assessments, view access credentials, launch test portals, and check active supervisor PINs.",
                    "📚"
                  )
                ) : (
                  /* VIEW: SAVED PREBUILT TESTS */
                  <div className="space-y-6 max-w-5xl mx-auto w-full">
                
                {/* Header section */}
                <div className="flex items-center justify-between pb-4 border-b border-[#323D3D]/40">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setCurrentView("hub")}
                      className={`p-2 border rounded-xl hover:bg-slate-800 transition-colors cursor-pointer ${
                        isDark ? "bg-[#232B2B] border-[#323D3D]" : "bg-white border-[#CDD2D2]"
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h2 className="text-xl font-display font-bold">Saved Prebuilt Assessments</h2>
                      <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>Launch or copy parameters securely</p>
                    </div>
                  </div>
                  <div className="text-xs font-mono opacity-50 px-3 font-semibold">
                    Count: {savedTestsList.length} items
                  </div>
                </div>


                {/* Library list */}
                {isLoadingData ? (
                  <div className="py-12 text-center text-xs opacity-50 font-mono animate-pulse">
                    Retrieving synced assessments from cloud databases...
                  </div>
                ) : savedTestsList.length === 0 ? (
                  <div className={`border rounded-2xl p-12 text-center transition-all backdrop-blur-md ${
                    isDark ? "bg-[#111827]/10 border-slate-700/20 shadow-xs" : "bg-white/10 border-slate-200/35 shadow-xs"
                  }`}>
                    <Bookmark className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">Library is empty</h3>
                    <p className={`text-sm mt-1 mb-6 ${isDark ? "text-slate-550" : "text-slate-500"}`}>
                      Compile notes to generate educational test structures dynamically.
                    </p>
                    <button
                      onClick={() => setCurrentView("generate")}
                      className={`py-2 px-5 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                        isDark ? "bg-indigo-600 text-white hover:bg-indigo-500" : "bg-indigo-600 text-white hover:bg-indigo-700"
                      }`}
                    >
                      Go to Generate Portal
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {savedTestsList.map((test) => (
                      <div
                        key={test.id}
                        className={`border rounded-3xl p-6 relative transition-all duration-300 backdrop-blur-md ${
                          isDark 
                            ? "bg-[#111827]/10 border-slate-700/20 hover:bg-[#111827]/20" 
                            : "bg-white/10 border-slate-205/35 shadow-xs hover:shadow-md"
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded-md border ${
                              isDark ? "bg-indigo-950/40 text-indigo-400 border-indigo-900/30" : "bg-indigo-50 text-indigo-750 border-indigo-200"
                            }`}>
                              PIN Lock: {test.pin}
                            </span>
                            <h3 className="text-md font-display font-extrabold mt-2 leading-tight">{test.name}</h3>
                            <p className="text-xs text-slate-500 mt-1 font-mono">{test.subject} | {test.class}</p>
                          </div>

                          <button
                            onClick={() => deleteTestFromLibrary(test.id)}
                            className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                              isDark 
                                ? "bg-red-950/20 border-red-900/40 text-red-400 hover:bg-red-900/30" 
                                : "bg-red-50 border-red-100 text-red-650 hover:bg-red-100"
                            }`}
                            title="Delete configuration"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Middle grid attributes info */}
                        <div className={`grid grid-cols-12 gap-2 text-xs py-3.5 my-3 border-t border-b ${
                          isDark ? "border-[#323D3D]/50 text-slate-350" : "border-[#E0E5E5] text-slate-600"
                        }`}>
                          <div className="col-span-4 transition-transform">
                            <span className="text-[10px] block opacity-40">Questions</span>
                            <span className={`font-mono font-bold ${isDark ? "text-indigo-400" : "text-indigo-650"}`}>{test.questions.length} items</span>
                          </div>
                          <div className="col-span-4">
                            <span className="text-[10px] block opacity-40">Duration</span>
                            <span className="font-mono font-bold text-slate-200">{test.duration} mins</span>
                          </div>
                          <div className="col-span-4">
                            <span className="text-[10px] block opacity-40">Level</span>
                            <span className="font-mono font-bold text-slate-200">{test.difficulty}</span>
                          </div>
                        </div>

                        {/* Launcher Action Bar buttons */}
                        <div className="grid grid-cols-2 gap-3 pt-1">
                          <button
                            onClick={() => {
                              setActiveExam(test);
                              setStudentRoll(test.rollNumber || "");
                              setStudentName("");
                              setExamPinInput("");
                              setExamPinError(null);
                              setCurrentView("link");
                              audio.playClick();
                            }}
                            className={`py-2 px-3 border rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                              isDark ? "bg-indigo-500/10 hover:bg-indigo-500/20 border-indigo-500/30 text-indigo-400" : "bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                            }`}
                          >
                            <Play className="w-3.5 h-3.5 shrink-0" />
                            <span>Launch Test Panel</span>
                          </button>

                          <button
                            onClick={() => {
                              copyTestLink(test);
                              audio.playClick();
                            }}
                            className={`py-2 px-3 border rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                              isDark ? "bg-slate-900/30 hover:bg-slate-800 border-[#323D3D] text-slate-300" : "bg-white hover:bg-slate-50 border-[#CDD2D2] text-slate-700"
                            }`}
                          >
                            <Copy className="w-3.5 h-3.5 shrink-0" />
                            <span>{isCopied ? "Copied Link!" : "Copy Portal URL"}</span>
                          </button>
                        </div>

                      </div>
                    ))}
                  </div>
                )}

              </div>
                )}
              </motion.div>
            ) : currentView === "results" ? (
              <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 180 }}
                className="w-full flex flex-col items-center font-sans"
              >
                {!currentUser ? (
                  renderLoginRequired(
                    "Results Log Auditing Gateway",
                    "Sign in with Google to audit detailed student correct ratios, trace cheat report logs, track exam complete times, and securely manage results.",
                    "📊"
                  )
                ) : (
                  /* VIEW: RESULTS LEDGER */
                  <div className="space-y-6 max-w-6xl mx-auto w-full">
                  
                  {/* Back button shortcut */}
                  <div className="flex items-center space-x-3 pb-3 border-b border-[#323D3D]/40">
                    <button
                      onClick={() => setCurrentView("hub")}
                      className={`p-2 border rounded-xl hover:bg-slate-800 transition-colors cursor-pointer ${
                        isDark ? "bg-[#232B2B] border-[#323D3D]" : "bg-white border-[#CDD2D2]"
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <h2 className="text-xl font-display font-bold">Results Log Audits</h2>
                      <p className={`text-xs ${isDark ? "text-slate-400" : "text-slate-600"}`}>Synchronized history mapped to Google profile</p>
                    </div>
                  </div>


                  {isLoadingData ? (
                    <div className="py-12 text-center text-xs opacity-50 font-mono animate-pulse">
                      Retrieving synced evaluations files from Firestore...
                    </div>
                  ) : (
                    <ResultsLedger
                      results={resultsList}
                      onClear={clearAllAuditLedger}
                      theme={theme}
                    />
                  )}

                </div>
                )}
              </motion.div>
            ) : (
              
              /* VIEW: LAUNCH VIA INVITATION LINK (STUDENT PRE-ENROLL VIEW) */
              <motion.div
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 180 }}
                className="max-w-xl mx-auto w-full space-y-6"
              >
                
                {/* Section Header */}
                <div className="flex items-center space-x-3 pb-4 border-b border-[#323D3D]/45">
                  <button
                    onClick={() => setCurrentView("hub")}
                    className={`p-2 border rounded-xl hover:bg-slate-850 transition-colors cursor-pointer ${
                      isDark ? "bg-[#232B2B] border-[#323D3D]" : "bg-white border-[#CDD2D2]"
                    }`}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="text-lg font-display font-semibold">Join Interactive Exam Mode</h2>
                    <p className="text-xs text-slate-500">Secure proctored testing workspace</p>
                  </div>
                </div>


                {/* Switch views internally based on active exam targets selection */}
                {!activeExam ? (
                  <form onSubmit={handleLaunchPastedLink} className={`rounded-3xl border p-6 space-y-5 transition-all duration-300 backdrop-blur-md ${
                    isDark ? "bg-[#111827]/10 border-slate-700/20 shadow-lg" : "bg-white/10 border-slate-205/35 shadow-xs"
                  }`}>
                    <div className="space-y-2">
                       <label className="text-xs font-semibold block">Paste invitation URL or base64 token</label>
                      <input
                        type="text"
                        placeholder="http://localhost:3000/?testData=eyJuYW1lIjoiUXVh..."
                        value={pastedLink}
                        onChange={(e) => setPastedLink(e.target.value)}
                        className={`w-full py-3 px-4 border rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:outline-none focus:border-indigo-500 ${
                          isDark ? "bg-[#181D1D]/40 border-[#323D3D] text-white placeholder-slate-600" : "bg-white/40 border-slate-300 text-slate-900 placeholder-slate-400"
                        }`}
                      />
                    </div>

                    {linkError && (
                      <p className="text-xs text-red-500 font-medium p-3 rounded-lg bg-red-50 border border-red-100">
                        {linkError}
                      </p>
                    )}

                    <button
                      type="submit"
                      className={`w-full py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-wide cursor-pointer transition-all shadow-md ${
                        isDark ? "bg-indigo-600 text-white hover:bg-indigo-500" : "bg-indigo-600 text-white hover:bg-indigo-700"
                      }`}
                    >
                      Authenticate invitation Payload
                    </button>
                  </form>
                ) : (
                  /* Student details collection & Supervisor PIN blocker */
                  <form onSubmit={startExamVerification} className={`rounded-3xl border p-6 space-y-5 transition-all duration-300 backdrop-blur-md ${
                    isDark ? "bg-[#111827]/10 border-slate-700/20 shadow-sm" : "bg-white/10 border-slate-205/35 shadow-sm"
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:space-x-3.5 pb-4 border-b border-dashed border-slate-700/30">
                      <div className="flex items-center space-x-3.5 flex-1">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold border shrink-0 ${
                          isDark ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/15" : "bg-indigo-50 text-indigo-750"
                        }`}>
                          ✍️
                        </div>
                        <div className="overflow-hidden">
                          <span className="text-[9px] uppercase font-mono text-indigo-400 font-bold block">Assigned Assessment</span>
                          <h4 className="text-sm font-semibold truncate leading-tight">{activeExam.name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono tracking-tight block mt-0.5">{activeExam.subject} ({activeExam.questions.length} MCQs)</span>
                        </div>
                      </div>
                      
                      {/* Paste clear/back action to paste totally manually if preferred */}
                      <button
                        type="button"
                        onClick={() => {
                          setActiveExam(null);
                          audio.playClick();
                        }}
                        className="mt-3 sm:mt-0 px-3 py-1.5 rounded-xl text-[10px] font-bold border border-rose-500/20 hover:bg-rose-500/10 text-rose-500 transition-colors shrink-0 cursor-pointer text-center"
                      >
                        Reset / Paste Another
                      </button>
                    </div>

                    {/* Integrated Place to paste another link right in the active exam screen */}
                    <div className={`p-4 border rounded-2xl space-y-2.5 transition-all ${
                      isDark ? "bg-[#181D1D]/70 border-slate-750/50" : "bg-slate-50/70 border-slate-200"
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-indigo-400 dark:text-indigo-400 flex items-center gap-1.5">
                          🔗 Paste new invitation link or token below
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Paste search URL copy or code payload..."
                          value={pastedLink}
                          onChange={(e) => setPastedLink(e.target.value)}
                          className={`flex-1 py-1.5 px-3 border rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:outline-none focus:border-indigo-500 ${
                            isDark ? "bg-[#111313] border-[#323D3D] text-white placeholder-slate-650" : "bg-white border-slate-300 text-slate-900 placeholder-slate-400"
                          }`}
                        />
                        <button
                          type="button"
                          onClick={async (e) => {
                            e.preventDefault();
                            await handleLaunchPastedLink({ preventDefault: () => {} } as any);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                            isDark ? "bg-indigo-600 hover:bg-indigo-500 text-white" : "bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                          }`}
                        >
                          Load
                        </button>
                      </div>
                      {linkError && (
                        <p className="text-[10px] text-red-500 leading-tight font-medium">
                          {linkError}
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold block">Student Candidate Name</label>
                        <input
                          type="text"
                          required
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          placeholder="Dr. John Watson"
                          className={`w-full py-2.5 px-3 border rounded-xl text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none focus:border-indigo-500 ${
                            isDark ? "bg-[#181D1D]/45 border-[#323D3D] text-white" : "bg-white/40 border-[#CDD2D2] text-[#232A2A]"
                          }`}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-semibold block">Student Roll ID Number</label>
                        <input
                          type="text"
                          required
                          value={studentRoll}
                          onChange={(e) => setStudentRoll(e.target.value)}
                          placeholder="e.g. 10920"
                          className={`w-full py-2.5 px-3 border rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-500/20 focus:outline-none focus:border-indigo-500 ${
                            isDark ? "bg-[#181D1D]/45 border-[#323D3D] text-white" : "bg-white/40 border-[#CDD2D2] text-[#232A2A]"
                          }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <label className="text-xs font-semibold block">8-Digit Security Access PIN (Proctor PIN)</label>
                      <input
                        type="password"
                        placeholder="••••••••"
                        maxLength={8}
                        value={examPinInput}
                        onChange={(e) => setExamPinInput(e.target.value.replace(/\D/g, ''))}
                        className={`w-full text-center py-2 px-3 border rounded-xl font-mono text-lg tracking-[0.5em] font-bold focus:ring-2 focus:ring-indigo-500/20 focus:outline-none focus:border-indigo-500 ${
                          isDark ? "bg-[#181D1D]/45 border-[#323D3D] text-indigo-400" : "bg-white/40 border-[#CDD2D2] text-indigo-650 font-bold"
                        }`}
                        required
                      />
                    </div>

                    {examPinError && (
                      <p className="text-xs text-red-500 font-medium p-3 rounded-lg bg-red-50 border border-red-100">
                        {examPinError}
                      </p>
                    )}

                    <div className={`text-[10px] p-3 border rounded-xl leading-relaxed flex items-start space-x-2.5 ${
                      isDark ? "bg-[#1C1616]/70 border-red-950/40 text-slate-350" : "bg-red-50/50 border-red-200 text-red-800"
                    }`}>
                      <Info className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      <span>Warning: Starting the assessment activates the anti-cheat system. Do NOT close, resize, switch tabs, or lose window focus, or the enforcer locks state automatically.</span>
                    </div>

                    <button
                      type="submit"
                      className={`w-full py-3.5 rounded-xl text-xs font-extrabold uppercase tracking-widest cursor-pointer transition-all shadow-md ${
                        isDark ? "bg-indigo-600 text-white hover:bg-indigo-500" : "bg-indigo-600 text-white hover:bg-indigo-700"
                      }`}
                    >
                      Unlock Portal &amp; Begin Lock Exam
                    </button>
                  </form>
                )}

              </motion.div>
            )}
            </AnimatePresence>

          </main>

        </div>
      )}

      {/* FLOATING CALCULATOR MODAL COMPONENT */}
      {showCalculator && (
        <FloatingCalculator
          onBackdoorTriggered={triggerBackdoorBypass}
          onClose={() => setShowCalculator(false)}
        />
      )}

      {/* PREMIUM CUSTOM CONFIRMATION DIALOG MODAL */}
      <AnimatePresence>
        {confirmDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDialog(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer"
            />
            
            {/* Box modal */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              transition={{ type: "spring", duration: 0.3 }}
              className={`relative max-w-md w-full rounded-2xl border p-6 shadow-2xl z-50 text-left ${
                isDark 
                  ? "bg-[#181D1D] border-[#323D3D] text-slate-100" 
                  : "bg-white border-slate-200 text-[#0F172A]"
              }`}
            >
              <div className="flex items-start space-x-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                  isDark 
                    ? "bg-[#2D1D1D] text-red-400 border-red-900/30" 
                    : "bg-red-50 text-red-600 border-red-200"
                }`}>
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-md sm:text-lg font-display font-bold tracking-tight">
                    {confirmDialog.title}
                  </h3>
                  <p className={`text-xs mt-2 leading-relaxed ${
                    isDark ? "text-slate-400" : "text-slate-600"
                  }`}>
                    {confirmDialog.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 mt-6 border-t border-slate-705/10 pt-4">
                <button
                  type="button"
                  onClick={() => setConfirmDialog(null)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border cursor-pointer transition-colors ${
                    isDark 
                      ? "bg-[#232B2B] border-[#323D3D] text-slate-300 hover:bg-[#2C3636]" 
                      : "bg-[#F3F5F5] border-slate-200 text-slate-700 hover:bg-[#EAECEE]"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDialog.onConfirm}
                  className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer text-white shadow-xs bg-indigo-600 hover:bg-indigo-700 transition-colors"
                >
                  {confirmDialog.confirmText}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );

  // Modular helper preview cards for clean and robust layouts
  function test_compiler_preview_card() {
    if (!createdTest) {
      return (
        <div className={`flex-1 rounded-2xl border p-8 flex flex-col items-center justify-center text-center transition-all ${
          isDark ? "bg-[#232B2B]/40 border-[#323D3D]/60" : "bg-white border-[#E0E5E5] shadow-xs"
        }`}>
          <Database className="w-10 h-10 text-slate-500 opacity-55 mb-4 animate-pulse" />
          <p className="text-sm font-semibold text-slate-400">No Assessment Loaded</p>
          <p className={`text-xs mt-1 leading-relaxed max-w-[240px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
            Configure variables and press compile. Completed tests are displayed here instantly for auditing.
          </p>
        </div>
      );
    }

    const firstQuestion = createdTest.questions[0];

    return (
      <div className={`flex-1 rounded-2xl border p-6 flex flex-col justify-between space-y-6 transition-all duration-300 backdrop-blur-md shadow-sm ${
        isDark ? "bg-[#111827]/40 border-[#2C3636]/60" : "bg-white/45 border-[#D6DBDB]/80"
      }`}>
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-slate-705/30">
            <span className="text-xs font-display font-black text-indigo-500 uppercase tracking-wider">COMPILER VERIFIED</span>
            <span className="text-[10px] font-mono text-slate-500">{createdTest.id}</span>
          </div>

          <div className="space-y-2">
            <h4 className="text-sm font-display font-bold leading-tight">{createdTest.name}</h4>
            <p className="text-xs text-slate-505 font-mono">{createdTest.subject} (class: {createdTest.class})</p>
          </div>

          {/* Render Sample preview item */}
          {firstQuestion && (
            <div className={`p-4 border rounded-xl text-xs space-y-3 ${
              isDark ? "bg-[#181D1D]/35 border-[#323D3D]" : "bg-white/30 border-slate-200"
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-mono font-bold uppercase opacity-55">SAMPLE ASSIGNED PREVIEW</span>
                <span className="text-[9px] font-mono bg-emerald-900/30 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-800/10">Index 0</span>
              </div>
              <p className="font-semibold leading-relaxed">{firstQuestion.question}</p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                {firstQuestion.options.map((opt, idx) => (
                  <div key={idx} className={`p-1.5 rounded truncate ${
                    idx === firstQuestion.correctIndex 
                      ? isDark ? "bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 font-bold" : "bg-emerald-50 text-emerald-700 font-bold border border-emerald-100"
                      : isDark ? "bg-slate-900/40 text-slate-400" : "bg-white text-slate-500 border border-slate-100"
                  }`}>
                    {idx + 1}. {opt}
                  </div>
                ))}
              </div>
              <div className="text-[10px] opacity-60 leading-relaxed border-t border-slate-750/30 pt-2 flex items-start space-x-1">
                <span>💡</span>
                <span className="italic">{firstQuestion.explanation}</span>
              </div>
            </div>
          )}
        </div>

        {/* Action controllers */}
        <div className="space-y-2.5 pt-3">
          {isSavedNotify && (
            <div className="text-xs bg-emerald-950/40 text-emerald-400 border border-emerald-900/30 px-3 py-2 rounded-lg text-center font-medium">
              Success: Saved dynamically to Cloud profile!
            </div>
          )}

          <button
            onClick={() => copyTestLink(createdTest)}
            className={`w-full py-2.5 px-3 border rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
              isCopied 
                ? "bg-emerald-950/40 border-emerald-800/20 text-emerald-450 font-black animate-pulse" 
                : isDark ? "bg-[#1E2525] border-teal-900/40 text-teal-400 hover:bg-[#2C3636]" : "bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-800"
            }`}
          >
            <Copy className="w-3.5 h-3.5 text-teal shadow-xs" />
            <span>{isCopied ? "Portal Link Copied Cleanly!" : "Copy Shareable Test Link"}</span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={saveCreatedTestToLibrary}
              className={`py-2 px-3 border rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                isDark ? "bg-[#181D1D] border-[#323D3D] text-indigo-400 hover:bg-[#323D3D]" : "bg-slate-900 text-white hover:bg-slate-800"
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save to cloud</span>
            </button>
            <button
              onClick={() => {
                setActiveExam(createdTest);
                setStudentRoll(createdTest.rollNumber || "");
                setStudentName("");
                setExamPinInput("");
                setExamPinError(null);
                setCurrentView("link");
              }}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                isDark ? "bg-indigo-600 text-white hover:bg-indigo-500" : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Begin Lock Exam</span>
            </button>
          </div>
        </div>

      </div>
    );
  }

  function excitation_errors_and_info() {
    if (extractionError) {
      return (
        <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 rounded-xl text-xs leading-relaxed flex items-start space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <span>{extractionError}</span>
        </div>
      );
    }
    return (
      <div className={`p-3 border rounded-xl text-xs leading-relaxed flex items-start space-x-2.5 ${
        isDark ? "bg-[#1C2424] border-[#323D3D] text-slate-400" : "bg-emerald-50/20 border-emerald-250/30 text-slate-650"
      }`}>
        <Info className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
        <span>Instruction: Press Generate to draft compiling batches. Large questions sets are built in parallel to guarantee zero-time timeouts. Saved configurations can be re-accessed with full student scoring.</span>
      </div>
    );
  }

}
