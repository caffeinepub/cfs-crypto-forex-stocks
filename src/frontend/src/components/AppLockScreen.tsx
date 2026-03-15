import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  ChevronLeft,
  Delete,
  Fingerprint,
  KeyRound,
  Shield,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { recordSessionStart } from "../utils/sessionTracker";

const PIN_KEY = "cfs_app_pin";
const PIN_SET_KEY = "cfs_pin_set";
const WEBAUTHN_CRED_KEY = "cfs_webauthn_cred";
const KYC_AADHAAR_KEY = "cfs_kyc_aadhaar";
const KYC_PAN_KEY = "cfs_kyc_pan";

function savePIN(pin: string) {
  localStorage.setItem(PIN_KEY, btoa(pin));
  localStorage.setItem(PIN_SET_KEY, "1");
}

function verifyPIN(pin: string): boolean {
  const stored = localStorage.getItem(PIN_KEY);
  return stored === btoa(pin);
}

function isPINSet(): boolean {
  return localStorage.getItem(PIN_SET_KEY) === "1";
}

function clearPIN() {
  localStorage.removeItem(PIN_KEY);
  localStorage.removeItem(PIN_SET_KEY);
  localStorage.removeItem(WEBAUTHN_CRED_KEY);
}

// Save KYC details when user registers (called from RegisterPage)
export function saveKYCForRecovery(aadhaar: string, pan: string) {
  localStorage.setItem(KYC_AADHAAR_KEY, btoa(aadhaar));
  localStorage.setItem(KYC_PAN_KEY, btoa(pan.toUpperCase()));
}

function verifyKYC(aadhaar: string, pan: string): boolean {
  const storedAadhaar = localStorage.getItem(KYC_AADHAAR_KEY);
  const storedPan = localStorage.getItem(KYC_PAN_KEY);
  // If no KYC stored, accept any valid-format input (demo)
  if (!storedAadhaar || !storedPan) {
    return (
      /^[0-9]{12}$/.test(aadhaar) &&
      /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan.toUpperCase())
    );
  }
  return (
    storedAadhaar === btoa(aadhaar) && storedPan === btoa(pan.toUpperCase())
  );
}

async function isWebAuthnAvailable(): Promise<boolean> {
  try {
    return (
      !!window.PublicKeyCredential &&
      (await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable())
    );
  } catch {
    return false;
  }
}

async function registerWebAuthn(userId: string): Promise<boolean> {
  try {
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const credential = (await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: { name: "CFS App", id: window.location.hostname },
        user: {
          id: new TextEncoder().encode(userId),
          name: userId,
          displayName: "CFS User",
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" },
          { alg: -257, type: "public-key" },
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
        },
        timeout: 60000,
      },
    })) as PublicKeyCredential | null;
    if (credential) {
      localStorage.setItem(WEBAUTHN_CRED_KEY, credential.id);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

async function authenticateWebAuthn(): Promise<boolean> {
  try {
    const credId = localStorage.getItem(WEBAUTHN_CRED_KEY);
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);
    const allow: PublicKeyCredentialDescriptor[] = credId
      ? [
          {
            id: Uint8Array.from(atob(credId), (c) => c.charCodeAt(0)),
            type: "public-key",
          },
        ]
      : [];
    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials: allow,
        userVerification: "required",
        timeout: 60000,
      },
    });
    return !!assertion;
  } catch {
    return false;
  }
}

type Mode =
  | "setup"
  | "setup_confirm"
  | "verify"
  | "forgot_kyc"
  | "forgot_newpin"
  | "forgot_confirm";

const PIN_DOTS = [0, 1, 2, 3, 4, 5];
const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];

interface Props {
  userId: string;
  onUnlocked: () => void;
}

