import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { SKILLS_LIST } from "@/types/project";

/* ─── types ─── */
interface AuthResponse {
  token?: string;
  user?: { id: number; name: string; email: string; role?: string };
  success?: boolean;
  message?: string;
}

declare global {
  interface Window {
    google?: any;
  }
}

/* ─── password strength ─── */
function calcStrength(v: string): number {
  let sc = 0;
  if (v.length >= 8) sc++;
  if (/[A-Z]/.test(v)) sc++;
  if (/[0-9]/.test(v)) sc++;
  if (/[^A-Za-z0-9]/.test(v)) sc++;
  return sc;
}
const COLS = ["#ff6b6b", "#ffa94d", "#2dd4bf", "#2dd4bf"];
const LABS = ["Weak", "Fair", "Good", "Strong"];

/* ══════════════════════════════════════════════════════════════
   LOGIN PAGE
   ══════════════════════════════════════════════════════════════ */
export default function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated } = useAuth();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  /* redirect if already logged in */
  useEffect(() => {
    if (isAuthenticated) navigate("/projects", { replace: true });
  }, [isAuthenticated, navigate]);

  /* page state */
  const [page, setPage] = useState<"login" | "register">("login");

  /* login fields */
  const [lEmail, setLEmail] = useState("");
  const [lPass, setLPass] = useState("");
  const [lShowPw, setLShowPw] = useState(false);
  const [lRole, setLRole] = useState<"manager" | "developer">("manager");
  const [lMsg, setLMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const [lBusy, setLBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [fpEmail, setFpEmail] = useState("");
  const [fpNewPass, setFpNewPass] = useState("");
  const [fpConfirmPass, setFpConfirmPass] = useState("");
  const [fpMsg, setFpMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const [fpBusy, setFpBusy] = useState(false);

  /* register fields */
  const [rName, setRName] = useState("");
  const [rEmail, setREmail] = useState("");
  const [rPass, setRPass] = useState("");
  const [rConfirm, setRConfirm] = useState("");
  const [rShowPw, setRShowPw] = useState(false);
  const [rShowCf, setRShowCf] = useState(false);
  const [rRole, setRRole] = useState<"manager" | "developer">("developer");
  const [rSkills, setRSkills] = useState<string[]>([]);
  const [rExperienceLevel, setRExperienceLevel] = useState<"junior" | "mid" | "senior">("mid");
  const [rMsg, setRMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const [rBusy, setRBusy] = useState(false);
  const [strength, setStrength] = useState(0);

  /* ── Login submit ── */
  const doLogin = useCallback(async () => {
    if (!lEmail || !lPass || !lRole) { setLMsg({ text: "⚠️  Please fill in all fields.", type: "err" }); return; }
    if (!lEmail.includes("@")) { setLMsg({ text: "⚠️  Enter a valid email address.", type: "err" }); return; }
    setLBusy(true);
    setLMsg(null);
    try {
      const d = await apiFetch<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: lEmail, password: lPass, role: lRole }),
      });
      if (d.token && d.user) {
        login(d.token, d.user);
        setLMsg({ text: "✅  Login successful! Redirecting...", type: "ok" });
        // Redirect developers to dashboard, managers to projects
        const redirectPath = (d.user.role || '').toLowerCase() === 'developer' ? '/dashboard' : '/projects';
        setTimeout(() => navigate(redirectPath), 1000);
      } else {
        setLMsg({ text: "❌  " + (d.message || "Invalid email or password."), type: "err" });
      }
    } catch {
      setLMsg({ text: "❌  Server error. Please try again.", type: "err" });
    } finally {
      setLBusy(false);
    }
  }, [lEmail, lPass, lRole, login, navigate]);

  /* ── Register submit ── */
  const doRegister = useCallback(async () => {
    if (!rName || !rEmail || !rPass || !rConfirm || !rRole) { setRMsg({ text: "⚠️  Please fill in all fields.", type: "err" }); return; }
    if (!rEmail.includes("@")) { setRMsg({ text: "⚠️  Enter a valid email address.", type: "err" }); return; }
    if (rPass.length < 6) { setRMsg({ text: "⚠️  Password must be at least 6 characters.", type: "err" }); return; }
    if (rPass !== rConfirm) { setRMsg({ text: "⚠️  Passwords do not match.", type: "err" }); return; }

    const parsedSkills = rSkills;

    if (rRole === "developer" && parsedSkills.length === 0) {
      setRMsg({ text: "⚠️  Add at least one skill for team/developer role.", type: "err" });
      return;
    }

    setRBusy(true);
    setRMsg(null);
    try {
      const d = await apiFetch<AuthResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name: rName,
          email: rEmail,
          password: rPass,
          role: rRole,
          skills: parsedSkills,
          experienceLevel: rExperienceLevel,
        }),
      });
      if (d.success || d.token) {
        setRMsg({ text: "✅  Account created! Please sign in.", type: "ok" });
        setTimeout(() => {
          setPage("login");
          setRMsg(null);
          setRSkills([]);
          setRExperienceLevel("mid");
        }, 1400);
      } else {
        setRMsg({ text: "❌  " + (d.message || "Registration failed."), type: "err" });
      }
    } catch {
      setRMsg({ text: "❌  Server error. Please try again.", type: "err" });
    } finally {
      setRBusy(false);
    }
  }, [rName, rEmail, rPass, rConfirm, rRole, rSkills, rExperienceLevel]);

  const doGoogleLogin = useCallback(async (credential: string) => {
    setGoogleBusy(true);
    setLMsg(null);
    setRMsg(null);
    try {
      const d = await apiFetch<AuthResponse>("/auth/google", {
        method: "POST",
        body: JSON.stringify({ credential }),
      });

      if (d.token && d.user) {
        login(d.token, d.user);
        setLMsg({ text: "✅  Google login successful! Redirecting...", type: "ok" });
        setTimeout(() => navigate("/projects"), 700);
      } else {
        setLMsg({ text: "❌  " + (d.message || "Google sign-in failed."), type: "err" });
      }
    } catch {
      setLMsg({ text: "❌  Google sign-in failed. Please try again.", type: "err" });
    } finally {
      setGoogleBusy(false);
    }
  }, [login, navigate]);

  const startGoogleSignIn = useCallback(() => {
    if (!googleClientId) {
      setLMsg({ text: "❌  Google sign-in is not configured. Missing VITE_GOOGLE_CLIENT_ID.", type: "err" });
      return;
    }

    const initializeGoogle = () => {
      if (!window.google?.accounts?.id) {
        setLMsg({ text: "❌  Google SDK failed to load.", type: "err" });
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response: { credential?: string }) => {
          if (!response?.credential) {
            setLMsg({ text: "❌  Google did not return a credential.", type: "err" });
            return;
          }
          void doGoogleLogin(response.credential);
        },
      });

      window.google.accounts.id.prompt();
    };

    if (window.google?.accounts?.id) {
      initializeGoogle();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-google-identity="true"]');
    if (existingScript) {
      existingScript.addEventListener("load", initializeGoogle, { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.setAttribute("data-google-identity", "true");
    script.onload = initializeGoogle;
    script.onerror = () => setLMsg({ text: "❌  Failed to load Google sign-in script.", type: "err" });
    document.head.appendChild(script);
  }, [doGoogleLogin, googleClientId]);

  const doForgotPassword = useCallback(async () => {
    if (!fpEmail || !fpNewPass || !fpConfirmPass) {
      setFpMsg({ text: "⚠️  Please fill in all fields.", type: "err" });
      return;
    }
    if (!fpEmail.includes("@")) {
      setFpMsg({ text: "⚠️  Enter a valid email address.", type: "err" });
      return;
    }
    if (fpNewPass.length < 6) {
      setFpMsg({ text: "⚠️  Password must be at least 6 characters.", type: "err" });
      return;
    }
    if (fpNewPass !== fpConfirmPass) {
      setFpMsg({ text: "⚠️  New passwords do not match.", type: "err" });
      return;
    }

    setFpBusy(true);
    setFpMsg(null);
    try {
      const d = await apiFetch<AuthResponse>("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: fpEmail, newPassword: fpNewPass }),
      });

      if (d.success) {
        setFpMsg({ text: "✅  Password reset successful. Please sign in.", type: "ok" });
        setLMsg({ text: "✅  Password updated in database. Sign in with your new password.", type: "ok" });
        setTimeout(() => {
          setShowForgot(false);
          setFpEmail("");
          setFpNewPass("");
          setFpConfirmPass("");
          setFpMsg(null);
        }, 900);
      } else {
        setFpMsg({ text: "❌  " + (d.message || "Failed to reset password."), type: "err" });
      }
    } catch {
      setFpMsg({ text: "❌  Server error. Please try again.", type: "err" });
    } finally {
      setFpBusy(false);
    }
  }, [fpConfirmPass, fpEmail, fpNewPass]);

  /* enter-key support */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (page === "login") doLogin();
      else doRegister();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [page, doLogin, doRegister]);

  /* transition helper */
  const switchTo = (p: "login" | "register") => {
    setLMsg(null);
    setRMsg(null);
    setPage(p);
  };

  return (
    <>
      {/* ── Injected styles (migrated 1:1 from login.html) ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap');

        .lp-root *, .lp-root *::before, .lp-root *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .lp-root {
          --bg: #0f1117; --surface: #1a1d27; --surface2: #1e2130; --border: #2a2d3e;
          --teal: #2dd4bf; --teal-dark: #14b8a6; --teal-glow: rgba(45,212,191,0.20);
          --teal-sub: rgba(45,212,191,0.07); --text: #f0f2f8; --muted: #8b90a7; --dim: #464b62;
          min-height: 100vh; background: var(--bg);
          font-family: 'Plus Jakarta Sans', sans-serif; color: var(--text);
          display: flex; align-items: center; justify-content: center;
          position: relative; overflow: hidden;
        }

        /* glows */
        .lp-glow1 {
          position: fixed; width: 520px; height: 520px; border-radius: 50%; filter: blur(110px);
          background: rgba(45,212,191,0.07); top: -170px; right: -120px; z-index: 0;
          animation: lp-drift 14s ease-in-out infinite; pointer-events: none;
        }
        .lp-glow2 {
          position: fixed; width: 400px; height: 400px; border-radius: 50%; filter: blur(110px);
          background: rgba(45,212,191,0.05); bottom: -130px; left: -90px; z-index: 0;
          animation: lp-drift 14s ease-in-out infinite -7s; pointer-events: none;
        }
        @keyframes lp-drift {
          0%,100% { transform: translate(0,0) scale(1); }
          40%     { transform: translate(22px,-26px) scale(1.04); }
          70%     { transform: translate(-16px,22px) scale(0.97); }
        }
        .lp-dots {
          position: fixed; inset: 0; z-index: 0; pointer-events: none;
          background-image: radial-gradient(circle, rgba(45,212,191,0.055) 1px, transparent 1px);
          background-size: 30px 30px;
        }

        /* card */
        .lp-card {
          position: relative; z-index: 1; width: 100%; max-width: 440px; margin: 20px;
          background: var(--surface); border: 1px solid var(--border); border-radius: 22px;
          padding: 44px 40px 36px;
          box-shadow: 0 30px 70px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03), inset 0 1px 0 rgba(255,255,255,0.04);
        }
        .lp-card::before {
          content: ''; position: absolute; top: -1px; left: 50%; transform: translateX(-50%);
          width: 55%; height: 1px;
          background: linear-gradient(90deg, transparent, var(--teal), transparent);
        }

        /* slide-in */
        @keyframes lp-slideIn {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .lp-animate { animation: lp-slideIn 0.4s cubic-bezier(0.22,0.68,0,1.15) both; }

        /* brand */
        .lp-brand { display: flex; align-items: center; gap: 13px; margin-bottom: 32px; }
        .lp-logo {
          width: 46px; height: 46px; border-radius: 13px; flex-shrink: 0;
          background: linear-gradient(135deg, var(--teal-dark), var(--teal));
          display: flex; align-items: center; justify-content: center; font-size: 22px;
          box-shadow: 0 0 28px var(--teal-glow), 0 4px 12px rgba(0,0,0,0.3);
        }
        .lp-brand-name { font-size: 22px; font-weight: 800; letter-spacing: -0.3px; }
        .lp-brand-name span { color: var(--teal); }
        .lp-brand-sub { font-size: 12px; color: var(--muted); margin-top: 2px; }

        /* heading */
        .lp-heading { font-size: 27px; font-weight: 800; letter-spacing: -0.5px; margin-bottom: 5px; }
        .lp-subhead { font-size: 14px; color: var(--muted); margin-bottom: 28px; line-height: 1.55; }

        /* message */
        .lp-msg { display: none; padding: 11px 14px; border-radius: 10px; font-size: 13px; margin-bottom: 18px; text-align: center; }
        .lp-msg.err { display: block; background: rgba(255,107,107,0.1); border: 1px solid rgba(255,107,107,0.28); color: #ffb3b3; }
        .lp-msg.ok  { display: block; background: rgba(45,212,191,0.09); border: 1px solid rgba(45,212,191,0.28); color: var(--teal); }

        /* fields */
        .lp-field { margin-bottom: 16px; }
        .lp-field label {
          display: block; font-size: 12px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.5px; color: var(--muted); margin-bottom: 7px;
        }
        .lp-wrap { position: relative; }
        .lp-ico {
          position: absolute; left: 13px; top: 50%; transform: translateY(-50%);
          font-size: 15px; pointer-events: none; opacity: 0.38;
        }
        .lp-input {
          width: 100%; padding: 13px 14px 13px 41px;
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 10px; color: var(--text);
          font-family: 'Plus Jakarta Sans', sans-serif; font-size: 14px; outline: none;
          transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
        }
        .lp-input:focus {
          border-color: var(--teal);
          box-shadow: 0 0 0 3px rgba(45,212,191,0.12);
          background: rgba(45,212,191,0.03);
        }
        .lp-input::placeholder { color: var(--dim); }
        .lp-eye {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: var(--muted); font-size: 15px; padding: 3px; transition: color 0.2s;
        }
        .lp-eye:hover { color: var(--teal); }

        /* opts row */
        .lp-opts {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 22px; margin-top: -2px;
        }
        .lp-chk { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--muted); cursor: pointer; }
        .lp-chk input { accent-color: var(--teal); width: 15px; height: 15px; padding: 0; }
        .lp-forgot {
          font-size: 13px;
          color: var(--teal);
          text-decoration: none;
          background: none;
          border: none;
          padding: 0;
          cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .lp-forgot:hover { opacity: 0.78; }

        /* strength bar */
        .lp-sbar { display: flex; gap: 4px; margin-top: 7px; }
        .lp-seg  { flex: 1; height: 3px; border-radius: 3px; background: var(--border); transition: background 0.3s; }
        .lp-slbl { font-size: 11px; color: var(--dim); margin-top: 4px; }

        /* CTA button */
        .lp-cta {
          width: 100%; padding: 14px;
          background: var(--teal); border: none; border-radius: 11px;
          color: #0b1512; font-family: 'Plus Jakarta Sans', sans-serif;
          font-size: 15px; font-weight: 700; cursor: pointer; position: relative; overflow: hidden;
          transition: background 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 4px 22px rgba(45,212,191,0.32); letter-spacing: 0.2px;
        }
        .lp-cta:hover { background: #25c4b0; transform: translateY(-1px); box-shadow: 0 8px 30px rgba(45,212,191,0.46); }
        .lp-cta:active { transform: translateY(0); }
        .lp-cta:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }
        .lp-cta::after {
          content: ''; position: absolute; top: 0; left: -100%; width: 55%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent);
          transform: skewX(-18deg); animation: lp-sweep 3.5s ease-in-out infinite;
        }
        @keyframes lp-sweep { 0%{left:-100%} 40%{left:150%} 100%{left:150%} }
        .lp-spin {
          display: inline-block; width: 18px; height: 18px; border-radius: 50%;
          border: 2px solid rgba(11,21,18,0.3); border-top-color: #0b1512;
          animation: lp-rot 0.7s linear infinite; vertical-align: middle;
        }
        @keyframes lp-rot { to { transform: rotate(360deg); } }

        /* divider */
        .lp-div {
          display: flex; align-items: center; gap: 12px;
          margin: 20px 0; font-size: 12px; color: var(--dim);
        }
        .lp-div::before, .lp-div::after { content: ''; flex: 1; height: 1px; background: var(--border); }

        /* socials */
        .lp-socials { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .lp-soc {
          display: flex; align-items: center; justify-content: center; gap: 8px; padding: 11px;
          border-radius: 10px; background: var(--surface2); border: 1px solid var(--border);
          color: var(--muted); font-size: 13px; font-weight: 500;
          font-family: 'Plus Jakarta Sans', sans-serif; cursor: pointer;
          transition: border-color 0.2s, color 0.2s, background 0.2s;
        }
        .lp-soc:hover { border-color: var(--teal); color: var(--teal); background: var(--teal-sub); }
        .lp-soc img { width: 15px; height: 15px; }

        /* bottom link */
        .lp-blink { text-align: center; font-size: 13px; color: var(--muted); margin-top: 20px; }
        .lp-blink a { color: var(--teal); font-weight: 600; text-decoration: none; cursor: pointer; }
        .lp-blink a:hover { text-decoration: underline; }

        /* terms */
        .lp-terms { font-size: 11.5px; color: var(--dim); text-align: center; margin-top: 13px; line-height: 1.6; }
        .lp-terms a { color: var(--muted); text-decoration: underline; }

        /* trust badges */
        .lp-trust {
          display: flex; align-items: center; justify-content: center; gap: 20px;
          margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--border);
        }
        .lp-ti { display: flex; align-items: center; gap: 5px; font-size: 11px; color: var(--dim); }

        /* back button */
        .lp-back {
          display: inline-flex; align-items: center; gap: 6px;
          font-size: 13px; color: var(--muted); cursor: pointer; margin-bottom: 22px;
          background: none; border: none; font-family: 'Plus Jakarta Sans', sans-serif;
          padding: 0; transition: color 0.2s;
        }
        .lp-back:hover { color: var(--teal); }
      `}</style>

      <div className="lp-root">
        <div className="lp-glow1" />
        <div className="lp-glow2" />
        <div className="lp-dots" />

        <div className="lp-card">

          {/* ══════════ LOGIN ══════════ */}
          {page === "login" && (
            <div className="lp-animate">
              <div className="lp-brand">
                <div className="lp-logo">✦</div>
                <div>
                  <div className="lp-brand-name">TaskFlow <span>AI</span></div>
                  <div className="lp-brand-sub">Smart project management with auto-assignment</div>
                </div>
              </div>

              <div className="lp-heading">Welcome back 👋</div>
              <div className="lp-subhead">Sign in to your workspace and keep your team moving.</div>

              {lMsg && <div className={`lp-msg ${lMsg.type}`}>{lMsg.text}</div>}

              <div className="lp-field">
                <label htmlFor="le">Email Address</label>
                <div className="lp-wrap">
                  <span className="lp-ico">✉️</span>
                  <input
                    id="le" type="email" className="lp-input"
                    placeholder="you@company.com" autoComplete="email"
                    value={lEmail} onChange={e => setLEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="lp-field">
                <label htmlFor="lr">Role</label>
                <div className="lp-wrap">
                  <span className="lp-ico">👥</span>
                  <select id="lr" className="lp-input" value={lRole} onChange={(e) => setLRole(e.target.value as "manager" | "developer") }>
                    <option value="manager">Manager / Admin</option>
                    <option value="developer">Team / Developer</option>
                  </select>
                </div>
              </div>

              <div className="lp-field">
                <label htmlFor="lp-pw">Password</label>
                <div className="lp-wrap">
                  <span className="lp-ico">🔒</span>
                  <input
                    id="lp-pw" type={lShowPw ? "text" : "password"} className="lp-input"
                    placeholder="Enter your password"
                    value={lPass} onChange={e => setLPass(e.target.value)}
                  />
                  <button className="lp-eye" type="button" onClick={() => setLShowPw(p => !p)}>👁</button>
                </div>
              </div>

              <div className="lp-opts">
                <label className="lp-chk"><input type="checkbox" /> Remember me</label>
                <button
                  type="button"
                  className="lp-forgot"
                  onClick={() => {
                    setShowForgot(true);
                    setFpEmail(lEmail);
                    setFpMsg(null);
                  }}
                >
                  Forgot password?
                </button>
              </div>

              <button className="lp-cta" id="btn-login" onClick={doLogin} disabled={lBusy}>
                {lBusy ? <span className="lp-spin" /> : "Sign In →"}
              </button>

              <div className="lp-div">or continue with</div>
              <div className="lp-socials">
                <button className="lp-soc" type="button" onClick={startGoogleSignIn} disabled={googleBusy}>
                  <img src="https://www.google.com/favicon.ico" alt="G" /> Google
                </button>
                <button className="lp-soc" type="button">
                  <img src="https://github.com/favicon.ico" alt="GH" /> GitHub
                </button>
              </div>

              <div className="lp-blink">
                Don't have an account?{" "}
                <a onClick={() => switchTo("register")}>Create one free →</a>
              </div>

              <div className="lp-trust">
                <div className="lp-ti">🔐 SSL Secured</div>
                <div className="lp-ti">🛡️ GDPR Safe</div>
                <div className="lp-ti">⚡ 99.9% Uptime</div>
              </div>
            </div>
          )}

          {/* ══════════ REGISTER ══════════ */}
          {page === "register" && (
            <div className="lp-animate">
              <div className="lp-brand">
                <div className="lp-logo">✦</div>
                <div>
                  <div className="lp-brand-name">TaskFlow <span>AI</span></div>
                  <div className="lp-brand-sub">Smart project management with auto-assignment</div>
                </div>
              </div>

              <button className="lp-back" type="button" onClick={() => switchTo("login")}>
                ← Back to Sign In
              </button>

              <div className="lp-heading">Create account ✦</div>
              <div className="lp-subhead">Join TaskFlow AI and manage projects intelligently.</div>

              {rMsg && <div className={`lp-msg ${rMsg.type}`}>{rMsg.text}</div>}

              <div className="lp-field">
                <label htmlFor="rn">Full Name</label>
                <div className="lp-wrap">
                  <span className="lp-ico">👤</span>
                  <input
                    id="rn" type="text" className="lp-input" placeholder="Aisha Patel"
                    value={rName} onChange={e => setRName(e.target.value)}
                  />
                </div>
              </div>

              <div className="lp-field">
                <label htmlFor="re">Email Address</label>
                <div className="lp-wrap">
                  <span className="lp-ico">✉️</span>
                  <input
                    id="re" type="email" className="lp-input" placeholder="you@company.com"
                    value={rEmail} onChange={e => setREmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="lp-field">
                <label htmlFor="rr">Role</label>
                <div className="lp-wrap">
                  <span className="lp-ico">👥</span>
                  <select id="rr" className="lp-input" value={rRole} onChange={(e) => setRRole(e.target.value as "manager" | "developer") }>
                    <option value="manager">Manager / Admin</option>
                    <option value="developer">Team / Developer</option>
                  </select>
                </div>
              </div>

              {rRole === "developer" && (
                <>
                  <div className="lp-field">
                    <label htmlFor="r-exp">Experience Level</label>
                    <div className="lp-wrap">
                      <span className="lp-ico">🏅</span>
                      <select
                        id="r-exp"
                        className="lp-input"
                        value={rExperienceLevel}
                        onChange={(e) => setRExperienceLevel(e.target.value as "junior" | "mid" | "senior")}
                      >
                        <option value="junior">Junior</option>
                        <option value="mid">Mid</option>
                        <option value="senior">Senior</option>
                      </select>
                    </div>
                  </div>

                  <div className="lp-field">
                    <label>Skills (select one or more)</label>
                    <div
                      style={{
                        background: "var(--surface2)",
                        border: "1px solid var(--border)",
                        borderRadius: "10px",
                        padding: "10px",
                        maxHeight: "160px",
                        overflowY: "auto",
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "8px",
                      }}
                    >
                      {SKILLS_LIST.map((skill) => {
                        const selected = rSkills.includes(skill);
                        return (
                          <button
                            key={skill}
                            type="button"
                            onClick={() =>
                              setRSkills((prev) =>
                                prev.includes(skill)
                                  ? prev.filter((item) => item !== skill)
                                  : [...prev, skill]
                              )
                            }
                            style={{
                              border: selected ? "1px solid var(--teal)" : "1px solid var(--border)",
                              background: selected ? "var(--teal-sub)" : "transparent",
                              color: selected ? "var(--teal)" : "var(--muted)",
                              borderRadius: "999px",
                              padding: "6px 10px",
                              fontSize: "12px",
                              cursor: "pointer",
                            }}
                          >
                            {skill}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              <div className="lp-field">
                <label htmlFor="rp-pw">Password</label>
                <div className="lp-wrap">
                  <span className="lp-ico">🔒</span>
                  <input
                    id="rp-pw" type={rShowPw ? "text" : "password"} className="lp-input"
                    placeholder="Create a strong password"
                    value={rPass}
                    onChange={e => { setRPass(e.target.value); setStrength(calcStrength(e.target.value)); }}
                  />
                  <button className="lp-eye" type="button" onClick={() => setRShowPw(p => !p)}>👁</button>
                </div>
                <div className="lp-sbar">
                  {[0, 1, 2, 3].map(i => (
                    <div
                      key={i} className="lp-seg"
                      style={{ background: i < strength ? COLS[strength - 1] : "var(--border)" }}
                    />
                  ))}
                </div>
                <div className="lp-slbl" style={{ color: strength > 0 ? COLS[strength - 1] : "var(--dim)" }}>
                  {rPass.length > 0 ? (LABS[strength - 1] ?? "") : ""}
                </div>
              </div>

              <div className="lp-field">
                <label htmlFor="rc">Confirm Password</label>
                <div className="lp-wrap">
                  <span className="lp-ico">🔒</span>
                  <input
                    id="rc" type={rShowCf ? "text" : "password"} className="lp-input"
                    placeholder="Re-enter your password"
                    value={rConfirm} onChange={e => setRConfirm(e.target.value)}
                  />
                  <button className="lp-eye" type="button" onClick={() => setRShowCf(p => !p)}>👁</button>
                </div>
              </div>

              <button className="lp-cta" id="btn-register" onClick={doRegister} disabled={rBusy} style={{ marginTop: "4px" }}>
                {rBusy ? <span className="lp-spin" /> : "Create Account →"}
              </button>

              <div className="lp-div">or sign up with</div>
              <div className="lp-socials">
                <button className="lp-soc" type="button" onClick={startGoogleSignIn} disabled={googleBusy}>
                  <img src="https://www.google.com/favicon.ico" alt="G" /> Google
                </button>
                <button className="lp-soc" type="button">
                  <img src="https://github.com/favicon.ico" alt="GH" /> GitHub
                </button>
              </div>

              <div className="lp-terms">
                By registering you agree to our <a href="#">Terms</a> &amp; <a href="#">Privacy Policy</a>.
              </div>

              <div className="lp-blink" style={{ marginTop: "14px" }}>
                Already have an account? <a onClick={() => switchTo("login")}>Sign in →</a>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ══════════ FORGOT PASSWORD MODAL ══════════ */}
      {showForgot && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,17,23,0.85)",
          backdropFilter: "blur(4px)",
          display: "grid",
          placeItems: "center",
          zIndex: 1000
        }}>
          <div className="lp-card lp-animate" style={{ maxWidth: "440px", paddingTop: "28px", paddingBottom: "26px" }}>
            <button
              className="lp-back"
              type="button"
              onClick={() => { setShowForgot(false); setFpMsg(null); }}
              style={{ marginBottom: "18px" }}
            >
              ← Back to Sign In
            </button>

            <div className="lp-heading" style={{ fontSize: "24px" }}>Reset Password</div>
            <div className="lp-subhead" style={{ marginBottom: "18px" }}>Set a new password for your account.</div>

            {fpMsg && <div className={`lp-msg ${fpMsg.type}`}>{fpMsg.text}</div>}

            <div className="lp-field">
              <label htmlFor="fp-email">Email Address</label>
              <div className="lp-wrap">
                <span className="lp-ico">✉️</span>
                <input
                  id="fp-email"
                  type="email"
                  className="lp-input"
                  placeholder="you@company.com"
                  value={fpEmail}
                  onChange={(e) => setFpEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="lp-field">
              <label htmlFor="fp-new">New Password</label>
              <div className="lp-wrap">
                <span className="lp-ico">🔒</span>
                <input
                  id="fp-new"
                  type="password"
                  className="lp-input"
                  placeholder="New password"
                  value={fpNewPass}
                  onChange={(e) => setFpNewPass(e.target.value)}
                />
              </div>
            </div>

            <div className="lp-field">
              <label htmlFor="fp-confirm">Confirm New Password</label>
              <div className="lp-wrap">
                <span className="lp-ico">🔒</span>
                <input
                  id="fp-confirm"
                  type="password"
                  className="lp-input"
                  placeholder="Confirm new password"
                  value={fpConfirmPass}
                  onChange={(e) => setFpConfirmPass(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px" }}>
              <button
                className="lp-soc"
                type="button"
                onClick={() => { setShowForgot(false); setFpMsg(null); }}
              >
                Cancel
              </button>
              <button className="lp-cta" type="button" onClick={doForgotPassword} disabled={fpBusy}>
                {fpBusy ? <span className="lp-spin" /> : "Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
