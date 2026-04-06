import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { apiFetch } from "@/lib/api";
import { X, User, Mail, Lock, Save, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ProfileSettingsProps {
  onClose: () => void;
}

export function ProfileSettings({ onClose }: ProfileSettingsProps) {
  const { user, login } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "password">("profile");

  // Profile form state
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [profileMsg, setProfileMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const [profileBusy, setProfileBusy] = useState(false);

  // Password form state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<{ text: string; type: "ok" | "err" } | null>(null);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [strength, setStrength] = useState(0);

  const calcStrength = (v: string) => {
    let sc = 0;
    if (v.length >= 8) sc++;
    if (/[A-Z]/.test(v)) sc++;
    if (/[0-9]/.test(v)) sc++;
    if (/[^A-Za-z0-9]/.test(v)) sc++;
    return sc;
  };

  const COLS = ["#ff6b6b", "#ffa94d", "#2dd4bf", "#2dd4bf"];
  const LABS = ["Weak", "Fair", "Good", "Strong"];

  const handleUpdateProfile = async () => {
    if (!name || !email) {
      setProfileMsg({ text: "⚠️ Please fill in all fields.", type: "err" });
      return;
    }
    setProfileBusy(true);
    setProfileMsg(null);
    try {
      const data = await apiFetch("/auth/profile", {
        method: "PUT",
        body: JSON.stringify({ name, email }),
      });
      if (data.success) {
        setProfileMsg({ text: "✅ " + data.message, type: "ok" });
        // Update user in context
        if (user) {
          login(localStorage.getItem("token")!, { ...user, name, email });
        }
        setTimeout(() => onClose(), 1500);
      } else {
        setProfileMsg({ text: "❌ " + data.message, type: "err" });
      }
    } catch {
      setProfileMsg({ text: "❌ Server error. Please try again.", type: "err" });
    } finally {
      setProfileBusy(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordMsg({ text: "⚠️ Please fill in all fields.", type: "err" });
      return;
    }
    if (newPassword.length < 6) {
      setPasswordMsg({ text: "⚠️ Password must be at least 6 characters.", type: "err" });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ text: "⚠️ New passwords do not match.", type: "err" });
      return;
    }
    setPasswordBusy(true);
    setPasswordMsg(null);
    try {
      const data = await apiFetch("/auth/password", {
        method: "PUT",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (data.success) {
        setPasswordMsg({ text: "✅ " + data.message, type: "ok" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => onClose(), 1500);
      } else {
        setPasswordMsg({ text: "❌ " + data.message, type: "err" });
      }
    } catch {
      setPasswordMsg({ text: "❌ Server error. Please try again.", type: "err" });
    } finally {
      setPasswordBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md glass-card rounded-2xl border border-border/40 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/40">
          <h2 className="text-lg font-semibold">Account Settings</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-card/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border/40">
          <button
            onClick={() => { setActiveTab("profile"); setProfileMsg(null); setPasswordMsg(null); }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "profile"
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </div>
          </button>
          <button
            onClick={() => { setActiveTab("password"); setProfileMsg(null); setPasswordMsg(null); }}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === "password"
                ? "bg-primary/10 text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" />
              Password
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <AnimatePresence mode="wait">
            {activeTab === "profile" ? (
              <motion.div
                key="profile"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase mb-2">
                    <User className="w-3.5 h-3.5 inline mr-1" />
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-card/50 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase mb-2">
                    <Mail className="w-3.5 h-3.5 inline mr-1" />
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-card/50 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                    placeholder="you@example.com"
                  />
                </div>

                {profileMsg && (
                  <div className={`p-3 rounded-lg text-sm ${
                    profileMsg.type === "ok"
                      ? "bg-success/10 border border-success/30 text-success"
                      : "bg-destructive/10 border border-destructive/30 text-destructive"
                  }`}>
                    {profileMsg.text}
                  </div>
                )}

                <button
                  onClick={handleUpdateProfile}
                  disabled={profileBusy}
                  className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {profileBusy ? (
                    <div className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save Changes
                    </>
                  )}
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="password"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase mb-2">
                    Current Password
                  </label>
                  <div className="relative">
                    <input
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg bg-card/50 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all pr-10"
                      placeholder="Enter current password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent(!showCurrent)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showCurrent ? <Lock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setStrength(calcStrength(e.target.value));
                      }}
                      className="w-full px-4 py-2.5 rounded-lg bg-card/50 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all pr-10"
                      placeholder="New password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNew ? <Lock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </button>
                  </div>
                  {newPassword && (
                    <div className="mt-2">
                      <div className="flex gap-1">
                        {[0, 1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="flex-1 h-1.5 rounded-full"
                            style={{
                              backgroundColor: i < strength ? COLS[strength - 1] : "hsl(var(--border))",
                            }}
                          />
                        ))}
                      </div>
                      <p className="text-xs mt-1" style={{ color: COLS[strength - 1] }}>
                        {LABS[strength - 1] || ""}
                      </p>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg bg-card/50 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all pr-10"
                      placeholder="Confirm new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirm ? <Lock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {passwordMsg && (
                  <div className={`p-3 rounded-lg text-sm ${
                    passwordMsg.type === "ok"
                      ? "bg-success/10 border border-success/30 text-success"
                      : "bg-destructive/10 border border-destructive/30 text-destructive"
                  }`}>
                    {passwordMsg.text}
                  </div>
                )}

                <button
                  onClick={handleChangePassword}
                  disabled={passwordBusy}
                  className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {passwordBusy ? (
                    <div className="w-4 h-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      Change Password
                    </>
                  )}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
