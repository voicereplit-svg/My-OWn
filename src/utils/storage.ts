import { TestConfig, StudentResult } from "../types";

const SAVED_TESTS_KEY = "secure_mcq_saved_tests";
const RESULTS_KEY = "secure_mcq_results";

export function getSavedTests(): TestConfig[] {
  try {
    const data = localStorage.getItem(SAVED_TESTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to parse saved tests", error);
    return [];
  }
}

export function saveTest(test: TestConfig): void {
  try {
    const tests = getSavedTests();
    // Prevent duplicate saves
    if (!tests.some(t => t.id === test.id)) {
      tests.unshift(test); // Add to the beginning
      localStorage.setItem(SAVED_TESTS_KEY, JSON.stringify(tests));
    }
  } catch (error) {
    console.error("Failed to save test", error);
  }
}

export function deleteSavedTest(testId: string): void {
  try {
    const tests = getSavedTests();
    const updated = tests.filter(t => t.id !== testId);
    localStorage.setItem(SAVED_TESTS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Failed to delete test", error);
  }
}

export function getResults(): StudentResult[] {
  try {
    const data = localStorage.getItem(RESULTS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error("Failed to parse results", error);
    return [];
  }
}

export function saveResult(result: StudentResult): void {
  try {
    const results = getResults();
    results.unshift(result); // Newer results first
    localStorage.setItem(RESULTS_KEY, JSON.stringify(results));
  } catch (error) {
    console.error("Failed to save result", error);
  }
}

export function clearAllResults(): void {
  try {
    localStorage.removeItem(RESULTS_KEY);
  } catch (error) {
    console.error("Failed to clear results", error);
  }
}
