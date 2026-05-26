import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, User } from "firebase/auth";
import { 
  initializeFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  collection, 
  getDocs, 
  query, 
  where,
  getDocFromServer
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { MCQQuestion, TestConfig, StudentResult } from "../types";

// Operation types for custom Firestore error handling
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

// Check if Firebase is realistically configured
export function isFirebaseConfigured(): boolean {
  return !!(firebaseConfig && firebaseConfig.apiKey && firebaseConfig.apiKey.length > 5);
}

/**
 * Recursively removes any keys with `undefined` values from an object or array.
 * Firestore does not support `undefined` values and throws errors on setDoc/updateDoc.
 */
function removeUndefined<T>(obj: T): T {
  if (obj === undefined) {
    return null as any;
  }
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefined(item)) as any;
  }
  const result: any = {};
  for (const key of Object.keys(obj as any)) {
    const val = (obj as any)[key];
    if (val !== undefined) {
      result[key] = removeUndefined(val);
    }
  }
  return result;
}

// Initializing real Firebase if configured
let app;
let db: any = null;
let auth: any = null;

if (isFirebaseConfigured()) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
    }, firebaseConfig.firestoreDatabaseId);
    auth = getAuth(app);
  } catch (error) {
    console.error("Failed to initialize Firebase applet connection:", error);
  }
}

// Connection test helper
async function testFirebaseConnection() {
  if (!db) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration or network status.");
    }
  }
}

// Execute connection test
if (isFirebaseConfigured()) {
  testFirebaseConnection().catch(() => {});
}

// Custom error reporter matching skill specification
function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const currentAuthUser = auth?.currentUser;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentAuthUser?.uid || null,
      email: currentAuthUser?.email || null,
      emailVerified: currentAuthUser?.emailVerified || null,
      isAnonymous: currentAuthUser?.isAnonymous || null,
      tenantId: currentAuthUser?.tenantId || null,
      providerInfo: currentAuthUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error Response: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Unified Local / Cloud Sync User type
export interface ActiveUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

// Memory listener for auth changes
type HookCallback = (user: ActiveUser | null) => void;
const listeners = new Set<HookCallback>();
let cachedAuthUser: ActiveUser | null = null;

// Initialize cached identity from LocalStorage if offline/session is persistent
const LOCAL_SESSION_KEY = "assess_gauth_user";
try {
  const localVal = localStorage.getItem(LOCAL_SESSION_KEY);
  if (localVal) {
    cachedAuthUser = JSON.parse(localVal);
  }
} catch (e) {
  console.error("Failed reading browser persisted identity", e);
}

// Coordinate real Firebase auth listeners if online, fallback to custom
if (auth) {
  auth.onAuthStateChanged(async (firebaseUser: User | null) => {
    if (firebaseUser) {
      cachedAuthUser = {
        uid: firebaseUser.uid,
        email: firebaseUser.email || "unknown@gmail.com",
        displayName: firebaseUser.displayName || "Educator Portal",
        photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.uid}`
      };
      // Backup to local list for snappy UI rendering
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(cachedAuthUser));

      // Auto provision/update user profile in firestore
      try {
        const udoc = doc(db, "users", firebaseUser.uid);
        await setDoc(udoc, {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || "Educator Portal",
          photoURL: firebaseUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${firebaseUser.uid}`,
          createdAt: new Date().toISOString()
        }, { merge: true });
      } catch (err) {
        console.warn("Unable to write user profile doc securely", err);
      }
    } else {
      cachedAuthUser = null;
      localStorage.removeItem(LOCAL_SESSION_KEY);
    }
    listeners.forEach(cb => cb(cachedAuthUser));
  });
}

export function onUserAuthStateChanged(callback: HookCallback) {
  listeners.add(callback);
  // Immediate trigger
  callback(cachedAuthUser);
  return () => {
    listeners.delete(callback);
  };
}

// Google Authentication signin triggered from top bar
let activeAuthPromise: Promise<ActiveUser> | null = null;

