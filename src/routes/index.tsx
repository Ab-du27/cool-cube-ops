import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Languages, Moon, Snowflake, Sun } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { fetchRole } from "@/lib/data";
import { useApp } from "@/lib/i18n";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "کارگەی سەھۆڵ | چوونەژوورەوە — Ice Factory Login" },
      {
        name: "description",
        content:
          "Sign in to the ice factory system: employees record daily row sales and the weekly checklist, the manager tracks income, debts and production.",
      },
      { property: "og:title", content: "کارگەی سەھۆڵ | Ice Factory System" },
      {
        property: "og:description",
        content: "Daily ice row sales, weekly maintenance checklist and manager reports in Kurdish and Arabic.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { t, lang, setLang, theme, toggleTheme } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"in" | "up">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!active || !data.session) return;
      const role = await fetchRole();
      navigate({ to: role === "admin" ? "/admin" : "/employee", replace: true });
    });
    return () => {
      active = false;
    };
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) throw signInError;
      const role = await fetchRole();
      navigate({ to: role === "admin" ? "/admin" : "/employee", replace: true });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("errorTitle"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex items-center justify-end gap-2 p-4">
        <Button variant="secondary" size="sm" onClick={() => setLang(lang === "ku" ? "ar" : "ku")}>
          <Languages className="size-4" />
          {lang === "ku" ? "عربي" : "کوردی"}
        </Button>
        <Button variant="secondary" size="icon" onClick={toggleTheme} aria-label="theme">
          {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
        </Button>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 pb-12">
        <div className="w-full max-w-md">
          <div className="frost-gradient mb-6 flex items-center gap-3 rounded-2xl p-5">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-card/85 text-primary">
              <Snowflake className="size-7" />
            </span>
            <div>
              <h1 className="text-xl font-bold text-primary-foreground">{t("appName")}</h1>
              <p className="text-xs text-primary-foreground/80">{t("signInOnce")}</p>
            </div>
          </div>

          <form onSubmit={submit} className="frost-panel space-y-4 p-6">
            <div className="flex gap-2">
              <Button
                type="button"
                variant={mode === "in" ? "default" : "secondary"}
                className="flex-1"
                onClick={() => setMode("in")}
              >
                {t("signIn")}
              </Button>
              <Button
                type="button"
                variant={mode === "up" ? "default" : "secondary"}
                className="flex-1"
                onClick={() => setMode("up")}
              >
                {t("signUp")}
              </Button>
            </div>

            {mode === "up" ? (
              <div className="space-y-2">
                <Label htmlFor="fullName">{t("fullName")}</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="email">{t("email")}</Label>
              <Input
                id="email"
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t("password")}</Label>
              <Input
                id="password"
                type="password"
                dir="ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            </div>

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? t("loading") : mode === "in" ? t("signIn") : t("signUp")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
