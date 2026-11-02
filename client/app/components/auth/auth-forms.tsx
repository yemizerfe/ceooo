"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Crown,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type LoginFormData, type SignupFormData, validateLogin, validateSignup } from "@/lib/validation/auth";
import { useAuthStore } from "@/store/authStore";
import { getAuthenticatedHomePath } from "@/lib/authRouting";
import { useAuth } from "@/hooks/useAuth";

type TabType = "login" | "signup";
type ViewType = "auth" | "forgot-password" | "reset-password";

const initialLoginData: LoginFormData = {
  email: "",
  password: "",
  rememberMe: false,
};

const initialSignupData: SignupFormData = {
  email: "",
  password: "",
  confirmPassword: "",
  agreeTerms: false,
};

export function AuthForms() {
  const [, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const { login, signup, isLoading, error, clearError, isAuthenticated } = useAuth();

  // /signup must open on the sign-up form, not the login form with the tab left
  // to be clicked.
  const [activeTab, setActiveTab] = useState<TabType>(() =>
    pathname?.includes("signup") ? "signup" : "login"
  );
  const [currentView, setCurrentView] = useState<ViewType>("auth");
  const [loginData, setLoginData] = useState<LoginFormData>(initialLoginData);
  const [signupData, setSignupData] = useState<SignupFormData>(initialSignupData);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const message = params.get("message");
    const email = params.get("email");
    const oauthResult = params.get("oauth");

    if (oauthResult) {
      // Cancelling a provider's consent screen lands here with `?oauth=cancelled`.
      // Acknowledge it neutrally and clean the URL so a refresh is back to normal.
      startTransition(() => {
        setAuthNotice(
          oauthResult === "cancelled"
            ? "Sign-in was cancelled — you're back on the page you left off."
            : "That sign-in could not be completed. Please try again."
        );
      });
      params.delete("oauth");
      params.delete("reason");
      const query = params.toString();
      window.history.replaceState(
        {},
        "",
        `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`
      );
    }

    if (message) {
      startTransition(() => {
        setAuthNotice(message);
        setActiveTab("signup");
      });
    }

    if (email) {
      startTransition(() => {
        setSignupData((prev) => ({ ...prev, email }));
      });
    }
  }, [startTransition]);

  // Already-signed-in visitors skip the form. Read the live store value rather
  // than the render-scoped `user`: this effect can fire on the same tick as a
  // successful login, when the captured `user` is still null and would send an
  // administrator to /dashboard instead of /admin.
  useEffect(() => {
    if (!isAuthenticated || isLoading) return;

    const go = () => {
      const current = useAuthStore.getState();
      if (!current.isAuthenticated || current.isLoading) return;
      router.replace(getAuthenticatedHomePath(current.user));
    };

    if (pathname.includes("/signin") || pathname.includes("/signup") || pathname.includes("/login")) {
      // Nudge already-signed-in visitors away from the form, but give the login
      // handler time to finish so the two redirects never disagree.
      const timer = setTimeout(go, 600);
      return () => clearTimeout(timer);
    }

    go();
  }, [isAuthenticated, isLoading, pathname, router]);

  useEffect(() => {
    clearError();
    startTransition(() => {
      setFormErrors({});
      setSuccessMessage("");
    });
  }, [activeTab, currentView, clearError, startTransition]);

  // Keep the visible form in step with the URL when the visitor moves between
  // /login and /signup (e.g. via a navbar link) without remounting the page.
  useEffect(() => {
    if (!pathname) return;
    setActiveTab(pathname.includes("signup") ? "signup" : "login");
    setCurrentView("auth");
  }, [pathname]);

  const handleLoginChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { id, value, type, checked } = e.target;
      setLoginData((prev) => ({
        ...prev,
        [id]: type === "checkbox" ? checked : value,
      }));

      if (formErrors[id]) {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    },
    [formErrors]
  );

  const handleSignupChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { id, value, type, checked } = e.target;
      setSignupData((prev) => ({
        ...prev,
        [id]: type === "checkbox" ? checked : value,
      }));

      if (formErrors[id]) {
        setFormErrors((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });
      }
    },
    [formErrors]
  );

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors = validateLogin(loginData);

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      await login(loginData);
      setSuccessMessage("Login successful! Redirecting...");
      setTimeout(() => {
        router.push(getAuthenticatedHomePath(useAuthStore.getState().user));
      }, 500);
    } catch (loginError) {
      const code = (loginError as { code?: string } | null)?.code;

      if (code === "ACCOUNT_NOT_FOUND") {
        clearError();
        setFormErrors({});
        setSignupData((prev) => ({ ...prev, email: loginData.email }));
        setActiveTab("signup");
        setAuthNotice(`No account found for ${loginData.email}. Create one below to continue.`);
      }

      if (code === "NO_PASSWORD_SET") {
        clearError();
        setAuthNotice(loginError instanceof Error ? loginError.message : "This account does not have a password yet. Use password reset to create one.");
      }
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors = validateSignup(signupData);

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      await signup({ email: signupData.email, password: signupData.password });
      setSuccessMessage("Account created successfully! Redirecting...");
      router.push("/dashboard?new=true");
    } catch (signupError) {
      const code = (signupError as { code?: string } | null)?.code;

      if (code === "ACCOUNT_EXISTS") {
        clearError();
        setFormErrors({});
        setLoginData((prev) => ({ ...prev, email: signupData.email }));
        setActiveTab("login");
        setAuthNotice(`You already have an account for ${signupData.email}. Sign in instead.`);
      } else if (code === "NO_PASSWORD_SET") {
        clearError();
        setFormErrors({});
        setAuthNotice(signupError instanceof Error ? signupError.message : "This account does not have a password yet. Use password reset to create one.");
      }
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!forgotPasswordEmail || !/\S+@\S+\.\S+/.test(forgotPasswordEmail)) {
      setFormErrors({ email: "Please enter a valid email address" });
      return;
    }

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotPasswordEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage("If an account exists with this email, you will receive a password reset link.");
        setCurrentView("auth");
      } else {
        setFormErrors({ email: data.error || "Failed to process request" });
      }
    } catch {
      setFormErrors({ email: "An error occurred while sending the reset link." });
    }
  };

  const renderAuthContent = () => {
    if (currentView === "forgot-password") {
      return (
        <div className="space-y-5">
          <div className="flex items-center gap-3">
            <Button type="button" variant="ghost" size="icon" onClick={() => setCurrentView("auth")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <p className="text-lg font-semibold text-foreground">Reset password</p>
              <p className="text-sm text-muted-foreground">We will send a link to your email.</p>
            </div>
          </div>

          {successMessage ? (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          ) : null}

          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Email address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  value={forgotPasswordEmail}
                  onChange={(e) => {
                    setForgotPasswordEmail(e.target.value);
                    if (formErrors.email) setFormErrors({});
                  }}
                  className="pl-9"
                  placeholder="you@company.com"
                />
              </div>
              {formErrors.email ? <p className="text-sm text-destructive">{formErrors.email}</p> : null}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
              Send reset link
            </Button>
          </form>
        </div>
      );
    }

    return (
      <div className="space-y-5">
        <div className="rounded-full border border-border/70 bg-muted/40 p-1">
          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab("login")}
              className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                activeTab === "login" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("signup")}
              className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                activeTab === "signup" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign up
            </button>
          </div>
        </div>

        {authNotice ? (
          <Alert className="border-blue-200 bg-blue-50 text-blue-700">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{authNotice}</AlertDescription>
          </Alert>
        ) : null}

        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {successMessage ? (
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-700">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        ) : null}

        <AnimatePresence mode="wait">
          {activeTab === "login" ? (
            <motion.form
              key="login-form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleLogin}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={loginData.email}
                    onChange={handleLoginChange}
                    className="pl-9"
                    placeholder="you@company.com"
                    aria-invalid={Boolean(formErrors.email)}
                  />
                </div>
                {formErrors.email ? <p className="text-sm text-destructive">{formErrors.email}</p> : null}
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <button type="button" className="text-xs text-primary hover:underline" onClick={() => setCurrentView("forgot-password")}>
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={loginData.password}
                    onChange={handleLoginChange}
                    className="pl-9 pr-10"
                    placeholder="••••••••"
                    aria-invalid={Boolean(formErrors.password)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-2.5 text-muted-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formErrors.password ? <p className="text-sm text-destructive">{formErrors.password}</p> : null}
              </div>

              <div className="flex items-center justify-between text-sm text-muted-foreground">
                {/* The control and its text are siblings, not a <label> wrapper:
                    a label around an interactive button forwards each click back
                    to the control, which toggled it twice and left it unchecked.
                    A real Checkbox also replaces <Input type="checkbox">, whose
                    text-field styling shrank the hit target to a few pixels. */}
                <div className="inline-flex items-center gap-2">
                  <Checkbox
                    id="rememberMe"
                    checked={loginData.rememberMe}
                    onCheckedChange={(checked) =>
                      setLoginData((prev) => ({ ...prev, rememberMe: checked === true }))
                    }
                  />
                  <label htmlFor="rememberMe" className="cursor-pointer select-none">
                    Remember me
                  </label>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Sign in
              </Button>
            </motion.form>
          ) : (
            <motion.form
              key="signup-form"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleSignup}
              className="space-y-4"
            >
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={signupData.email}
                    onChange={handleSignupChange}
                    className="pl-9"
                    placeholder="you@company.com"
                    aria-invalid={Boolean(formErrors.email)}
                  />
                </div>
                {formErrors.email ? <p className="text-sm text-destructive">{formErrors.email}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={signupData.password}
                    onChange={handleSignupChange}
                    className="pl-9 pr-10"
                    placeholder="Create a password"
                    aria-invalid={Boolean(formErrors.password)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((value) => !value)}
                    className="absolute right-3 top-2.5 text-muted-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formErrors.password ? <p className="text-sm text-destructive">{formErrors.password}</p> : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirmPassword">Confirm password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={signupData.confirmPassword}
                    onChange={handleSignupChange}
                    className="pl-9 pr-10"
                    placeholder="Confirm password"
                    aria-invalid={Boolean(formErrors.confirmPassword)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute right-3 top-2.5 text-muted-foreground"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {formErrors.confirmPassword ? <p className="text-sm text-destructive">{formErrors.confirmPassword}</p> : null}
              </div>

              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <Checkbox
                  id="agreeTerms"
                  className="mt-0.5"
                  checked={signupData.agreeTerms}
                  onCheckedChange={(checked) => {
                    setSignupData((prev) => ({ ...prev, agreeTerms: checked === true }));
                    if (formErrors.agreeTerms) {
                      setFormErrors((prev) => {
                        const next = { ...prev };
                        delete next.agreeTerms;
                        return next;
                      });
                    }
                  }}
                />
                <label htmlFor="agreeTerms" className="cursor-pointer select-none">
                  I agree to the terms and privacy policy.
                </label>
              </div>
              {formErrors.agreeTerms ? <p className="text-sm text-destructive">{formErrors.agreeTerms}</p> : null}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                Create account
              </Button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 relative overflow-hidden py-8 dark:from-[#071a2e] dark:via-[#0b1f33] dark:to-[#0d2b4a]">
      <div className="absolute top-10 left-10 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
      <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="absolute inset-0 ceo-grid-fade opacity-30" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-md items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="w-full">
          <Card className="overflow-hidden border-border/60 bg-background/80 shadow-2xl backdrop-blur-xl">
            <CardHeader className="space-y-4 pb-4 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 shadow-lg shadow-blue-500/30">
                <Crown className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">CEOOO</span>
                </h1>
                <p className="mt-2 text-sm text-muted-foreground">Executive operations, simplified.</p>
              </div>
            </CardHeader>

            <CardContent className="px-6 pb-2">{renderAuthContent()}</CardContent>            <CardFooter className="px-6 py-4 border-t bg-muted/30">
              <p className="text-center text-xs text-muted-foreground">
                Use your email and password to sign in.
              </p>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
