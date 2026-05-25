export interface MCQQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export type TestDifficulty = "Easy" | "Medium" | "Hard";

export interface TestConfig {
  id: string;
  name: string;
  class: string;
  subject: string;
  topics: string;
  rollNumber: string; // The roll number assigned at creation, or default roll number
  difficulty: TestDifficulty;
  duration: number; // in minutes
  numMcqs: number;
  pin: string; // 8-digit PIN
  sourceType: "notes" | "topic";
  notesContent?: string;
  questions: MCQQuestion[];
  createdAt: string;
  ownerUid?: string;
}

export interface StudentResult {
  id: string;
  testId: string;
  testName: string;
  subject: string;
  studentRoll: string;
  studentName: string;
  score: number;
  totalQuestions: number;
  durationTaken: number; // in seconds
  completedAt: string;
  cheated: boolean; // Flag to indicate if cheating occurred and resulted in lock, or flag log
  securityLogs: string[]; // List of events logged by the anti-cheat system
  ownerUid?: string;
}
