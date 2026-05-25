import React, { useState } from "react";
import { StudentResult } from "../types";
import { Search, ShieldAlert, ShieldCheck, Clock, Trash2, ChevronDown, ChevronUp, FileText, User } from "lucide-react";

interface ResultsLedgerProps {
  results: StudentResult[];
  onClear: () => void;
  theme: "light" | "dark";
}

export default function ResultsLedger({ results, onClear, theme }: ResultsLedgerProps) {
  const [searchRoll, setSearchRoll] = useState<string>("");
  const [expandedResultId, setExpandedResultId] = useState<string | null>(null);

  const filteredResults = results.filter(r =>
    r.studentRoll.toLowerCase().includes(searchRoll.toLowerCase().trim()) ||
    r.studentName.toLowerCase().includes(searchRoll.toLowerCase().trim()) ||
    r.testName.toLowerCase().includes(searchRoll.toLowerCase().trim())
  );

  const toggleExpand = (id: string) => {
    setExpandedResultId(expandedResultId === id ? null : id);
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const isDark = theme === "dark";

  return (
    <div id="results-ledger-container" className="max-w-6xl mx-auto space-y-6">
      {/* Header section with Stats & Search */}
      <div className={`backdrop-blur-md rounded-2xl p-6 border transition-all duration-300 ${
        isDark 
          ? "bg-[#111827]/10 border-[#1F2937]/35 shadow-lg" 
          : "bg-white/10 border-[#E2E8F0]/40 shadow-sm"
      } flex flex-col md:flex-row gap-6 md:items-center justify-between`}>
        <div>
          <h2 className={`text-xl font-display font-semibold ${isDark ? "text-slate-100" : "text-[#1A1F1F]"}`}>
            Student Results Ledger
          </h2>
          <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
            Audit and search detailed student performance reviews including security logs.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          {/* Search bar */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${isDark ? "text-slate-400" : "text-slate-500"}`} />
            <input
              type="text"
              placeholder="Search roll, name, or test..."
              value={searchRoll}
              onChange={(e) => setSearchRoll(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-xl text-sm transition-all focus:outline-none focus:ring-2 ${
                isDark 
                  ? "bg-[#0B0F19] border-[#1F2937] text-slate-100 placeholder-slate-500 focus:ring-indigo-500/30 focus:border-indigo-500" 
                  : "bg-[#F1F5F9] border-[#E2E8F0] text-[#1A1F1F] placeholder-slate-400 focus:ring-indigo-500/20 focus:border-indigo-500"
              }`}
            />
          </div>

          {results.length > 0 && (
            <button
              onClick={onClear}
              className={`px-4 py-2 border rounded-xl transition-all flex items-center justify-center space-x-2 text-sm cursor-pointer font-medium ${
                isDark 
                  ? "bg-red-950/20 hover:bg-red-900/30 border-red-900/40 hover:border-red-650 text-red-400" 
                  : "bg-red-50 hover:bg-red-100 border-red-200 hover:border-red-300 text-red-600 shadow-xs"
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear Ledger</span>
            </button>
          )}
        </div>
      </div>

      {filteredResults.length === 0 ? (
        <div className={`border rounded-2xl p-12 text-center transition-all backdrop-blur-md ${
          isDark ? "bg-[#111827]/10 border-[#1F2937]/35" : "bg-white/10 border-[#E2E8F0]/35 shadow-xs"
        }`}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
            isDark ? "bg-[#0B0F19]/60" : "bg-slate-100/50"
          }`}>
            <User className={`w-6 h-6 ${isDark ? "text-slate-400" : "text-slate-550"}`} />
          </div>
          <h3 className={`text-lg font-display font-medium ${isDark ? "text-slate-300" : "text-[#232A2A]"}`}>No results found</h3>
          <p className={`text-sm mt-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {searchRoll ? "No completions match that query." : "Student completions will be loaded securely once tests are submitted."}
          </p>
        </div>
      ) : (
        <div className={`border rounded-2xl overflow-hidden transition-all duration-300 backdrop-blur-md ${
          isDark ? "bg-[#111827]/10 border-[#1F2937]/30 shadow-xl" : "bg-white/10 border-[#E2E8F0]/35 shadow-md"
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={`border-b text-xs font-display font-semibold tracking-wider ${
                  isDark ? "border-[#1F2937]/45 bg-[#111827]/25 text-slate-400" : "border-[#E2E8F0]/70 bg-[#F8FAFC]/30 text-slate-600"
                }`}>
                  <th className="px-6 py-4">Student</th>
                  <th className="px-6 py-4 font-mono">Roll Number</th>
                  <th className="px-6 py-4">Test Name / Subject</th>
                  <th className="px-6 py-4 text-center">Score</th>
                  <th className="px-6 py-4 text-center">Time Used</th>
                  <th className="px-6 py-4">Security Status</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-sm ${isDark ? "divide-[#1F2937]/50" : "divide-[#E2E8F0]"}`}>
                {filteredResults.map((result) => {
                  const percentage = Math.round((result.score / result.totalQuestions) * 100) || 0;
                  const isExpanded = expandedResultId === result.id;
                  
                  return (
                    <React.Fragment key={result.id}>
                      <tr className={`transition-all ${
                        isExpanded 
                          ? isDark ? "bg-[#1F2937]/25" : "bg-slate-100/30"
                          : isDark ? "hover:bg-[#1F2937]/15" : "hover:bg-slate-100/15"
                      }`}>
                        <td className={`px-6 py-4 font-medium ${isDark ? "text-slate-200" : "text-slate-850"}`}>
                          {result.studentName}
                        </td>
                        <td className={`px-6 py-4 font-mono text-xs font-semibold ${isDark ? "text-indigo-400" : "text-indigo-650"}`}>
                          {result.studentRoll}
                        </td>
                        <td className="px-6 py-4">
                          <div className={`font-medium truncate max-w-[200px] ${isDark ? "text-slate-200" : "text-slate-700"}`}>
                            {result.testName}
                          </div>
                          <div className={`text-xs ${isDark ? "text-slate-450" : "text-slate-500"}`}>{result.subject}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <div className={`font-mono font-bold ${isDark ? "text-slate-200" : "text-slate-800"}`}>
                            {result.score} / {result.totalQuestions}
                          </div>
                          <div className={`text-xs font-semibold mt-0.5 ${isDark ? "text-indigo-400" : "text-indigo-600"}`}>{percentage}%</div>
                        </td>
                        <td className="px-6 py-4 text-center font-mono text-xs">
                          <div className={`flex items-center justify-center space-x-1 ${isDark ? "text-slate-300" : "text-slate-600"}`}>
                            <Clock className="w-3.5 h-3.5 opacity-70" />
                            <span>{formatDuration(result.durationTaken)}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {result.cheated ? (
                            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              isDark 
                                ? "bg-red-950/45 text-red-400 border border-red-900/30" 
                                : "bg-red-50 text-red-600 border border-red-100"
                            }`}>
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>Violation Reported</span>
                            </span>
                          ) : (
                            <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              isDark 
                                ? "bg-emerald-950/45 text-emerald-400 border border-emerald-900/30" 
                                : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                            }`}>
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Completed Securely</span>
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => toggleExpand(result.id)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              isDark ? "text-slate-400 hover:text-white hover:bg-slate-850" : "text-slate-500 hover:text-[#1A1F1F] hover:bg-[#F0F3F3]"
                            }`}
                          >
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </td>
                      </tr>

                      {/* Expandable details (Anti-cheat audit timeline) */}
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className={`px-8 py-5 border-t border-b transition-all duration-300 ${
                            isDark ? "bg-slate-950/25 border-[#1F2937]/45" : "bg-white/20 border-[#E2E8F0]/60"
                          }`}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                              <div>
                                <h4 className={`text-xs font-display font-semibold uppercase tracking-widest flex items-center space-x-2 ${
                                  isDark ? "text-slate-400" : "text-slate-500"
                                }`}>
                                  <FileText className="w-4 h-4" />
                                  <span>Secure Test Ledger Audit</span>
                                </h4>
                                <div className="mt-3 space-y-2 text-xs">
                                  <div className={`flex justify-between py-1 border-b ${isDark ? "border-[#1F2937]" : "border-[#E2E8F0]"}`}>
                                    <span className={isDark ? "text-slate-500" : "text-slate-400"}>Completed On</span>
                                    <span className={`font-mono ${isDark ? "text-slate-300" : "text-slate-700"}`}>
                                      {new Date(result.completedAt).toLocaleString()}
                                    </span>
                                  </div>
                                  <div className={`flex justify-between py-1 border-b ${isDark ? "border-[#1F2937]" : "border-[#E2E8F0]"}`}>
                                    <span className={isDark ? "text-slate-500" : "text-slate-400"}>Security Verdict</span>
                                    <span className={result.cheated ? "text-red-500 font-bold" : "text-emerald-600 font-bold"}>
                                      {result.cheated ? "Suspicious Attempt (Enforcer Lockout)" : "Zero Incidents - 100% Secure Flow"}
                                    </span>
                                  </div>
                                  <div className={`flex justify-between py-1 border-b ${isDark ? "border-[#1F2937]" : "border-[#E2E8F0]"}`}>
                                    <span className={isDark ? "text-slate-500" : "text-slate-400"}>Test Identifier</span>
                                    <span className={`font-mono text-[10px] sm:text-xs select-all ${isDark ? "text-slate-400" : "text-slate-600"}`}>
                                      {result.testId}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div>
                                <h4 className={`text-xs font-display font-semibold uppercase tracking-widest flex items-center space-x-2 ${
                                  isDark ? "text-slate-400" : "text-slate-500"
                                }`}>
                                  <ShieldAlert className={`w-4 h-4 ${isDark ? "text-indigo-400" : "text-indigo-600"}`} />
                                  <span>Integrity &amp; Anti-Cheat Security Logs</span>
                                </h4>
                                <div className={`mt-3 p-4 border rounded-xl max-h-44 overflow-y-auto font-mono text-[11px] space-y-1.5 focus:outline-none ${
                                  isDark ? "bg-[#0B0F19] border-[#1F2937]" : "bg-[#F8FAFC] border-[#E2E8F0]"
                                }`}>
                                  {result.securityLogs && result.securityLogs.length > 0 ? (
                                    result.securityLogs.map((log, index) => {
                                      const isViolation = log.toLowerCase().includes("violation") || log.toLowerCase().includes("cheat") || log.toLowerCase().includes("lock");
                                      const isBypass = log.toLowerCase().includes("bypass") || log.toLowerCase().includes("deactivate") || log.toLowerCase().includes("override");
                                      
                                      let textColor = isDark ? "text-slate-400" : "text-slate-600";
                                      if (isViolation) textColor = "text-red-500 font-medium";
                                      if (isBypass) textColor = isDark ? "text-indigo-400" : "text-indigo-600";
                                      if (log.toLowerCase().includes("unlock") || log.toLowerCase().includes("start")) {
                                        textColor = isDark ? "text-emerald-400 font-medium" : "text-emerald-600 font-medium";
                                      }

                                      return (
                                        <div key={index} className={`flex items-start space-x-1.5 ${textColor}`}>
                                          <span className="opacity-55">[{index + 1}]</span>
                                          <span className="break-all">{log}</span>
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="text-emerald-600 text-xs italic flex items-center space-x-1 py-1">
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      <span>Perfect session: No context switches, copy pastes, or mouse departures detected.</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