export default function AppLockScreen({ userId, onUnlocked }: Props) {
  const [mode, setMode] = useState<Mode>(isPINSet() ? "verify" : "setup");
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [biometricRegistered, setBiometricRegistered] = useState(false);
  const [shaking, setShaking] = useState(false);

  // Forgot PIN KYC state
  const [kycAadhaar, setKycAadhaar] = useState("");
  const [kycPan, setKycPan] = useState("");
  const [kycError, setKycError] = useState("");

  useEffect(() => {
    isWebAuthnAvailable().then((avail) => {
      setBiometricAvailable(avail);
      setBiometricRegistered(!!localStorage.getItem(WEBAUTHN_CRED_KEY));
    });
  }, []);

  function shake() {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  }

  function handleDigit(d: string) {
    if (pin.length >= 6) return;
    const newPin = pin + d;
    setPin(newPin);
    setError("");
    if (newPin.length === 6) {
      setTimeout(() => processPin(newPin), 150);
    }
  }

  function handleDelete() {
    setPin((p) => p.slice(0, -1));
    setError("");
  }

  function processPin(enteredPin: string) {
    if (mode === "setup") {
      setFirstPin(enteredPin);
      setPin("");
      setMode("setup_confirm");
    } else if (mode === "setup_confirm") {
      if (enteredPin === firstPin) {
        savePIN(enteredPin);
        setSuccess(true);
        recordSessionStart(userId);
        setTimeout(onUnlocked, 800);
      } else {
        setError("PIN match nahi hua. Phir se try karein.");
        setPin("");
        shake();
      }
    } else if (mode === "forgot_newpin") {
      setFirstPin(enteredPin);
      setPin("");
      setMode("forgot_confirm");
    } else if (mode === "forgot_confirm") {
      if (enteredPin === firstPin) {
        clearPIN();
        savePIN(enteredPin);
        setSuccess(true);
        recordSessionStart(userId);
        setTimeout(onUnlocked, 800);
      } else {
        setError("PIN match nahi hua. Phir se try karein.");
        setPin("");
        shake();
      }
    } else {
      // verify mode
      if (verifyPIN(enteredPin)) {
        setSuccess(true);
        recordSessionStart(userId);
        setTimeout(onUnlocked, 600);
      } else {
        setError("Galat PIN. Phir se try karein.");
        setPin("");
        shake();
      }
    }
  }

  function handleKYCVerify() {
    setKycError("");
    if (!kycAadhaar || !kycPan) {
      setKycError("Aadhaar aur PAN dono bharna zaroori hai.");
      return;
    }
    if (verifyKYC(kycAadhaar.trim(), kycPan.trim())) {
      setPin("");
      setError("");
      setMode("forgot_newpin");
    } else {
      setKycError("Aadhaar ya PAN sahi nahi hai. Phir check karein.");
    }
  }

  async function handleBiometric() {
    setError("");
    if (mode === "verify") {
      if (!biometricRegistered) {
        const ok = await registerWebAuthn(userId);
        if (ok) {
          setBiometricRegistered(true);
          setSuccess(true);
          recordSessionStart(userId);
          setTimeout(onUnlocked, 600);
        } else {
          setError("Fingerprint setup nahi ho saka.");
        }
      } else {
        const ok = await authenticateWebAuthn();
        if (ok) {
          setSuccess(true);
          recordSessionStart(userId);
          setTimeout(onUnlocked, 600);
        } else {
          setError("Fingerprint verify nahi hua.");
          shake();
        }
      }
    } else {
      const ok = await registerWebAuthn(userId);
      if (ok) {
        setBiometricRegistered(true);
        setError("");
      } else {
        setError("Fingerprint register nahi ho saka.");
      }
    }
  }

  // Forgot PIN KYC screen
  if (mode === "forgot_kyc") {
    return (
      <div
        className="min-h-screen bg-background flex flex-col items-center justify-center p-6"
        data-ocid="applock.page"
      >
        <div className="w-full max-w-xs flex flex-col gap-6">
          <button
            type="button"
            onClick={() => {
              setMode("verify");
              setKycAadhaar("");
              setKycPan("");
              setKycError("");
            }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            data-ocid="applock.cancel_button"
          >
            <ChevronLeft className="w-4 h-4" /> Wapas jayein
          </button>

          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <KeyRound className="w-8 h-8 text-amber-500" />
            </div>
            <h1 className="text-xl font-bold text-foreground">PIN Reset</h1>
            <p className="text-sm text-muted-foreground text-center">
              KYC verify karke naya PIN set karein
            </p>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div>
              <Label htmlFor="kyc-aadhaar">Aadhaar Number (12 digits)</Label>
              <Input
                id="kyc-aadhaar"
                data-ocid="applock.input"
                placeholder="123456789012"
                maxLength={12}
                value={kycAadhaar}
                onChange={(e) =>
                  setKycAadhaar(e.target.value.replace(/\D/g, ""))
                }
                className="mt-1 font-mono tracking-widest"
              />
            </div>
            <div>
              <Label htmlFor="kyc-pan">PAN Card (e.g. ABCDE1234F)</Label>
              <Input
                id="kyc-pan"
                data-ocid="applock.input"
                placeholder="ABCDE1234F"
                maxLength={10}
                value={kycPan}
                onChange={(e) =>
                  setKycPan(
                    e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""),
                  )
                }
                className="mt-1 font-mono tracking-widest uppercase"
              />
            </div>

            {kycError && (
              <div
                className="flex items-center gap-2 text-destructive text-sm"
                data-ocid="applock.error_state"
              >
                <XCircle className="w-4 h-4" />
                <span>{kycError}</span>
              </div>
            )}

            <Button
              className="w-full"
              onClick={handleKYCVerify}
              data-ocid="applock.primary_button"
            >
              KYC Verify Karein
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Demo: Koi bhi valid-format Aadhaar (12 digits) aur PAN
              (AAAAA0000A) chalega
            </p>
          </div>
        </div>
      </div>
    );
  }

  const title =
    mode === "setup"
      ? "6-Digit PIN Set Karein"
      : mode === "setup_confirm"
        ? "PIN Confirm Karein"
        : mode === "forgot_newpin"
          ? "Naya PIN Set Karein"
          : mode === "forgot_confirm"
            ? "Naya PIN Confirm Karein"
            : "PIN Enter Karein";

  const subtitle =
    mode === "setup"
      ? "Apna naya 6-digit security PIN choose karein"
      : mode === "setup_confirm"
        ? "Dobara wahi PIN enter karein"
        : mode === "forgot_newpin"
          ? "KYC verified! Naya 6-digit PIN daalen"
          : mode === "forgot_confirm"
            ? "Confirm karne ke liye wahi PIN dobara daalen"
            : "App open karne ke liye PIN dalein";

  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-center p-6"
      data-ocid="applock.page"
    >
      <div className="w-full max-w-xs flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-3">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Shield className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-foreground">{title}</h1>
          <p className="text-sm text-muted-foreground text-center">
            {subtitle}
          </p>
        </div>

        {/* PIN dots */}
        <div
          className={`flex gap-4 transition-transform ${shaking ? "animate-bounce" : ""}`}
          data-ocid="applock.panel"
        >
          {PIN_DOTS.map((i) => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                success
                  ? "bg-green-500 border-green-500"
                  : i < pin.length
                    ? "bg-primary border-primary scale-110"
                    : "border-muted-foreground/40 bg-transparent"
              }`}
            />
          ))}
        </div>

        {/* Error / Success */}
        {error ? (
          <div
            className="flex items-center gap-2 text-destructive text-sm"
            data-ocid="applock.error_state"
          >
            <XCircle className="w-4 h-4" />
            <span>{error}</span>
          </div>
        ) : success ? (
          <div
            className="flex items-center gap-2 text-green-500 text-sm"
            data-ocid="applock.success_state"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Verified!</span>
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
              data-ocid="applock.button"
              onClick={() => handleDigit(d)}
              className="h-16 rounded-2xl bg-card border border-border text-xl font-semibold text-foreground active:scale-95 transition-transform hover:bg-muted"
            >
              {d}
            </button>
          ))}

          {/* Biometric or empty */}
          {biometricAvailable ? (
            <button
              type="button"
              data-ocid="applock.button"
              onClick={handleBiometric}
              className="h-16 rounded-2xl bg-card border border-primary/30 text-primary flex items-center justify-center active:scale-95 transition-transform hover:bg-primary/10"
            >
              <Fingerprint className="w-7 h-7" />
            </button>
          ) : (
            <div />
          )}

          {/* 0 */}
          <button
            type="button"
            data-ocid="applock.button"
            onClick={() => handleDigit("0")}
            className="h-16 rounded-2xl bg-card border border-border text-xl font-semibold text-foreground active:scale-95 transition-transform hover:bg-muted"
          >
            0
          </button>

          {/* Delete */}
          <button
            type="button"
            data-ocid="applock.delete_button"
            onClick={handleDelete}
            className="h-16 rounded-2xl bg-card border border-border flex items-center justify-center active:scale-95 transition-transform hover:bg-muted"
          >
            <Delete className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {mode === "verify" && biometricAvailable && !biometricRegistered && (
          <p className="text-xs text-muted-foreground text-center">
            Fingerprint icon tap karke biometric setup karein
          </p>
        )}

        {mode === "setup" && biometricAvailable && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleBiometric}
            data-ocid="applock.secondary_button"
          >
            <Fingerprint className="w-4 h-4" />
            Fingerprint bhi setup karein
          </Button>
        )}

        {/* Forgot PIN button -- only in verify mode */}
        {mode === "verify" && (
          <button
            type="button"
            data-ocid="applock.open_modal_button"
            onClick={() => {
              setKycAadhaar("");
              setKycPan("");
              setKycError("");
              setMode("forgot_kyc");
            }}
            className="text-sm text-amber-500 hover:text-amber-400 underline underline-offset-2 mt-1"
          >
            PIN bhul gaye? KYC se reset karein
          </button>
        )}
      </div>
    </div>
  );
}
