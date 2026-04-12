"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { ScrollText, Loader2, Mail, Lock, Globe } from "lucide-react";
import { useLocale } from "@/lib/i18n/context";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { locale, setLocale, t } = useLocale();
  const redirectTo = searchParams.get("redirectTo") ?? "/wiki";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const supabase = createClient();
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push(redirectTo);
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
        });
        if (error) throw error;
        setMessage(t("login.checkEmail"));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-wiki-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Language toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={() => setLocale(locale === "en" ? "ko" : "en")}
            className="flex items-center gap-1.5 text-wiki-muted hover:text-wiki-text text-xs transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            {locale === "en" ? "한국어" : "English"}
          </button>
        </div>

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <ScrollText className="w-8 h-8 text-wiki-accent" />
          <span className="text-2xl font-bold text-wiki-text">Mnemo</span>
        </div>

        <div className="bg-wiki-surface border border-wiki-border rounded-2xl p-8">
          <h1 className="text-xl font-semibold text-wiki-text mb-1">
            {mode === "signin" ? t("login.signIn") : t("login.signUp")}
          </h1>
          <p className="text-wiki-muted text-sm mb-6">
            {mode === "signin" ? t("login.signInDesc") : t("login.signUpDesc")}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wiki-muted" />
              <input
                type="email"
                placeholder={t("login.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-wiki-bg border border-wiki-border rounded-lg pl-10 pr-4 py-3 text-wiki-text placeholder-wiki-muted focus:outline-none focus:border-wiki-accent transition-colors text-sm"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-wiki-muted" />
              <input
                type="password"
                placeholder={t("login.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full bg-wiki-bg border border-wiki-border rounded-lg pl-10 pr-4 py-3 text-wiki-text placeholder-wiki-muted focus:outline-none focus:border-wiki-accent transition-colors text-sm"
              />
            </div>

            {error && (
              <p className="text-wiki-err text-sm bg-wiki-err-soft border border-wiki-err/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
            {message && (
              <p className="text-wiki-ok text-sm bg-wiki-ok-soft border border-wiki-ok/20 rounded-lg px-3 py-2">
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-wiki-accent hover:bg-wiki-accent/80 disabled:opacity-50 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {mode === "signin" ? t("login.signIn") : t("login.signUp")}
            </button>
          </form>

          <p className="text-center text-wiki-muted text-sm mt-6">
            {mode === "signin" ? t("login.noAccount") : t("login.hasAccount")}{" "}
            <button
              onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(null); }}
              className="text-wiki-link hover:text-wiki-link-hover transition-colors"
            >
              {mode === "signin" ? t("login.signUpLink") : t("login.signInLink")}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