export async function authenticateWithGoogle(): Promise<ActiveUser> {
  if (activeAuthPromise) {
    console.log("Reusing active authentication popup promise to avoid duplicate request cancel errors.");
    return activeAuthPromise;
  }

  if (auth && isFirebaseConfigured()) {
    activeAuthPromise = (async () => {
      try {
        const provider = new GoogleAuthProvider();
        // Enforce choosing accounts explicitly so they login with their correct actual Google Account
        provider.setCustomParameters({
          prompt: "select_account"
        });
        const res = await signInWithPopup(auth, provider);
        const user = res.user;
        const active: ActiveUser = {
          uid: user.uid,
          email: user.email || "",
          displayName: user.displayName || "Educator Coordinator",
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`
        };
        cachedAuthUser = active;
        localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(active));
        listeners.forEach(cb => cb(active));
        return active;
      } catch (e: any) {
        console.error("Google Web Pop Auth Failed", e);
        throw e;
      } finally {
        activeAuthPromise = null;
      }
    })();
    return activeAuthPromise;
  } else {
    throw new Error("Firebase Authentication is not currently initialized in this environment. Please ensure setup completes successfully.");
  }
}

export function loginMockUser(email: string, displayName: string): ActiveUser {
  throw new Error("Direct mock login is no longer supported to enforce real Google Identity Verification.");
}

export async function logOutUser(): Promise<void> {
  if (auth && isFirebaseConfigured()) {
    await signOut(auth);
  }
  cachedAuthUser = null;
  localStorage.removeItem(LOCAL_SESSION_KEY);
  listeners.forEach(cb => cb(null));
}

// --- Cloud Data Actions with complete fallback to email-partitioned LocalStorage ---

// Helper to partition local storage per registered email for realistic multiplayer-like multi-device sandbox sync
function getEmailStorageKey(category: string): string {
  const email = cachedAuthUser?.email || "anonymous";
  return `mcq_portal_${category}_${email}`;
}

export async function fetchTestsCloud(): Promise<TestConfig[]> {
  const currentUser = cachedAuthUser;
  if (!currentUser) return [];

  const localKey = getEmailStorageKey("tests");
  
  // 1. Load local cache
  let localTests: TestConfig[] = [];
  try {
    const saved = localStorage.getItem(localKey);
    if (saved) {
      localTests = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed loading local tests cache:", e);
  }

  // 2. Also check if there are any anonymous/guest tests in localStorage to import/backup
  const anonymousKey = `mcq_portal_tests_anonymous`;
  try {
    const anonSaved = localStorage.getItem(anonymousKey);
    if (anonSaved) {
      const anonTests = JSON.parse(anonSaved) as TestConfig[];
      if (anonTests.length > 0) {
        console.log("Found guest/anonymous tests, backing them up to user profile...", anonTests);
        // Migrate their ownership to the signed-in user
        for (const t of anonTests) {
          const migratedTest = {
            ...t,
            ownerUid: currentUser.uid,
            ownerEmail: currentUser.email
          };
          // Add to local list if not already there
          if (!localTests.some(l => l.id === migratedTest.id)) {
            localTests.unshift(migratedTest);
          }
          // Also save/upload to cloud in the background
          if (db && isFirebaseConfigured()) {
            setDoc(doc(db, "tests", migratedTest.id), removeUndefined(migratedTest)).catch(err => {
              console.warn("Background guest test backup error:", err);
            });
          }
        }
        // Save merged local tests
        localStorage.setItem(localKey, JSON.stringify(localTests));
        // Clear anonymous/guest storage
        localStorage.removeItem(anonymousKey);
      }
    }
  } catch (err) {
    console.warn("Guest tests migration warning:", err);
  }

  // 3. Sync with Firestore if online/configured
  if (db && isFirebaseConfigured()) {
    const path = "tests";
    try {
      const q = query(collection(db, path), where("ownerUid", "==", currentUser.uid));
      const snap = await getDocs(q);
      const cloudTests: TestConfig[] = [];
      snap.forEach(docSnap => {
        cloudTests.push(docSnap.data() as TestConfig);
      });

      // MERGE & BACKUP LOGIC:
      // A. For any test in Cloud but not in local cache -> Restore/Add to local cache
      // B. For any test in local cache but not in Cloud -> Backup/Upload to Cloud
      const mergedTestsMap = new Map<string, TestConfig>();
      
      // Seed with local tests
      localTests.forEach(t => mergedTestsMap.set(t.id, t));

      // Merge cloud tests (cloud list serves as source of truth for items on other devices)
      for (const ct of cloudTests) {
        mergedTestsMap.set(ct.id, ct);
      }

      // Check if any local tests need backup to Cloud (not present in the cloud list)
      const cloudIds = new Set(cloudTests.map(t => t.id));
      for (const lt of localTests) {
        if (!cloudIds.has(lt.id)) {
          const updatedTest = {
            ...lt,
            ownerUid: currentUser.uid,
            ownerEmail: currentUser.email
          };
          setDoc(doc(db, "tests", lt.id), removeUndefined(updatedTest)).catch(err => {
            console.warn("Ad-hoc background test backup failed:", err);
          });
        }
      }

      const mergedList = Array.from(mergedTestsMap.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      // Save merged to local cache
      localStorage.setItem(localKey, JSON.stringify(mergedList));
      return mergedList;
    } catch (error) {
      console.warn("Failed fetching tests from Firestore, returning robust local backup cache.", error);
      return localTests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } else {
    return localTests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
}

export async function fetchSingleTestCloud(id: string): Promise<TestConfig | null> {
  if (db && isFirebaseConfigured()) {
    const path = `tests/${id}`;
    try {
      const ref = doc(db, "tests", id);
      const snapshot = await getDoc(ref);
      if (snapshot.exists()) {
        return snapshot.data() as TestConfig;
      }
    } catch (error) {
      console.warn("Failed fetching single test from Firestore", error);
    }
  }

  // Offline / fallback lookup (check all account partitions)
  const emailKey = getEmailStorageKey("tests");
  try {
    let saved = localStorage.getItem(emailKey);
    if (saved) {
      const items = JSON.parse(saved) as TestConfig[];
      const match = items.find(t => t.id === id);
      if (match) return match;
    }
  } catch (e) {
    console.error(e);
  }

  // Deep fallback scan
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("mcq_portal_tests_")) {
        const val = localStorage.getItem(key);
        if (val) {
          const items = JSON.parse(val) as TestConfig[];
          const match = items.find(t => t.id === id);
          if (match) return match;
        }
      }
    }
  } catch (e) {
    console.error(e);
  }
  return null;
}

export async function saveTestCloud(test: TestConfig): Promise<void> {
  const currentUser = cachedAuthUser;
  const ownerUid = currentUser?.uid || "anonymous_educator";
  const ownerEmail = currentUser?.email || "anonymous@gmail.com";

  const updatedTest = {
    ...test,
    ownerUid,
    ownerEmail
  };

  // 1. ALWAYS write to LocalStorage Cache
  const localKey = getEmailStorageKey("tests");
  let tests: TestConfig[] = [];
  try {
    const loaded = localStorage.getItem(localKey);
    if (loaded) tests = JSON.parse(loaded);
  } catch (e) {
    console.error("Local storage read error in saveTest", e);
  }
  tests = tests.filter(t => t.id !== test.id);
  tests.unshift(updatedTest);
  localStorage.setItem(localKey, JSON.stringify(tests));

  // 2. Also write to Cloud Firestore if online/configured
  if (db && isFirebaseConfigured()) {
    const path = `tests/${test.id}`;
    try {
      await setDoc(doc(db, "tests", test.id), removeUndefined(updatedTest));
    } catch (error) {
      console.warn("Firestore save failed, fallback to local-only success", error);
    }
  }
}

export async function deleteTestCloud(id: string): Promise<void> {
  // 1. ALWAYS delete from Local Cache
  const localKey = getEmailStorageKey("tests");
  let tests: TestConfig[] = [];
  try {
    const loaded = localStorage.getItem(localKey);
    if (loaded) tests = JSON.parse(loaded);
  } catch (e) {
    console.error("Local delete error", e);
  }
  tests = tests.filter(t => t.id !== id);
  localStorage.setItem(localKey, JSON.stringify(tests));

  // 2. Also delete from Firestore if online/configured
  if (db && isFirebaseConfigured()) {
    const path = `tests/${id}`;
    try {
      await deleteDoc(doc(db, "tests", id));
    } catch (error) {
      console.warn("Firestore delete failed", error);
    }
  }
}

export async function saveResultCloud(result: StudentResult): Promise<void> {
  // Try to associate the admin creator UID to allow the teacher to read students' evaluations back
  const testInfo = await fetchSingleTestCloud(result.testId);
  const ownerUid = testInfo?.ownerUid || cachedAuthUser?.uid || "mock_g_uid_voicereplit";

  const updatedResult = {
    ...result,
    ownerUid
  };

  // 1. ALWAYS save to local cache
  const emailKey = `mcq_portal_results_${ownerUid}`;
  let results: StudentResult[] = [];
  try {
    const loaded = localStorage.getItem(emailKey);
    if (loaded) results = JSON.parse(loaded);
  } catch (e) {
    console.error("Local storage read error in saveResult", e);
  }
  results = results.filter(r => r.id !== result.id);
  results.unshift(updatedResult);
  localStorage.setItem(emailKey, JSON.stringify(results));

  // 2. Also save to cloud Firestore if online/configured
  if (db && isFirebaseConfigured()) {
    const path = `results/${result.id}`;
    try {
      await setDoc(doc(db, "results", result.id), removeUndefined(updatedResult));
    } catch (error) {
      console.warn("Firestore save result failed, fallback to local success", error);
    }
  }
}

export async function fetchResultsCloud(): Promise<StudentResult[]> {
  const currentUser = cachedAuthUser;
  if (!currentUser) return [];

  const localKey = `mcq_portal_results_${currentUser.uid}`;

  // 1. Load local cache
  let localResults: StudentResult[] = [];
  try {
    const saved = localStorage.getItem(localKey);
    if (saved) {
      localResults = JSON.parse(saved);
    }
  } catch (e) {
    console.error("Failed loading local results cache:", e);
  }

  // 2. Also check if there are any anonymous/guest results in localStorage to import/backup
  const anonymousKeys = [
    `mcq_portal_results_mock_g_uid_voicereplit`,
    `mcq_portal_results_anonymous`
  ];
  for (const anonKey of anonymousKeys) {
    try {
      const anonSaved = localStorage.getItem(anonKey);
      if (anonSaved) {
        const anonResults = JSON.parse(anonSaved) as StudentResult[];
        if (anonResults.length > 0) {
          console.log(`Found guest results in ${anonKey}, backing them up to user profile...`, anonResults);
          for (const r of anonResults) {
            const migratedRes = {
              ...r,
              ownerUid: currentUser.uid
            };
            if (!localResults.some(l => l.id === migratedRes.id)) {
              localResults.unshift(migratedRes);
            }
            if (db && isFirebaseConfigured()) {
              setDoc(doc(db, "results", migratedRes.id), removeUndefined(migratedRes)).catch(err => {
                console.warn("Background guest results backup failed:", err);
              });
            }
          }
          localStorage.setItem(localKey, JSON.stringify(localResults));
          localStorage.removeItem(anonKey);
        }
      }
    } catch (err) {
      console.warn("Guest results migration warning:", err);
    }
  }

  // 3. Sync with Firestore if online/configured
  if (db && isFirebaseConfigured()) {
    const path = "results";
    try {
      const q = query(collection(db, path), where("ownerUid", "==", currentUser.uid));
      const snap = await getDocs(q);
      const cloudResults: StudentResult[] = [];
      snap.forEach(docSnap => {
        cloudResults.push(docSnap.data() as StudentResult);
      });

      // MERGE & BACKUP LOGIC:
      const mergedResultsMap = new Map<string, StudentResult>();
      
      // Seed with local results
      localResults.forEach(r => mergedResultsMap.set(r.id, r));

      // Merge Cloud results (cloud is the absolute reference for multi-device sync)
      for (const cr of cloudResults) {
        mergedResultsMap.set(cr.id, cr);
      }

      // Check if any local results need backup to Cloud (not present in the cloud list)
      const cloudIds = new Set(cloudResults.map(r => r.id));
      for (const lr of localResults) {
        if (!cloudIds.has(lr.id)) {
          const updatedResult = {
            ...lr,
            ownerUid: currentUser.uid
          };
          setDoc(doc(db, "results", lr.id), removeUndefined(updatedResult)).catch(err => {
            console.warn("Ad-hoc background result backup failed:", err);
          });
        }
      }

      const mergedList = Array.from(mergedResultsMap.values()).sort(
        (a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );

      // Save merged list to local cache
      localStorage.setItem(localKey, JSON.stringify(mergedList));
      return mergedList;
    } catch (error) {
      console.warn("Failed fetching results from Firestore, returning robust local backup cache.", error);
      return localResults.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
    }
  } else {
    return localResults.sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
  }
}
