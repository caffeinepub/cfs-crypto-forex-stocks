import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  CreditCard,
  Delete,
  Loader2,
  Monitor,
  ShieldAlert,
  Smartphone,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useActor } from "../hooks/useActor";
import {
  type SessionLog,
  clearSessionLogs,
  getSessionLogs,
} from "../utils/sessionTracker";

const ADMIN_PIN = "9999";
const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  const ss = String(d.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}

function SummaryCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  accent?: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2">
      <div
        className={`w-9 h-9 rounded-lg flex items-center justify-center ${
          accent ?? "bg-primary/10"
        }`}
      >
        {icon}
      </div>
      <div className="text-2xl font-bold text-foreground font-mono">
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function StripeConfigSection() {
  const { actor, isFetching } = useActor();
  const [secretKey, setSecretKey] = useState("");
  const [countries, setCountries] = useState("IN,US,GB,AE");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reconfigure, setReconfigure] = useState(false);

  const { data: isConfigured, refetch } = useQuery({
    queryKey: ["stripeConfigured"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isStripeConfigured();
    },
    enabled: !!actor && !isFetching,
  });

  const handleSave = async () => {
    if (!actor || !secretKey.trim()) return;
    setSaving(true);
    try {
      const allowedCountries = countries
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
      await actor.setStripeConfiguration({
        secretKey: secretKey.trim(),
        allowedCountries,
      });
      setSaved(true);
      setReconfigure(false);
      setSecretKey("");
      refetch();
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  // showForm computed inline below

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-primary" />
          Stripe Payment Setup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConfigured && !reconfigure ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
              <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
              <span className="text-sm text-green-400 font-medium">
                Stripe is configured and active
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setReconfigure(true)}
              data-ocid="admin.stripe_save.button"
            >
              Reconfigure
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {saved && (
              <div className="text-xs text-green-400 font-medium">
                ✓ Configuration saved!
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Stripe Secret Key
              </Label>
              <Input
                data-ocid="admin.stripe_key.input"
                type="password"
                placeholder="sk_live_... or sk_test_..."
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                className="bg-muted/30 border-border font-mono text-xs"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Allowed Countries (comma-separated)
              </Label>
              <Input
                type="text"
                placeholder="IN,US,GB,AE"
                value={countries}
                onChange={(e) => setCountries(e.target.value)}
                className="bg-muted/30 border-border font-mono text-xs"
              />
            </div>
            <div className="flex gap-2">
              <Button
                data-ocid="admin.stripe_save.button"
                disabled={saving || !secretKey.trim()}
                onClick={handleSave}
                size="sm"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1.5 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Configuration"
                )}
              </Button>
              {reconfigure && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setReconfigure(false)}
                >
                  Cancel
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminPage() {
  const [pinInput, setPinInput] = useState("");
  const [error, setError] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [logs, setLogs] = useState<SessionLog[]>(() =>
    getSessionLogs().sort(
      (a, b) =>
        new Date(b.loginTime).getTime() - new Date(a.loginTime).getTime(),
    ),
  );
  const [clearDialogOpen, setClearDialogOpen] = useState(false);

  function shake() {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  }

  function handleDigit(d: string) {
    if (pinInput.length >= 4) return;
    const next = pinInput + d;
    setPinInput(next);
    setError("");
    if (next.length === 4) {
      setTimeout(() => {
        if (next === ADMIN_PIN) {
          setAuthenticated(true);
        } else {
          setError("Incorrect Admin PIN.");
          setPinInput("");
          shake();
        }
      }, 150);
    }
  }

  function handleDelete() {
    setPinInput((p) => p.slice(0, -1));
    setError("");
  }

  function handleClearAll() {
    clearSessionLogs();
    setLogs([]);
    setClearDialogOpen(false);
  }

  // Stats
  const totalSessions = logs.length;
  const uniqueUsers = new Set(logs.map((l) => l.userId)).size;
  const completedSessions = logs.filter((l) => l.durationMinutes !== null);
  const avgDuration =
    completedSessions.length > 0
      ? Math.round(
          (completedSessions.reduce(
            (sum, l) => sum + (l.durationMinutes ?? 0),
            0,
          ) /
            completedSessions.length) *
            10,
        ) / 10
      : 0;
  const activeSessions = logs.filter((l) => l.logoutTime === null).length;

  // suppress unused warning for useEffect import
  useEffect(() => {}, []);

  if (!authenticated) {
    return (
      <div
        className="min-h-screen bg-background flex flex-col items-center justify-center p-6"
        data-ocid="admin.page"
      >
        <div className="w-full max-w-xs flex flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-amber-500" />
            </div>
            <h1 className="text-xl font-bold text-foreground">Admin Panel</h1>
            <p className="text-sm text-muted-foreground text-center">
              Enter 4-digit admin PIN
            </p>
          </div>

          {/* PIN dots */}
          <div
            className={`flex gap-4 transition-transform ${
              shaking ? "animate-bounce" : ""
            }`}
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  i < pinInput.length
                    ? "bg-amber-500 border-amber-500 scale-110"
                    : "border-muted-foreground/40 bg-transparent"
                }`}
              />
            ))}
          </div>

          {error ? (
            <div
              className="flex items-center gap-2 text-destructive text-sm"
              data-ocid="admin.pin.input"
            >
              <XCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          ) : (
            <div className="h-5" />
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-3 w-full">
            {DIGITS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => handleDigit(d)}
                className="h-16 rounded-2xl bg-card border border-border text-xl font-semibold text-foreground active:scale-95 transition-transform hover:bg-muted"
              >
                {d}
              </button>
            ))}
            <div />
            <button
              type="button"
              onClick={() => handleDigit("0")}
              className="h-16 rounded-2xl bg-card border border-border text-xl font-semibold text-foreground active:scale-95 transition-transform hover:bg-muted"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="h-16 rounded-2xl bg-card border border-border flex items-center justify-center active:scale-95 transition-transform hover:bg-muted"
            >
              <Delete className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          <button
            type="button"
            data-ocid="admin.pin.submit_button"
            onClick={() => {
              if (pinInput === ADMIN_PIN) setAuthenticated(true);
              else {
                setError("Incorrect Admin PIN.");
                setPinInput("");
                shake();
              }
            }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Confirm
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-background p-4 md:p-8"
      data-ocid="admin.page"
    >
      <div className="max-w-5xl mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <ShieldAlert className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Admin Panel - Session Analytics
            </h1>
            <p className="text-xs text-muted-foreground">
              This data is for the app owner only
            </p>
          </div>
        </div>

        {/* Summary cards */}
        <div
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
          data-ocid="admin.stats.panel"
        >
          <SummaryCard
            label="Total Sessions"
            value={totalSessions}
            icon={<Monitor className="w-4 h-4 text-primary" />}
            accent="bg-primary/10"
          />
          <SummaryCard
            label="Unique Users"
            value={uniqueUsers}
            icon={<Users className="w-4 h-4 text-blue-400" />}
            accent="bg-blue-400/10"
          />
          <SummaryCard
            label="Avg Duration (min)"
            value={avgDuration}
            icon={<Monitor className="w-4 h-4 text-amber-400" />}
            accent="bg-amber-400/10"
          />
          <SummaryCard
            label="Active Sessions"
            value={activeSessions}
            icon={<Monitor className="w-4 h-4 text-green-400" />}
            accent="bg-green-400/10"
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Session Logs ({logs.length})
          </h2>
          <Button
            variant="destructive"
            size="sm"
            className="gap-2"
            onClick={() => setClearDialogOpen(true)}
            data-ocid="admin.clear.delete_button"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Data
          </Button>
        </div>

        {/* Table */}
        {logs.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
            No session data found.
          </div>
        ) : (
          <div
            className="bg-card border border-border rounded-xl overflow-hidden"
            data-ocid="admin.sessions.table"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                      #
                    </th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                      User
                    </th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                      Login Time
                    </th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                      Logout Time
                    </th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                      Duration
                    </th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                      Device
                    </th>
                    <th className="text-left px-4 py-3 text-muted-foreground font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, idx) => (
                    <tr
                      key={`${log.userId}-${log.loginTime}`}
                      className="border-b border-border/50 hover:bg-muted/20 transition-colors"
                      data-ocid="admin.sessions.row"
                    >
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                        {idx + 1}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-medium text-foreground truncate max-w-[120px] block">
                          {log.userId}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                        {formatDate(log.loginTime)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs whitespace-nowrap">
                        {log.logoutTime ? formatDate(log.logoutTime) : "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                        {log.durationMinutes !== null
                          ? `${log.durationMinutes} min`
                          : "-"}
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          {log.device === "Mobile" ? (
                            <Smartphone className="w-3.5 h-3.5" />
                          ) : (
                            <Monitor className="w-3.5 h-3.5" />
                          )}
                          {log.device}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {log.logoutTime === null ? (
                          <Badge className="bg-green-500/15 text-green-400 border-green-500/30 text-xs">
                            Active
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-muted-foreground text-xs"
                          >
                            Ended
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Stripe Configuration */}
        <StripeConfigSection />

        {/* Disclaimer */}
        <p className="text-center text-xs text-muted-foreground pb-4">
          This data is for the app owner only. Do not share with others.
        </p>
      </div>

      {/* Clear confirmation dialog */}
      <Dialog open={clearDialogOpen} onOpenChange={setClearDialogOpen}>
        <DialogContent data-ocid="admin.clear.dialog">
          <DialogHeader>
            <DialogTitle>Delete All Data?</DialogTitle>
            <DialogDescription>
              This action cannot be undone. All session logs will be permanently
              deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setClearDialogOpen(false)}
              data-ocid="admin.clear.cancel_button"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleClearAll}
              data-ocid="admin.clear.confirm_button"
            >
              Yes, Delete All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
