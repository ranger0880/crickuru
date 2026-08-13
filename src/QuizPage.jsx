import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";

const PROFILE_KEY = "crickuru-quiz-profile-v1";
const PROFILE_LOCK_KEY = "crickuru-quiz-profile-lock-v1";
const SCORE_KEY = "crickuru-quiz-scores-v2";
const LEGACY_SCORE_KEYS = ["crickuru-quiz-scores-v1"];
const TWO_MONTHS_MS = 60 * 24 * 60 * 60 * 1000;
const QUESTION_POOL_SIZE = 10_000;
const AUTH_API_URL = String(import.meta.env.VITE_AUTH_API_URL || "").replace(/\/+$/, "");
const GOOGLE_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "");

const modes = [
  { id: "rush", label: "10 Ball Rush", count: 10, seconds: 18 },
  { id: "powerplay", label: "Powerplay 20", count: 20, seconds: 16 },
  { id: "test", label: "Champion 50", count: 50, seconds: 14 },
];

const rankTitles = {
  1: "Tendulkar Maestro",
  2: "Kohli Chase King",
  3: "Dhoni Ice Finisher",
};

function QuizPage() {
  const [profile, setProfile] = useState(loadProfile);
  const [profileDraft, setProfileDraft] = useState(() => loadProfile());
  const [scores, setScores] = useState(loadScores);
  const [leaderboardView, setLeaderboardView] = useState("daily");
  const [modeId, setModeId] = useState("rush");
  const [session, setSession] = useState(null);
  const [duel, setDuel] = useState(null);
  const [authState, setAuthState] = useState({ status: AUTH_API_URL ? "ready" : "unconfigured", message: "" });
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [whatsappOtp, setWhatsappOtp] = useState("");
  const [whatsappChallenge, setWhatsappChallenge] = useState("");
  const seasonDaysLeft = Math.max(1, 60 - Math.floor((Date.now() - new Date(scores.seasonStartedAt).getTime()) / (24 * 60 * 60 * 1000)));

  useEffect(() => {
    saveProfile(profile);
    setProfileDraft(profile);
  }, [profile]);

  useEffect(() => {
    saveScores(scores);
  }, [scores]);

  useEffect(() => {
    clearLegacyScoreStores();
    setScores((store) => sanitizeScoreStore(store, profile));
  }, [profile.id, profile.registered]);

  useEffect(() => {
    if (!AUTH_API_URL) return undefined;
    let active = true;
    authRequest("/auth/session", { method: "GET" })
      .then((payload) => {
        if (active && payload?.user) updateProfile(profileFromAuthUser(payload.user, payload.provider || "google", profile));
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!session || session.complete || session.selected !== null) return undefined;
    const interval = window.setInterval(() => {
      setSession((current) => {
        if (!current || current.complete || current.selected !== null) return current;
        if (current.timeLeft <= 1) {
          window.setTimeout(() => handleQuizAnswer(-1), 0);
          return { ...current, timeLeft: 0 };
        }
        return { ...current, timeLeft: current.timeLeft - 1 };
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [session?.id, session?.current, session?.selected, session?.complete]);

  useEffect(() => {
    if (!duel || duel.complete || duel.selected !== null) return undefined;
    const interval = window.setInterval(() => {
      setDuel((current) => {
        if (!current || current.complete || current.selected !== null) return current;
        if (current.timeLeft <= 1) {
          window.setTimeout(() => handleDuelAnswer(-1), 0);
          return { ...current, timeLeft: 0 };
        }
        return { ...current, timeLeft: current.timeLeft - 1 };
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [duel?.id, duel?.current, duel?.selected, duel?.complete]);

  const leaderboardRows = useMemo(() => buildLeaderboardRows(scores, profile, leaderboardView), [scores, profile, leaderboardView]);
  const lobbyPlayers = useMemo(() => buildLobbyPlayers(profile), [profile]);
  const selectedMode = modes.find((mode) => mode.id === modeId) || modes[0];

  function updateProfile(nextProfile) {
    setProfile(nextProfile);
  }

  function saveLocalProfile(event) {
    event.preventDefault();
    if (profile.registered) {
      setAuthState({ status: "error", message: "Only one local profile is allowed on this device. Connect a verified account to use your profile on another device." });
      return;
    }
    const cleanName = profileDraft.name
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 40) || "Warrior Player";
    const nextProfile = {
      ...profile,
      name: cleanName,
      method: "local",
      provider: "local",
      contact: "",
      verified: false,
      registered: true,
    };
    writeJson(PROFILE_LOCK_KEY, { id: nextProfile.id, name: nextProfile.name, createdAt: nextProfile.joinedAt });
    updateProfile(nextProfile);
  }

  const handleGoogleCredential = useCallback(async (credentialResponse) => {
    if (!AUTH_API_URL || !credentialResponse?.credential) return;
    setAuthState({ status: "loading", message: "Confirming Google sign-in..." });
    try {
      const payload = await authRequest("/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential: credentialResponse.credential }),
      });
      if (!payload?.user) throw new Error("The sign-in response did not include a user.");
      updateProfile(profileFromAuthUser(payload.user, "google", profile));
      setAuthState({ status: "connected", message: "Google account connected." });
    } catch (error) {
      setAuthState({ status: "error", message: error.message || "Google sign-in failed." });
    }
  }, [profile]);

  async function startWhatsAppLogin(event) {
    event.preventDefault();
    const phone = whatsappNumber.replace(/[^+\d]/g, "");
    if (!/^\+[1-9]\d{7,14}$/.test(phone)) {
      setAuthState({ status: "error", message: "Use an international WhatsApp number, for example +919876543210." });
      return;
    }
    setAuthState({ status: "loading", message: "Requesting a WhatsApp verification code..." });
    try {
      const payload = await authRequest("/auth/whatsapp/start", {
        method: "POST",
        body: JSON.stringify({ phone }),
      });
      if (!payload?.challengeId) throw new Error("WhatsApp verification could not be started.");
      setWhatsappChallenge(String(payload.challengeId));
      setWhatsappOtp("");
      setAuthState({ status: "challenge", message: "Code sent. It expires soon." });
    } catch (error) {
      setAuthState({ status: "error", message: error.message || "WhatsApp verification failed to start." });
    }
  }

  async function verifyWhatsAppLogin(event) {
    event.preventDefault();
    if (!/^\d{6}$/.test(whatsappOtp) || !whatsappChallenge) return;
    setAuthState({ status: "loading", message: "Confirming WhatsApp verification..." });
    try {
      const payload = await authRequest("/auth/whatsapp/verify", {
        method: "POST",
        body: JSON.stringify({ challengeId: whatsappChallenge, otp: whatsappOtp }),
      });
      if (!payload?.user) throw new Error("The verification response did not include a user.");
      updateProfile(profileFromAuthUser(payload.user, "whatsapp", profile));
      setWhatsappChallenge("");
      setWhatsappOtp("");
      setAuthState({ status: "connected", message: "WhatsApp account connected." });
    } catch (error) {
      setAuthState({ status: "error", message: error.message || "WhatsApp verification failed." });
    }
  }

  function handleAvatarUpload(event) {
    const file = event.target.files?.[0];
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!file || !allowedTypes.has(file.type) || file.size > 2 * 1024 * 1024) return;

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const maxSize = 320;
      const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      const avatar = canvas.toDataURL("image/webp", 0.82);
      if (avatar.length <= 450_000) updateProfile({ ...profile, avatar });
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => URL.revokeObjectURL(objectUrl);
    image.src = objectUrl;
  }

  function startQuiz() {
    if (!profile.registered) {
      setAuthState({ status: "error", message: "Save your player profile or connect an account before entering the rankings." });
      return;
    }
    const seed = `${profile.id}-${Date.now()}-${modeId}`;
    const questions = pickQuestions(selectedMode.count, seed);
    setSession({
      id: `quiz-${Date.now()}`,
      mode: selectedMode,
      questions,
      current: 0,
      score: 0,
      correct: 0,
      wrong: 0,
      streak: 0,
      bestStreak: 0,
      timeLeft: selectedMode.seconds,
      selected: null,
      result: "",
      eliminated: [],
      hintIndex: null,
      complete: false,
      saved: false,
      used: { fifty: false, time: false, shield: false, double: false, hint: false },
      shieldUntil: 0,
      doubleUntil: 0,
      log: [],
    });
  }

  function handleQuizAnswer(index) {
    setSession((current) => {
      if (!current || current.complete || current.selected !== null) return current;
      const question = current.questions[current.current];
      const now = Date.now();
      const correct = index === question.answer;
      const shielded = !correct && now < current.shieldUntil;
      const doubled = correct && now < current.doubleUntil;
      const earned = correct ? (100 + current.timeLeft * 5 + current.streak * 15 + question.difficulty * 25) * (doubled ? 2 : 1) : 0;
      const nextStreak = correct ? current.streak + 1 : shielded ? current.streak : 0;
      const next = {
        ...current,
        selected: index,
        result: correct ? "correct" : shielded ? "shielded" : "wrong",
        score: current.score + earned,
        correct: current.correct + (correct ? 1 : 0),
        wrong: current.wrong + (!correct && !shielded ? 1 : 0),
        streak: nextStreak,
        bestStreak: Math.max(current.bestStreak, nextStreak),
        shieldUntil: shielded ? 0 : current.shieldUntil,
        doubleUntil: doubled ? 0 : current.doubleUntil,
        log: [
          {
            id: `log-${current.current}`,
            text: correct ? `+${earned} on ${question.category}` : shielded ? "Streak Shield saved the ball" : "Wicket lost",
            tone: correct ? "gold" : shielded ? "cyan" : "crimson",
          },
          ...current.log,
        ].slice(0, 5),
      };
      window.setTimeout(moveQuizForward, 850);
      return next;
    });
  }

  function moveQuizForward() {
    setSession((current) => {
      if (!current) return current;
      if (current.current >= current.questions.length - 1) {
        if (!current.saved) {
          const record = quizRecordFromSession(current, profile);
          setScores((store) => addQuizRecord(store, record));
        }
        return { ...current, complete: true, saved: true };
      }
      return {
        ...current,
        current: current.current + 1,
        selected: null,
        result: "",
        eliminated: [],
        hintIndex: null,
        timeLeft: current.mode.seconds,
      };
    });
  }

  function usePowerup(type) {
    setSession((current) => {
      if (!current || current.complete || current.selected !== null || current.used[type]) return current;
      const question = current.questions[current.current];
      const now = Date.now();
      if (type === "fifty") {
        const wrongIndexes = question.options.map((_, index) => index).filter((index) => index !== question.answer);
        return { ...current, used: { ...current.used, fifty: true }, eliminated: wrongIndexes.slice(0, 2) };
      }
      if (type === "time") {
        return { ...current, used: { ...current.used, time: true }, timeLeft: current.timeLeft + 15 };
      }
      if (type === "shield") {
        return { ...current, used: { ...current.used, shield: true }, shieldUntil: now + 20000 };
      }
      if (type === "double") {
        return { ...current, used: { ...current.used, double: true }, doubleUntil: now + 15000 };
      }
      if (type === "hint") {
        return { ...current, used: { ...current.used, hint: true }, hintIndex: question.answer };
      }
      return current;
    });
  }

  function startDuel(opponent) {
    if (!profile.registered) {
      setAuthState({ status: "error", message: "Register your player profile before starting a duel." });
      return;
    }
    setDuel({
      id: `duel-${Date.now()}`,
      opponent,
      questions: pickQuestions(7, `${profile.id}-${opponent.id}-${Date.now()}`),
      current: 0,
      playerScore: 0,
      rivalScore: 0,
      selected: null,
      result: "",
      timeLeft: 16,
      complete: false,
      saved: false,
      log: [],
    });
  }

  function handleDuelAnswer(index) {
    setDuel((current) => {
      if (!current || current.complete || current.selected !== null) return current;
      const question = current.questions[current.current];
      const correct = index === question.answer;
      const rivalCorrect = deterministicNumber(`${current.id}-${current.current}-${current.opponent.id}`, 100) < current.opponent.skill * 100 - question.difficulty * 3;
      const next = {
        ...current,
        selected: index,
        result: correct ? "correct" : "wrong",
        playerScore: current.playerScore + (correct ? 1 : 0),
        rivalScore: current.rivalScore + (rivalCorrect ? 1 : 0),
        log: [
          `${correct ? profile.name : current.opponent.name} took ball ${current.current + 1}`,
          ...current.log,
        ].slice(0, 5),
      };
      window.setTimeout(moveDuelForward, 800);
      return next;
    });
  }

  function moveDuelForward() {
    setDuel((current) => {
      if (!current) return current;
      if (current.current >= current.questions.length - 1) {
        if (!current.saved) {
          const record = duelRecordFromState(current, profile);
          setScores((store) => addDuelRecord(store, record));
        }
        return { ...current, complete: true, saved: true };
      }
      return { ...current, current: current.current + 1, selected: null, result: "", timeLeft: 16 };
    });
  }

  return (
    <main className="route-bg page-grain min-h-screen px-4 pb-16 pt-28 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-7xl">
        <motion.div
          className="grid gap-5 lg:grid-cols-[0.9fr_1.5fr_0.95fr]"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <aside className="grid gap-5">
            <ProfilePanel
              profile={profile}
              draft={profileDraft}
              setDraft={setProfileDraft}
              onSaveProfile={saveLocalProfile}
              onAvatarUpload={handleAvatarUpload}
              authState={authState}
              onGoogleCredential={handleGoogleCredential}
              whatsappNumber={whatsappNumber}
              setWhatsappNumber={setWhatsappNumber}
              whatsappOtp={whatsappOtp}
              setWhatsappOtp={setWhatsappOtp}
              whatsappChallenge={whatsappChallenge}
              onStartWhatsApp={startWhatsAppLogin}
              onVerifyWhatsApp={verifyWhatsAppLogin}
            />
            <LobbyPanel players={lobbyPlayers} profile={profile} onChallenge={startDuel} />
          </aside>

          <section className="grid gap-5">
            <div className="glass rounded-[8px] p-5 sm:p-6">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.28em] text-cyan">CricKuru Quiz Lobby</p>
                  <h1 className="mt-2 font-display text-5xl font-black uppercase leading-none text-white sm:text-7xl">
                    10,000 Ball Cricket IQ
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-white/58">
                    General knowledge, tricky rules, score math, fielding calls, famous cricket moments, and quick duels for Kurukshetra Warriors fans.
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <QuizMiniStat label="Bank" value={questionBank.length} />
                  <QuizMiniStat label="Season" value={`${seasonDaysLeft}d`} />
                  <QuizMiniStat label="Rank" value={leaderboardRows.findIndex((row) => row.id === profile.id) + 1 || "-"} />
                </div>
              </div>
            </div>

            {duel ? (
              <DuelArena duel={duel} profile={profile} onAnswer={handleDuelAnswer} onClose={() => setDuel(null)} />
            ) : (
              <QuizArena
                modeId={modeId}
                setModeId={setModeId}
                selectedMode={selectedMode}
                session={session}
                onStart={startQuiz}
                onAnswer={handleQuizAnswer}
                onPowerup={usePowerup}
              />
            )}
          </section>

          <LeaderboardPanel
            view={leaderboardView}
            setView={setLeaderboardView}
            rows={leaderboardRows}
            seasonDaysLeft={seasonDaysLeft}
          />
        </motion.div>
      </section>
    </main>
  );
}

function ProfilePanel({
  profile,
  draft,
  setDraft,
  onSaveProfile,
  onAvatarUpload,
  authState,
  onGoogleCredential,
  whatsappNumber,
  setWhatsappNumber,
  whatsappOtp,
  setWhatsappOtp,
  whatsappChallenge,
  onStartWhatsApp,
  onVerifyWhatsApp,
}) {
  return (
    <section className="glass rounded-[8px] p-5">
      <div className="flex items-center gap-4">
        <Avatar profile={profile} size="large" />
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">{profile.method === "local" ? "Local Profile" : `${profile.method} account`}</p>
          <h2 className="font-display text-3xl font-black uppercase text-white">{profile.name}</h2>
          <span className={`mt-1 inline-flex rounded-full border px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.16em] ${profile.verified ? "border-cyan/45 bg-cyan/10 text-cyan" : "border-white/12 bg-white/7 text-white/48"}`}>
            {profile.verified ? "Verified" : "Guest"}
          </span>
        </div>
      </div>

      <form className="mt-5 grid gap-3" onSubmit={onSaveProfile}>
        <input
          maxLength={40}
          autoComplete="nickname"
          value={draft.name}
          onChange={(event) => setDraft({ ...draft, name: event.target.value })}
          placeholder="Player name"
          disabled={profile.registered}
          className="min-h-11 rounded-[8px] border border-white/12 bg-night/60 px-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
        />
        <label className="flex min-h-11 items-center justify-center gap-2 rounded-[8px] border border-white/12 bg-white/[0.045] px-3 text-xs font-black uppercase tracking-[0.12em] text-white/68 transition hover:border-gold/40 hover:text-gold">
          <UploadIcon /> Upload Image
          <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onAvatarUpload} />
        </label>
        <button type="submit" className="shine-button min-h-11 rounded-[8px] bg-gold px-4 text-xs font-black uppercase tracking-[0.15em] text-night">
          {profile.registered ? "Profile Locked" : "Save Profile"}
        </button>
      </form>

      <div className="mt-5 border-t border-white/10 pt-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan">Connect Settings</p>
            <p className="mt-1 text-xs font-semibold text-white/48">Use a verified provider to carry scores across devices.</p>
          </div>
          <LinkIcon />
        </div>

        <div className="mt-4 grid gap-3">
          <GoogleSignInButton clientId={GOOGLE_CLIENT_ID} disabled={!AUTH_API_URL} onCredential={onGoogleCredential} />
          <form className="grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={onStartWhatsApp}>
            <input
              inputMode="tel"
              autoComplete="tel"
              value={whatsappNumber}
              onChange={(event) => setWhatsappNumber(event.target.value)}
              placeholder="WhatsApp number, +country code"
              className="min-h-11 rounded-[8px] border border-white/12 bg-night/60 px-3 text-sm font-bold text-white"
              disabled={!AUTH_API_URL || authState.status === "loading"}
            />
            <button
              type="submit"
              className="min-h-11 rounded-[8px] border border-cyan/35 bg-cyan/10 px-4 text-xs font-black uppercase tracking-[0.12em] text-cyan transition hover:bg-cyan hover:text-night disabled:cursor-not-allowed disabled:opacity-40"
              disabled={!AUTH_API_URL || authState.status === "loading"}
            >
              WhatsApp OTP
            </button>
          </form>
          {whatsappChallenge && (
            <form className="grid gap-2 sm:grid-cols-[1fr_auto]" onSubmit={onVerifyWhatsApp}>
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={whatsappOtp}
                onChange={(event) => setWhatsappOtp(event.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="6-digit code"
                className="min-h-11 rounded-[8px] border border-white/12 bg-night/60 px-3 text-sm font-bold text-white"
              />
              <button type="submit" className="min-h-11 rounded-[8px] bg-gold px-4 text-xs font-black uppercase tracking-[0.12em] text-night">
                Verify WhatsApp
              </button>
            </form>
          )}
          <p className={`text-xs font-bold ${authState.status === "error" ? "text-crimson" : authState.status === "connected" ? "text-cyan" : "text-white/45"}`} aria-live="polite">
            {authState.message || (!AUTH_API_URL ? "Provider login is waiting for the auth service URL." : "Choose Google or WhatsApp to connect.")}
          </p>
        </div>
      </div>
    </section>
  );
}

function GoogleSignInButton({ clientId, disabled, onCredential }) {
  const buttonRef = useRef(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (disabled || !clientId) return undefined;
    const renderButton = () => {
      if (!window.google?.accounts?.id || !buttonRef.current) return;
      buttonRef.current.innerHTML = "";
      window.google.accounts.id.initialize({ client_id: clientId, callback: onCredential, ux_mode: "popup" });
      window.google.accounts.id.renderButton(buttonRef.current, { theme: "outline", size: "large", shape: "rectangular", width: 320 });
      setReady(true);
    };
    if (window.google?.accounts?.id) {
      renderButton();
      return undefined;
    }
    const existing = document.querySelector('script[src="https://accounts.google.com/gsi/client"]');
    const script = existing || document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = renderButton;
    if (!existing) document.head.appendChild(script);
    return () => {
      script.onload = null;
    };
  }, [clientId, disabled, onCredential]);

  if (disabled || !clientId) {
    return (
      <button type="button" disabled className="min-h-11 rounded-[8px] border border-white/12 bg-white/[0.045] px-4 text-xs font-black uppercase tracking-[0.12em] text-white/35">
        Google sign-in setup required
      </button>
    );
  }
  return <div ref={buttonRef} className={`min-h-11 overflow-hidden rounded-[8px] ${ready ? "bg-white" : "border border-white/12 bg-white/[0.045]"}`} aria-label="Continue with Google" />;
}

function LobbyPanel({ players, profile, onChallenge }) {
  return (
    <section className="glass rounded-[8px] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-cyan">Lobby Now</p>
          <h2 className="font-display text-3xl font-black uppercase text-white">{players.length} Players</h2>
        </div>
        <UsersIcon />
      </div>
      <div className="mt-4 grid max-h-[520px] gap-3 overflow-y-auto pr-1">
        {players.length === 0 ? (
          <div className="rounded-[8px] border border-dashed border-white/15 bg-white/[0.025] p-6 text-center">
            <p className="text-sm font-black uppercase tracking-[0.12em] text-white/60">Lobby is quiet</p>
            <p className="mt-2 text-xs font-semibold leading-5 text-white/42">Registered players will appear here when they connect.</p>
          </div>
        ) : players.map((player) => (
          <article key={player.id} className="rounded-[8px] border border-white/10 bg-night/45 p-3">
            <div className="flex items-center gap-3">
              <Avatar profile={player} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-white">{player.id === profile.id ? `${player.name} (You)` : player.name}</p>
                <p className="truncate text-xs font-bold text-white/42">{player.mood} - {player.city}</p>
              </div>
              <span className="h-2.5 w-2.5 rounded-full bg-cyan shadow-[0_0_16px_rgba(34,211,238,0.75)]" />
            </div>
            {player.id !== profile.id && (
              <button
                type="button"
                onClick={() => onChallenge(player)}
                className="mt-3 flex min-h-10 w-full items-center justify-center gap-2 rounded-[8px] border border-gold/28 bg-gold/10 text-xs font-black uppercase tracking-[0.14em] text-gold transition hover:bg-gold hover:text-night"
              >
                <SwordsIcon /> Challenge
              </button>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}

function QuizArena({ modeId, setModeId, selectedMode, session, onStart, onAnswer, onPowerup }) {
  const currentQuestion = session?.questions[session.current];
  const progress = session ? Math.round(((session.current + (session.complete ? 1 : 0)) / session.questions.length) * 100) : 0;
  return (
    <section className="glass rounded-[8px] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {modes.map((mode) => (
            <button
              key={mode.id}
              type="button"
              onClick={() => setModeId(mode.id)}
              className={`min-h-10 rounded-full border px-4 text-xs font-black uppercase tracking-[0.13em] transition ${
                modeId === mode.id ? "border-gold/55 bg-gold text-night" : "border-white/12 bg-white/[0.045] text-white/60 hover:border-gold/45 hover:text-gold"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={onStart} className="shine-button min-h-11 rounded-full bg-crimson px-5 text-xs font-black uppercase tracking-[0.16em] text-white">
          {session && !session.complete ? "Restart Quiz" : "Start Quiz"}
        </button>
      </div>

      {!session ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <InfoTile title="Powerups" value="5" detail="Fifty, time, shield, double, hint" />
          <InfoTile title="Question Pool" value="10,000" detail="Rules, math, history and formats" />
          <InfoTile title="Selected Mode" value={selectedMode.count} detail={`${selectedMode.seconds}s per ball`} />
        </div>
      ) : session.complete ? (
        <QuizResult session={session} onStart={onStart} />
      ) : (
        <div className="mt-6">
          <div className="mb-5 grid gap-3 sm:grid-cols-4">
            <QuizMiniStat label="Score" value={session.score} />
            <QuizMiniStat label="Ball" value={`${session.current + 1}/${session.questions.length}`} />
            <QuizMiniStat label="Timer" value={`${session.timeLeft}s`} highlight />
            <QuizMiniStat label="Streak" value={session.streak} />
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full bg-gradient-to-r from-gold via-cyan to-crimson transition-all" style={{ width: `${progress}%` }} />
          </div>

          <QuestionCard session={session} question={currentQuestion} onAnswer={onAnswer} />
          <PowerupBar session={session} onPowerup={onPowerup} />
        </div>
      )}
    </section>
  );
}

function QuestionCard({ session, question, onAnswer }) {
  return (
    <article className="mt-5 rounded-[8px] border border-white/10 bg-night/55 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-cyan/25 bg-cyan/10 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.14em] text-cyan">{question.category}</span>
        <span className="rounded-full border border-gold/25 bg-gold/10 px-3 py-1 text-[0.65rem] font-black uppercase tracking-[0.14em] text-gold">Level {question.difficulty}</span>
      </div>
      <h2 className="mt-4 font-display text-4xl font-black uppercase leading-none text-white sm:text-5xl">{question.question}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        {question.options.map((option, index) => {
          const eliminated = session.eliminated.includes(index);
          const selected = session.selected === index;
          const correct = index === question.answer;
          const reveal = session.selected !== null;
          const hinted = session.hintIndex === index;
          return (
            <button
              key={`${question.id}-${option}`}
              type="button"
              disabled={eliminated || reveal}
              onClick={() => onAnswer(index)}
              className={`min-h-16 rounded-[8px] border p-4 text-left text-sm font-black leading-5 transition ${
                eliminated
                  ? "border-white/5 bg-white/[0.025] text-white/20"
                  : reveal && correct
                    ? "border-cyan/55 bg-cyan/15 text-cyan"
                    : reveal && selected
                      ? "border-crimson/55 bg-crimson/15 text-crimson"
                      : hinted
                        ? "border-gold/60 bg-gold/15 text-gold"
                        : "border-white/10 bg-white/[0.045] text-white/76 hover:border-gold/45 hover:text-gold"
              }`}
            >
              <span className="mr-2 text-white/36">{String.fromCharCode(65 + index)}</span>
              {eliminated ? "Removed by 50-50" : option}
            </button>
          );
        })}
      </div>
      {session.selected !== null && (
        <p className="mt-4 rounded-[8px] border border-white/10 bg-white/[0.04] p-3 text-sm font-semibold leading-6 text-white/62">
          {session.result === "correct" ? "Correct." : session.result === "shielded" ? "Shield saved your streak." : "Answer:"} {question.explanation}
        </p>
      )}
    </article>
  );
}

function PowerupBar({ session, onPowerup }) {
  const now = Date.now();
  const powerups = [
    { id: "fifty", title: "50-50", detail: "Remove 2" },
    { id: "time", title: "+15s", detail: "Extra Time" },
    { id: "shield", title: "Shield", detail: `${Math.max(0, Math.ceil((session.shieldUntil - now) / 1000)) || 20}s` },
    { id: "double", title: "Double", detail: `${Math.max(0, Math.ceil((session.doubleUntil - now) / 1000)) || 15}s` },
    { id: "hint", title: "Hint", detail: "Crowd Call" },
  ];
  return (
    <div className="mt-4 grid gap-2 sm:grid-cols-5">
      {powerups.map((powerup) => (
        <button
          key={powerup.id}
          type="button"
          disabled={session.used[powerup.id] || session.selected !== null}
          onClick={() => onPowerup(powerup.id)}
          className={`rounded-[8px] border p-3 text-left transition ${
            session.used[powerup.id]
              ? "border-white/8 bg-white/[0.025] text-white/24"
              : "border-gold/22 bg-gold/8 text-white hover:border-gold/50 hover:bg-gold/15"
          }`}
        >
          <p className="text-sm font-black uppercase">{powerup.title}</p>
          <p className="mt-1 text-xs font-bold uppercase tracking-[0.12em] text-white/42">{powerup.detail}</p>
        </button>
      ))}
    </div>
  );
}

function QuizResult({ session, onStart }) {
  const accuracy = Math.round((session.correct / session.questions.length) * 100);
  return (
    <div className="mt-6 rounded-[8px] border border-gold/25 bg-[radial-gradient(circle_at_80%_20%,rgba(244,185,66,0.18),transparent_34%),rgba(255,255,255,0.045)] p-6">
      <p className="text-xs font-black uppercase tracking-[0.24em] text-gold">Innings Complete</p>
      <h2 className="mt-2 font-display text-6xl font-black uppercase leading-none text-white">{session.score}</h2>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <QuizMiniStat label="Correct" value={session.correct} />
        <QuizMiniStat label="Accuracy" value={`${accuracy}%`} />
        <QuizMiniStat label="Best Streak" value={session.bestStreak} />
        <QuizMiniStat label="Mode" value={session.mode.count} />
      </div>
      <button type="button" onClick={onStart} className="mt-5 min-h-11 rounded-full bg-gold px-5 text-xs font-black uppercase tracking-[0.14em] text-night">
        Play Again
      </button>
    </div>
  );
}

function DuelArena({ duel, profile, onAnswer, onClose }) {
  const question = duel.questions[duel.current];
  return (
    <section className="glass rounded-[8px] p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.24em] text-crimson">Duel Challenge</p>
          <h2 className="font-display text-5xl font-black uppercase text-white">{profile.name} vs {duel.opponent.name}</h2>
        </div>
        <button type="button" onClick={onClose} className="min-h-10 rounded-full border border-white/12 px-4 text-xs font-black uppercase tracking-[0.14em] text-white/62">
          Close Duel
        </button>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <QuizMiniStat label={profile.name} value={duel.playerScore} highlight />
        <QuizMiniStat label={duel.opponent.name} value={duel.rivalScore} />
        <QuizMiniStat label="Ball" value={`${duel.current + 1}/${duel.questions.length}`} />
        <QuizMiniStat label="Timer" value={`${duel.timeLeft}s`} />
      </div>

      {duel.complete ? (
        <div className="mt-5 rounded-[8px] border border-white/10 bg-night/55 p-6">
          <p className="text-xs font-black uppercase tracking-[0.24em] text-gold">Duel Result</p>
          <h3 className="mt-2 font-display text-5xl font-black uppercase text-white">
            {duel.playerScore === duel.rivalScore ? "Tie Break Spirit" : duel.playerScore > duel.rivalScore ? "You Win" : "Opponent Wins"}
          </h3>
          <p className="mt-3 text-sm font-semibold text-white/60">
            Final score {duel.playerScore}-{duel.rivalScore}. Duel ranking has been updated in this browser.
          </p>
        </div>
      ) : (
        <QuestionCard session={{ ...duel, eliminated: [], hintIndex: null }} question={question} onAnswer={onAnswer} />
      )}
    </section>
  );
}

function LeaderboardPanel({ view, setView, rows, seasonDaysLeft }) {
  return (
    <aside className="glass rounded-[8px] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.22em] text-gold">Leaderboard</p>
          <h2 className="font-display text-3xl font-black uppercase text-white">Ranks</h2>
        </div>
        <TrophyIcon />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {["daily", "weekly", "monthly", "duel"].map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setView(item)}
            className={`min-h-10 rounded-[8px] border text-xs font-black uppercase tracking-[0.13em] ${
              view === item ? "border-gold/55 bg-gold text-night" : "border-white/12 bg-white/[0.045] text-white/58"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      <p className="mt-3 rounded-[8px] border border-white/10 bg-white/[0.035] p-3 text-xs font-bold leading-5 text-white/46">
        Season reset in {seasonDaysLeft} days.
      </p>
      <div className="mt-4 grid gap-3">
        {rows.length === 0 ? (
          <div className="rounded-[8px] border border-dashed border-white/15 bg-white/[0.025] p-6 text-center">
            <p className="text-sm font-black uppercase tracking-[0.12em] text-white/60">No rankings yet</p>
            <p className="mt-2 text-xs font-semibold leading-5 text-white/42">Complete a quiz after registering to enter this board.</p>
          </div>
        ) : rows.slice(0, 10).map((row, index) => (
          <article key={row.id} className={`rounded-[8px] border p-3 ${index < 3 ? "border-gold/28 bg-gold/8" : "border-white/10 bg-night/45"}`}>
            <div className="flex items-center gap-3">
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-[8px] font-display text-2xl font-black ${index < 3 ? "bg-gold text-night" : "bg-white/8 text-white/60"}`}>
                {index + 1}
              </span>
              <Avatar profile={row} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-black text-white">{row.name}</p>
                <p className="truncate text-[0.65rem] font-black uppercase tracking-[0.13em] text-gold">{rankTitles[index + 1] || `Warrior Rank ${index + 1}`}</p>
              </div>
              <p className="font-display text-3xl font-black text-white">{row.score}</p>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}

function InfoTile({ title, value, detail }) {
  return (
    <div className="rounded-[8px] border border-white/10 bg-night/50 p-4">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-white/42">{title}</p>
      <p className="mt-2 font-display text-5xl font-black uppercase text-white">{value}</p>
      <p className="mt-1 text-xs font-semibold text-white/48">{detail}</p>
    </div>
  );
}

function QuizMiniStat({ label, value, highlight }) {
  return (
    <div className={`rounded-[8px] border p-3 ${highlight ? "border-gold/35 bg-gold/10" : "border-white/10 bg-night/50"}`}>
      <p className="text-[0.65rem] font-black uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className={`mt-1 truncate font-display text-3xl font-black uppercase ${highlight ? "text-gold" : "text-white"}`}>{value}</p>
    </div>
  );
}

function Avatar({ profile, size = "normal" }) {
  const box = size === "large" ? "h-16 w-16 text-2xl" : "h-11 w-11 text-lg";
  if (profile.avatar) {
    return <img src={profile.avatar} alt="" className={`${box} shrink-0 rounded-[8px] border border-gold/30 object-cover`} />;
  }
  return (
    <div className={`${box} grid shrink-0 place-items-center rounded-[8px] border border-gold/25 bg-[linear-gradient(135deg,rgba(244,185,66,0.9),rgba(183,25,50,0.8))] font-display font-black text-night`}>
      {initials(profile.name)}
    </div>
  );
}

function loadProfile() {
  const stored = readJson(PROFILE_KEY);
  if (stored?.id) {
    return {
      id: String(stored.id),
      name: String(stored.name || "Guest Warrior").slice(0, 40),
      method: "local",
      contact: "",
      verified: false,
      registered: Boolean(stored.registered || (stored.name && stored.name !== "Guest Warrior")),
      avatar:
        typeof stored.avatar === "string" &&
        stored.avatar.length <= 450_000 &&
        /^(data:image\/(?:png|jpeg|webp);base64,)/.test(stored.avatar)
          ? stored.avatar
          : "",
      joinedAt: stored.joinedAt || new Date().toISOString(),
    };
  }
  const lock = readJson(PROFILE_LOCK_KEY);
  if (lock?.id) {
    return {
      id: String(lock.id),
      name: String(lock.name || "Registered Player").slice(0, 40),
      method: "local",
      provider: "local",
      contact: "",
      verified: false,
      registered: true,
      avatar: "",
      joinedAt: lock.createdAt || new Date().toISOString(),
    };
  }
  return {
    id: createId("player"),
    name: "Guest Warrior",
    method: "local",
    contact: "",
    verified: false,
    registered: false,
    avatar: "",
    joinedAt: new Date().toISOString(),
  };
}

function saveProfile(profile) {
  writeJson(PROFILE_KEY, profile);
}

function loadScores() {
  const stored = readJson(SCORE_KEY);
  const clean = stored?.seasonStartedAt ? stored : { seasonStartedAt: new Date().toISOString(), quizRecords: [], duelRecords: [] };
  if (Date.now() - new Date(clean.seasonStartedAt).getTime() > TWO_MONTHS_MS) {
    return { seasonStartedAt: new Date().toISOString(), quizRecords: [], duelRecords: [] };
  }
  return { seasonStartedAt: clean.seasonStartedAt, quizRecords: clean.quizRecords || [], duelRecords: clean.duelRecords || [] };
}

function saveScores(scores) {
  writeJson(SCORE_KEY, scores);
}

function addQuizRecord(store, record) {
  const clean = retainPlayerScoreRecords(store, record.playerId);
  return { ...clean, quizRecords: [record, ...clean.quizRecords].slice(0, 120) };
}

function addDuelRecord(store, record) {
  const clean = retainPlayerScoreRecords(store, record.playerId);
  return { ...clean, duelRecords: [record, ...clean.duelRecords].slice(0, 120) };
}

function quizRecordFromSession(session, profile) {
  return {
    id: createId("quiz"),
    playerId: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    score: session.score,
    correct: session.correct,
    total: session.questions.length,
    timestamp: new Date().toISOString(),
    periods: periodKeys(),
  };
}

function duelRecordFromState(duel, profile) {
  const won = duel.playerScore > duel.rivalScore;
  return {
    id: createId("duel"),
    playerId: profile.id,
    name: profile.name,
    avatar: profile.avatar,
    opponent: duel.opponent.name,
    score: won ? 1000 + (duel.playerScore - duel.rivalScore) * 120 : Math.max(50, 650 - (duel.rivalScore - duel.playerScore) * 90),
    won,
    timestamp: new Date().toISOString(),
    periods: periodKeys(),
  };
}

function buildLeaderboardRows(store, profile, view) {
  if (!profile.registered) return [];
  const periods = periodKeys();
  const key = periods[view] || periods.monthly;
  const ownPlayerId = String(profile.id);
  const localRows = view === "duel"
    ? (store.duelRecords || [])
      .filter((record) => String(record.playerId) === ownPlayerId)
      .map((record) => ({ ...record, id: record.playerId, score: record.score || 0 }))
    : (store.quizRecords || [])
      .filter((record) => String(record.playerId) === ownPlayerId && record.periods?.[view] === key)
      .map((record) => ({ ...record, id: record.playerId }));

  const bestByPlayer = new Map();
  for (const row of localRows) {
    const previous = bestByPlayer.get(row.id);
    if (!previous || row.score > previous.score) bestByPlayer.set(row.id, row);
  }

  if (!bestByPlayer.has(profile.id)) {
    bestByPlayer.set(profile.id, { id: profile.id, name: profile.name, avatar: profile.avatar, score: view === "duel" ? 650 : 0 });
  }

  return [...bestByPlayer.values()].sort((a, b) => b.score - a.score);
}

function buildLobbyPlayers(profile) {
  if (!profile.registered) return [];
  return [{ ...profile, mood: profile.verified ? "Verified and ready" : "Registered and ready", city: "Kurukshetra" }];
}

function sanitizeScoreStore(store, profile) {
  if (!profile?.registered) return emptyScoreStore();
  return retainPlayerScoreRecords(store, profile.id);
}

function retainPlayerScoreRecords(store, playerId) {
  const ownPlayerId = String(playerId || "");
  const seasonStartedAt = store?.seasonStartedAt || new Date().toISOString();
  return {
    seasonStartedAt,
    quizRecords: (store?.quizRecords || []).filter((record) => String(record.playerId) === ownPlayerId),
    duelRecords: (store?.duelRecords || []).filter((record) => String(record.playerId) === ownPlayerId),
  };
}

function emptyScoreStore() {
  return { seasonStartedAt: new Date().toISOString(), quizRecords: [], duelRecords: [] };
}

function clearLegacyScoreStores() {
  try {
    LEGACY_SCORE_KEYS.forEach((key) => window.localStorage.removeItem(key));
  } catch {
    // Storage may be unavailable in privacy mode; the versioned key still keeps old rows hidden.
  }
}

function pickQuestions(count, seed) {
  const start = deterministicNumber(seed, questionBank.length);
  const step = 37 + deterministicNumber(`${seed}-step`, 29);
  const picked = [];
  const seen = new Set();
  let index = start;
  while (picked.length < count) {
    const question = questionBank[index % questionBank.length];
    if (!seen.has(question.id)) {
      picked.push(question);
      seen.add(question.id);
    }
    index += step;
  }
  return picked;
}

function buildQuestionBank() {
  const questions = [];
  const add = (question, correct, wrongs, category = "Cricket IQ", difficulty = 1, explanation = correct) => {
    questions.push(makeQuestion(`q-${questions.length + 1}`, question, correct, wrongs, category, difficulty, explanation));
  };

  for (const item of coreFacts) {
    add(item.question, item.correct, item.wrongs, item.category, item.difficulty, item.explanation || item.correct);
  }

  for (const concept of concepts) {
    add(`What does "${concept.term}" usually mean in cricket?`, concept.definition, concept.wrongs, concept.category, concept.difficulty, concept.explanation || concept.definition);
    add(`A coach shouts "${concept.term}" during practice. What is being discussed?`, concept.definition, rotateWrongs(concept.wrongs), concept.category, Math.min(5, concept.difficulty + 1), concept.explanation || concept.definition);
    add(`Which option best matches "${concept.term}"?`, concept.definition, rotateWrongs(concept.wrongs, 2), concept.category, concept.difficulty, concept.explanation || concept.definition);
  }

  for (let balls = 1; balls <= 180; balls += 1) {
    const correct = formatOvers(balls);
    add(
      `A bowler has delivered ${balls} legal ball${balls === 1 ? "" : "s"}. How is that written in overs?`,
      correct,
      overDistractors(balls),
      "Score Math",
      balls > 72 ? 3 : 2,
      `${balls} legal balls equals ${correct} overs because one over has six legal balls.`,
    );
  }

  for (let i = 0; i < 220; i += 1) {
    const need = 14 + (i % 57);
    const ballsLeft = 6 + (i % 24);
    const hit = [0, 1, 2, 3, 4, 6][i % 6];
    const remaining = Math.max(0, need - hit);
    add(
      `A team needs ${need} from ${ballsLeft} balls. The batter scores ${hit} on the next legal ball. What is needed now?`,
      `${remaining} from ${ballsLeft - 1}`,
      [`${remaining + 1} from ${ballsLeft}`, `${Math.max(0, remaining - 1)} from ${ballsLeft - 1}`, `${remaining} from ${ballsLeft}`],
      "Chase Math",
      i % 5 === 0 ? 4 : 2,
      `Runs needed drop by ${hit}, and one legal ball is used.`,
    );
  }

  for (let i = 0; i < 160; i += 1) {
    const runs = 20 + (i * 7) % 180;
    const legalBalls = 12 + (i * 5) % 90;
    const rate = ((runs / legalBalls) * 6).toFixed(2);
    add(
      `A team scores ${runs} runs from ${legalBalls} legal balls. What is the run rate?`,
      rate,
      [((runs / Math.max(1, legalBalls - 6)) * 6).toFixed(2), (runs / 6).toFixed(2), (legalBalls / 6).toFixed(2)],
      "Score Math",
      4,
      `Run rate is runs divided by overs. ${legalBalls} balls is ${formatOvers(legalBalls)} overs, so the rate is ${rate}.`,
    );
  }

  for (let i = 0; i < 130; i += 1) {
    const runs = 30 + (i * 11) % 170;
    const balls = 15 + (i * 3) % 85;
    const strikeRate = ((runs / balls) * 100).toFixed(1);
    add(
      `A batter scores ${runs} from ${balls} balls. What is the strike rate?`,
      strikeRate,
      [((runs / balls) * 10).toFixed(1), ((balls / runs) * 100).toFixed(1), (runs + balls).toFixed(1)],
      "Batting Stats",
      3,
      `Strike rate is runs per 100 balls, so ${runs} divided by ${balls} times 100.`,
    );
  }

  for (let i = 0; i < 120; i += 1) {
    const runs = 40 + (i * 9) % 230;
    const wickets = i % 9;
    add(
      `Score is ${runs}/${wickets}. The next ball is a clean bowled wicket with no run. What is the score?`,
      `${runs}/${wickets + 1}`,
      [`${runs + 1}/${wickets + 1}`, `${runs}/${wickets}`, `${runs + 1}/${wickets}`],
      "Scoreboard",
      1,
      `A wicket increases the wickets column. Runs stay at ${runs}.`,
    );
  }

  for (let i = 0; i < trickyScenarios.length && questions.length < QUESTION_POOL_SIZE; i += 1) {
    const item = trickyScenarios[i];
    add(item.question, item.correct, item.wrongs, item.category, item.difficulty, item.explanation);
  }

  let variant = 0;
  while (questions.length < QUESTION_POOL_SIZE) {
    const concept = concepts[variant % concepts.length];
    const cue = variant % 2 === 0 ? "match pressure" : "training";
    add(
      `In ${cue}, which choice is linked most closely with ${concept.term}?`,
      concept.definition,
      rotateWrongs(concept.wrongs, variant),
      concept.category,
      Math.min(5, concept.difficulty + (variant % 3 === 0 ? 1 : 0)),
      concept.explanation || concept.definition,
    );
    variant += 1;
  }

  return questions.slice(0, QUESTION_POOL_SIZE).map((question, index) => ({ ...question, id: `crickuru-q-${index + 1}` }));
}

function makeQuestion(id, question, correct, wrongs, category, difficulty, explanation) {
  const base = [correct, ...wrongs.slice(0, 3)];
  while (base.length < 4) base.push(genericWrongAnswers[base.length % genericWrongAnswers.length]);
  const shift = deterministicNumber(`${id}-${question}`, 4);
  const options = base.map((_, index) => base[(index + shift) % 4]);
  return {
    id,
    question,
    options,
    answer: options.findIndex((option) => option === correct),
    category,
    difficulty,
    explanation,
  };
}

const coreFacts = [
  { question: "Which country hosted the first men's Cricket World Cup in 1975?", correct: "England", wrongs: ["India", "Australia", "South Africa"], category: "History", difficulty: 2 },
  { question: "India won the 1983 men's Cricket World Cup final against which team?", correct: "West Indies", wrongs: ["Australia", "England", "Pakistan"], category: "History", difficulty: 2 },
  { question: "Who captained India to the 1983 men's Cricket World Cup title?", correct: "Kapil Dev", wrongs: ["Sunil Gavaskar", "Ravi Shastri", "Mohinder Amarnath"], category: "History", difficulty: 2 },
  { question: "India won the 2011 men's Cricket World Cup final against which team?", correct: "Sri Lanka", wrongs: ["Australia", "New Zealand", "Pakistan"], category: "History", difficulty: 1 },
  { question: "Which city hosted the 2011 men's Cricket World Cup final?", correct: "Mumbai", wrongs: ["Kolkata", "Delhi", "Chennai"], category: "History", difficulty: 2 },
  { question: "Which teams play the Ashes?", correct: "England and Australia", wrongs: ["India and Pakistan", "South Africa and New Zealand", "West Indies and England"], category: "Rivalries", difficulty: 1 },
  { question: "What does ICC stand for?", correct: "International Cricket Council", wrongs: ["Indian Cricket Committee", "International Cup Council", "Inter Club Cricket"], category: "Cricket Bodies", difficulty: 1 },
  { question: "Which ground is often called the Home of Cricket?", correct: "Lord's", wrongs: ["Eden Gardens", "MCG", "Wankhede"], category: "Grounds", difficulty: 2 },
  { question: "Who is famous for a Test batting average of 99.94?", correct: "Don Bradman", wrongs: ["Sachin Tendulkar", "Brian Lara", "Viv Richards"], category: "Legends", difficulty: 2 },
  { question: "Who made 400 not out in a men's Test innings in 2004?", correct: "Brian Lara", wrongs: ["Matthew Hayden", "Virender Sehwag", "Kumar Sangakkara"], category: "Records", difficulty: 3 },
  { question: "Which spinner took 800 wickets in men's Test cricket?", correct: "Muttiah Muralitharan", wrongs: ["Shane Warne", "Anil Kumble", "Ravichandran Ashwin"], category: "Records", difficulty: 3 },
  { question: "Which Indian batter is known for 100 international centuries?", correct: "Sachin Tendulkar", wrongs: ["Virat Kohli", "Rahul Dravid", "MS Dhoni"], category: "Records", difficulty: 1 },
  { question: "Who captained India to the 2007 men's T20 World Cup title?", correct: "MS Dhoni", wrongs: ["Rahul Dravid", "Sourav Ganguly", "Virat Kohli"], category: "History", difficulty: 1 },
  { question: "A Test match can last up to how many scheduled days?", correct: "Five days", wrongs: ["One day", "Three days", "Seven days"], category: "Formats", difficulty: 1 },
  { question: "In a standard ODI innings, how many overs can a team bat?", correct: "50 overs", wrongs: ["20 overs", "60 overs", "90 overs"], category: "Formats", difficulty: 1 },
  { question: "In a standard T20 innings, how many overs can a team bat?", correct: "20 overs", wrongs: ["10 overs", "40 overs", "50 overs"], category: "Formats", difficulty: 1 },
  { question: "How many legal balls are in one over?", correct: "Six", wrongs: ["Five", "Seven", "Eight"], category: "Rules", difficulty: 1 },
  { question: "How many wickets must fall for a team to be all out?", correct: "Ten", wrongs: ["Nine", "Eleven", "Twelve"], category: "Rules", difficulty: 1 },
  { question: "Which player stands directly behind the stumps to receive the ball?", correct: "Wicketkeeper", wrongs: ["Short leg", "Mid-on", "Point"], category: "Fielding", difficulty: 1 },
  { question: "Which dismissal happens when the ball hits the stumps from the bowler's legal delivery?", correct: "Bowled", wrongs: ["Caught", "Run out", "Retired"], category: "Dismissals", difficulty: 1 },
];

const concepts = [
  concept("Yorker", "A full delivery aimed close to the batter's toes or popping crease", ["A short ball above shoulder height", "A shot behind square", "A fielding position near slip"], "Bowling", 2),
  concept("Bouncer", "A short-pitched delivery that rises high toward the batter", ["A slow full toss", "A ball outside the wide line", "A defensive batting shot"], "Bowling", 2),
  concept("Googly", "A leg-spinner's delivery that turns the opposite way from the expected leg break", ["An off-side fielding position", "A straight drive", "A no-ball signal"], "Spin Bowling", 3),
  concept("Doosra", "An off-spinner's delivery designed to turn away like a leg break", ["A left-handed cover drive", "A fielder behind the bowler", "A type of boundary rope"], "Spin Bowling", 4),
  concept("Leg break", "A leg-spin delivery that turns from leg side toward off side to a right-handed batter", ["A ball that hits the pad only", "A shot to fine leg", "A wicketkeeper appeal"], "Spin Bowling", 3),
  concept("Off break", "An off-spin delivery that turns from off side toward leg side to a right-handed batter", ["A fast short ball", "A fielding ring rule", "A run-out attempt"], "Spin Bowling", 3),
  concept("Inswinger", "A delivery that curves in toward the batter", ["A ball that curves away", "A square cut", "A deep fielding position"], "Swing Bowling", 2),
  concept("Outswinger", "A delivery that curves away from the batter", ["A ball that curves in", "A sweep shot", "A wicketkeeping glove"], "Swing Bowling", 2),
  concept("Reverse swing", "Late swing with an older ball, often opposite to normal shine-side movement", ["A reverse sweep shot only", "A fielding penalty", "A batting average rule"], "Swing Bowling", 4),
  concept("Seam movement", "Deviation after the ball lands on the pitch seam", ["Runs from a wide", "A batting stance", "The coin toss result"], "Bowling", 3),
  concept("LBW", "Leg before wicket, when a legal ball would have hit the stumps after striking the batter's pad", ["Last ball win", "Long boundary warning", "Leg bye wicket"], "Dismissals", 3),
  concept("Run out", "A dismissal when the fielding side breaks the stumps while a batter is short of the crease", ["A caught dismissal", "A no-ball penalty", "A batting milestone"], "Dismissals", 2),
  concept("Stumped", "A wicketkeeper dismissal when the batter is out of the crease and not attempting a run", ["A boundary over point", "A bowler injury", "A dead ball call"], "Dismissals", 3),
  concept("Hit wicket", "A dismissal when the striker accidentally breaks their own wicket while playing the ball", ["A dropped catch", "A wide ball", "A super over"], "Dismissals", 3),
  concept("Caught and bowled", "The bowler catches a ball hit by the batter from their own delivery", ["The keeper catches a wide", "A fielder throws down stumps", "A bowler bowls a maiden"], "Dismissals", 2),
  concept("No-ball", "An illegal delivery that gives the batting side one extra run and usually another ball", ["A legal dot ball", "A completed catch", "A six-run shot"], "Rules", 2),
  concept("Wide", "A delivery too far from the batter to reasonably hit, adding an extra run and another ball", ["A clean bowled wicket", "A shot over midwicket", "A powerplay over"], "Rules", 2),
  concept("Bye", "Runs scored when the ball misses bat and body", ["Runs hit by the batter", "Penalty runs for a no-ball", "Runs from the pad"], "Scoring", 2),
  concept("Leg bye", "Runs scored after the ball hits the batter's body or pad, not the bat", ["Runs from the bat edge", "A boundary by overthrow only", "A bowler's wicket"], "Scoring", 2),
  concept("Free hit", "A delivery after certain no-balls where the batter cannot be out in most common ways", ["A compulsory defensive shot", "A fielding timeout", "A coin toss redo"], "Rules", 3),
  concept("Powerplay", "Overs with fielding restrictions, usually encouraging attacking batting", ["A drink break", "A tie-breaking super over", "A batting glove"], "Formats", 2),
  concept("Maiden over", "An over in which no runs are scored off the bat or extras charged to the bowler", ["An over with a wicket every ball", "A six-ball over of wides", "A super over"], "Bowling Stats", 2),
  concept("Hat-trick", "Three wickets by a bowler in three consecutive deliveries", ["Three fours in an over", "Three catches by one fielder in a match", "Three toss wins"], "Bowling", 2),
  concept("Wicket maiden", "A maiden over in which the bowler also takes a wicket", ["A wicket off a wide only", "A match tied by one run", "A no-ball with a wicket"], "Bowling Stats", 3),
  concept("Super over", "A one-over tie-breaker used in limited-overs matches", ["The first over of a Test", "A ten-ball over", "A fielding drill"], "Formats", 2),
  concept("Net run rate", "A run-rate difference measure used for ranking teams in tournaments", ["A batter's average", "A bowler's speed reading", "A coin-toss score"], "Tournament Math", 4),
  concept("Strike rate", "Batting runs per 100 balls faced", ["Bowling runs per over", "A keeper's catch rate", "A fielding angle"], "Batting Stats", 2),
  concept("Economy rate", "Runs conceded per over by a bowler", ["Batting runs per 100 balls", "A team's total wickets", "A catch difficulty score"], "Bowling Stats", 2),
  concept("Batting average", "Runs scored divided by times out", ["Runs per over", "Balls per wicket", "Catches per match"], "Batting Stats", 3),
  concept("Bowling average", "Runs conceded divided by wickets taken", ["Balls faced divided by runs", "Overs divided by maidens", "Catches divided by drops"], "Bowling Stats", 3),
  concept("Dot ball", "A legal delivery with no run scored", ["A ball that hits the helmet", "A boundary four", "A ball changed by umpire"], "Scoring", 1),
  concept("Death overs", "The final overs of a limited-overs innings", ["The first six overs only", "Overs after lunch in Tests", "Overs with no fielders outside"], "Tactics", 2),
  concept("Opening batter", "A batter who starts the innings", ["The last batter", "The wicketkeeper only", "A bowler who starts a spell"], "Roles", 1),
  concept("Finisher", "A batter trusted to close a chase or finish an innings under pressure", ["A new-ball bowler only", "A reserve umpire", "A boundary rope marker"], "Roles", 2),
  concept("All-rounder", "A player who contributes strongly with both batting and bowling", ["Only a wicketkeeper", "Only a captain", "Only a substitute fielder"], "Roles", 1),
  concept("Twelfth player", "A squad player who can substitute for fielding duties under rules", ["The main opening batter", "A second umpire", "A permanent extra wicket"], "Roles", 2),
  concept("Popping crease", "The line that matters for run-outs, stumpings, and front-foot no-balls", ["The boundary rope", "The sightscreen", "The dugout line"], "Pitch", 3),
  concept("Bowling crease", "The line through the stumps at each end of the pitch", ["The 30-yard circle", "The rope line", "The batter's helmet"], "Pitch", 3),
  concept("Slip", "A catching position beside the wicketkeeper behind the batter", ["A deep leg-side boundary", "A shot over cover", "A bowling grip"], "Fielding", 2),
  concept("Gully", "A catching position between slips and point", ["A straight drive", "A long-on boundary fielder", "A spin variation"], "Fielding", 3),
  concept("Point", "An off-side fielding position square of the wicket", ["A leg-side boundary", "A bowling crease", "A type of umpire signal"], "Fielding", 2),
  concept("Cover", "An off-side fielding position in front of square", ["A leg-side short fielder", "A wicketkeeping pad", "A no-ball mark"], "Fielding", 2),
  concept("Mid-off", "A fielder straightish on the off side near the bowler", ["A deep fine-leg fielder", "A short-leg catcher", "A batting grip"], "Fielding", 2),
  concept("Mid-on", "A fielder straightish on the leg side near the bowler", ["A third-man fielder", "A slip catcher", "A bowling style"], "Fielding", 2),
  concept("Square leg", "A leg-side fielding position square of the wicket", ["An off-side cover fielder", "A batting average", "A wicketkeeper stance"], "Fielding", 2),
  concept("Fine leg", "A leg-side fielding position behind square", ["An off-side fielder in front of square", "A drive through cover", "A spin grip"], "Fielding", 2),
  concept("Third man", "A deep off-side position behind square", ["A leg-side short catcher", "The next batter", "The umpire at square leg"], "Fielding", 3),
  concept("Long-on", "A deep boundary fielder straight on the leg side", ["A close slip catcher", "A wicketkeeping glove", "A ball-tracking tool"], "Fielding", 2),
  concept("Long-off", "A deep boundary fielder straight on the off side", ["A leg-side close catcher", "A no-ball type", "A batting guard"], "Fielding", 2),
  concept("Deep midwicket", "A boundary position on the leg side in front of square", ["A keeper standing up", "A straight off-side drive", "A bowling crease mark"], "Fielding", 3),
  concept("Silly point", "A very close catching position on the off side", ["A deep boundary fielder", "A scoreboard error", "A type of free hit"], "Fielding", 3),
  concept("Short leg", "A very close catching position on the leg side", ["A long boundary fielder", "A wide yorker", "A batting milestone"], "Fielding", 3),
  concept("Cover drive", "A front-foot shot through the off-side cover region", ["A pull behind square", "A sweep to leg side", "A leave outside off"], "Batting Shots", 2),
  concept("Pull shot", "A cross-bat shot to a short ball, usually toward leg side", ["A forward defensive", "A late cut to third man", "A yorker delivery"], "Batting Shots", 2),
  concept("Hook shot", "A cross-bat shot to a high short ball around head height", ["A front-foot block", "A spin variation", "A fielding substitute"], "Batting Shots", 3),
  concept("Cut shot", "A square off-side shot to a shorter, wider ball", ["A straight leg-side flick", "A bouncer from a bowler", "A coin toss call"], "Batting Shots", 2),
  concept("Sweep", "A shot played on one knee to a spinner, usually toward leg side", ["A fast yorker", "A slip catch", "A no-ball signal"], "Batting Shots", 2),
  concept("Reverse sweep", "A sweep played in the opposite direction to surprise the field", ["A normal leave", "A keeper's throw", "A bowling change"], "Batting Shots", 3),
  concept("Ramp shot", "A delicate shot using pace to lift the ball behind the keeper", ["A defensive block", "A long-on catch", "A spin run-up"], "Batting Shots", 4),
  concept("Glance", "A soft shot using the ball's pace toward fine leg", ["A hard cover drive", "A bouncer", "A declaration"], "Batting Shots", 2),
  concept("Defensive block", "A safety-first shot to stop the ball near the pitch", ["A six over long-on", "A run-out appeal", "A powerplay rule"], "Batting Shots", 1),
  concept("Bails", "Small pieces placed on top of the stumps", ["Boundary cushions", "Bowling shoes", "Bat grips"], "Equipment", 1),
  concept("Stumps", "The three vertical posts forming a wicket", ["The white boundary line", "The batting gloves", "The bowler's run-up"], "Equipment", 1),
  concept("Pitch", "The central strip where bowling and batting happen", ["The team balcony", "The scoreboard screen", "The toss coin"], "Ground", 1),
  concept("Boundary rope", "The line or rope that marks the edge for fours and sixes", ["The popping crease", "The sight screen", "The dressing room"], "Ground", 1),
  concept("Sightscreen", "A screen behind the bowler's arm that helps batters see the ball", ["A score review system", "A boundary cushion", "A helmet grille"], "Ground", 2),
  concept("Declaration", "A captain's decision to close an innings voluntarily in longer cricket", ["A free hit call", "A wide signal", "A fielding substitution"], "Test Cricket", 3),
  concept("Follow-on", "A rule in longer cricket that can make the trailing team bat again immediately", ["A super over", "A no-ball warning", "A batting powerplay"], "Test Cricket", 4),
];

const trickyScenarios = [
  tricky("A batter is on 99 and the team needs 1. The bowler bowls a wide. What happens to the batter's score?", "The team wins and the batter stays on 99", ["The batter reaches 100", "The ball must be replayed with no run", "The batter is out"], "Tricky Rules", 4, "A wide is an extra, not a run credited to the batter."),
  tricky("On a free hit, the batter is bowled. What is usually the result?", "Not out, and any runs/extras count", ["Out bowled", "Dead ball with no score", "Automatic six"], "Tricky Rules", 3, "A free hit protects the batter from most common dismissals, including bowled."),
  tricky("A ball hits the batter's pad, then they run two leg byes. Who gets those runs?", "The team total gets them as extras", ["The batter gets two runs", "The bowler gets two wickets", "No one gets runs"], "Scoring", 2, "Leg byes go to extras, not the batter."),
  tricky("A no-ball is hit for four off the bat. How many runs are added?", "Five runs", ["Four runs", "One run", "Six runs"], "Scoring", 3, "Four to the batter plus one no-ball extra equals five to the team."),
  tricky("A wide ball runs to the boundary without touching the bat. How many wides are added?", "Five wides", ["Four wides", "One wide", "Six wides"], "Scoring", 3, "The wide penalty plus the boundary counts as five wides."),
  tricky("A bowler sends down six legal balls and concedes no run from bat or bowler-charged extras. What is it called?", "Maiden over", ["Hat-trick", "Super over", "Powerplay"], "Bowling Stats", 2, "A maiden over has no runs charged to the bowler."),
  tricky("A fielder catches a hit before it touches the ground. Which dismissal is this?", "Caught", ["Run out", "LBW", "Stumped"], "Dismissals", 1, "A clean catch dismisses the batter caught."),
  tricky("Which umpire usually watches run-outs at the striker's end from square?", "Square-leg umpire", ["Third man", "Opening batter", "Fine-leg fielder"], "Officials", 2, "The square-leg umpire stands side-on and watches crease calls."),
  tricky("A batter leaves the crease to hit a spinner and misses. The keeper breaks the stumps. What is likely?", "Stumped", ["Bowled", "Hit wicket", "Obstructing the field"], "Dismissals", 3, "A keeper can stump a batter who is out of the crease and not attempting a run."),
  tricky("Which delivery does not count as one of the six legal balls in an over?", "Wide", ["Dot ball", "Single", "Four"], "Rules", 1, "Wides and no-balls are not legal balls."),
  tricky("What is the best first thought when chasing 24 runs from 24 balls?", "One run per ball is enough", ["Six every ball is required", "No wickets matter", "Only boundaries count"], "Chase Math", 2, "Twenty-four from twenty-four is a run-a-ball chase."),
  tricky("A bowler takes wickets on the last two balls of one over and first ball of the next over. What is it?", "Hat-trick", ["Maiden", "Follow-on", "Declaration"], "Bowling", 3, "A hat-trick can span two overs if the wickets are on consecutive deliveries by that bowler."),
];

function concept(term, definition, wrongs, category, difficulty, explanation = "") {
  return { term, definition, wrongs, category, difficulty, explanation };
}

function tricky(question, correct, wrongs, category, difficulty, explanation) {
  return { question, correct, wrongs, category, difficulty, explanation };
}

const genericWrongAnswers = [
  "A fielding restriction",
  "A batting milestone",
  "A coin toss result",
  "A substitute rule",
  "A boundary count",
  "A dressing-room call",
];

const questionBank = buildQuestionBank();

function rotateWrongs(wrongs, shift = 1) {
  return wrongs.map((_, index) => wrongs[(index + shift) % wrongs.length]);
}

function overDistractors(balls) {
  const overs = Math.floor(balls / 6);
  const rem = balls % 6;
  return [
    `${overs}.${Math.min(5, rem + 1)}`,
    `${Math.floor(balls / 5)}.${balls % 5}`,
    `${Math.max(0, overs - 1)}.${rem}`,
  ];
}

function formatOvers(balls) {
  return `${Math.floor(balls / 6)}.${balls % 6}`;
}

async function authRequest(path, options = {}) {
  if (!AUTH_API_URL) throw new Error("Authentication is not configured yet.");
  const response = await fetch(`${AUTH_API_URL}${path}`, {
    credentials: "include",
    headers: { Accept: "application/json", ...(options.body ? { "Content-Type": "application/json" } : {}) },
    ...options,
  });
  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }
  if (!response.ok) throw new Error(payload?.error || "Authentication request failed.");
  return payload;
}

function profileFromAuthUser(user, provider, currentProfile) {
  const id = String(user?.id || user?.sub || "").trim();
  if (!id) throw new Error("The authentication provider returned no stable user id.");
  const name = String(user?.name || user?.email || "Warrior Player")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 40) || "Warrior Player";
  return {
    ...currentProfile,
    id: `auth-${provider}-${id}`,
    name,
    method: provider,
    provider,
    contact: "",
    verified: true,
    registered: true,
  };
}

function readJson(key) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeJson(key, value) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Browser storage can be unavailable or full after a large avatar upload.
  }
}

function periodKeys(date = new Date()) {
  const iso = date.toISOString().slice(0, 10);
  return {
    daily: iso,
    weekly: `${date.getUTCFullYear()}-W${String(isoWeek(date)).padStart(2, "0")}`,
    monthly: iso.slice(0, 7),
    duel: iso.slice(0, 7),
  };
}

function isoWeek(date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
}

function deterministicNumber(seed, max) {
  let hash = 2166136261;
  for (const char of String(seed)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0) % max;
}

function createId(prefix) {
  if (window.crypto?.randomUUID) return `${prefix}-${window.crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function initials(name = "KW") {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "KW";
}

function UploadIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 16V4" /><path d="m7 9 5-5 5 5" /><path d="M5 20h14" /></svg>;
}

function LinkIcon() {
  return <svg viewBox="0 0 24 24" className="h-5 w-5 text-cyan" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 13a5 5 0 0 0 7.54.54l2-2a5 5 0 0 0-7.07-7.07l-1.14 1.14" /><path d="M14 11a5 5 0 0 0-7.54-.54l-2 2a5 5 0 0 0 7.07 7.07l1.14-1.14" /></svg>;
}

function UsersIcon() {
  return <svg viewBox="0 0 24 24" className="h-7 w-7 text-cyan" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
}

function SwordsIcon() {
  return <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2"><path d="m14.5 17.5 3 3 3-3-3-3" /><path d="m3 3 8.5 8.5" /><path d="m3 21 8.5-8.5" /></svg>;
}

function TrophyIcon() {
  return <svg viewBox="0 0 24 24" className="h-7 w-7 text-gold" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" /><path d="M5 9a3 3 0 0 1-3-3V5h5" /><path d="M19 9a3 3 0 0 0 3-3V5h-5" /></svg>;
}

export default QuizPage;
