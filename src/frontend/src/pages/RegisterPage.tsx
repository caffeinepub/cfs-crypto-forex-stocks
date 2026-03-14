import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  Mail,
  ShieldCheck,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useRegisterUser } from "../hooks/useQueries";

interface FormData {
  name: string;
  age: string;
  mobile: string;
  email: string;
  aadhaar: string;
  pan: string;
  otp: string;
}

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const AADHAAR_REGEX = /^[0-9]{12}$/;
const MOBILE_REGEX = /^[6-9][0-9]{9}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEPS = [
  { label: "Personal", icon: User },
  { label: "Identity", icon: CreditCard },
  { label: "Email OTP", icon: Mail },
  { label: "Confirm", icon: ShieldCheck },
];

export default function RegisterPage() {
  const { clear } = useInternetIdentity();
  const { mutate: registerUser, isPending } = useRegisterUser();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>({
    name: "",
    age: "",
    mobile: "",
    email: "",
    aadhaar: "",
    pan: "",
    otp: "",
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [otpSent, setOtpSent] = useState(false);

  const set = (field: keyof FormData, value: string) => {
    setForm((f) => ({ ...f, [field]: value }));
    setErrors((e) => ({ ...e, [field]: undefined }));
  };

  const validateStep = (): boolean => {
    const errs: Partial<FormData> = {};
    if (step === 0) {
      if (!form.name.trim() || form.name.trim().length < 2)
        errs.name = "Full name required (min 2 chars)";
      const age = Number.parseInt(form.age);
      if (!Number.isNaN(age) === false || age < 17)
        errs.age = "Must be 17 years or older";
      if (!MOBILE_REGEX.test(form.mobile))
        errs.mobile = "Enter valid 10-digit Indian mobile number";
    }
    if (step === 1) {
      if (!AADHAAR_REGEX.test(form.aadhaar))
        errs.aadhaar = "Aadhaar must be 12 digits";
      if (!PAN_REGEX.test(form.pan.toUpperCase()))
        errs.pan = "Invalid PAN format (e.g. ABCDE1234F)";
    }
    if (step === 2) {
      if (!EMAIL_REGEX.test(form.email))
        errs.email = "Enter a valid email address";
      if (otpSent && form.otp.length < 4) errs.otp = "Enter the 4-digit OTP";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step === 2 && !otpSent) {
      setOtpSent(true);
      toast.success(`OTP sent to ${form.email}`);
      return;
    }
    setStep((s) => s + 1);
  };

  const handleSubmit = () => {
    registerUser(
      {
        name: form.name.trim(),
        email: form.email.trim(),
        mobile: form.mobile.trim(),
        age: Number.parseInt(form.age),
        aadhaarMock: form.aadhaar.trim(),
        panMock: form.pan.toUpperCase().trim(),
      },
      {
        onSuccess: () =>
          toast.success("Registration successful! Welcome to CFS."),
        onError: (e) => toast.error(`Registration failed: ${e.message}`),
      },
    );
  };

  return (
    <div className="min-h-screen bg-background grid-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/assets/generated/cfs-logo-transparent.dim_320x120.png"
            alt="CFS"
            className="h-10 mx-auto mb-2"
          />
          <p className="text-muted-foreground text-sm">
            Complete KYC to start trading
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-between mb-8 px-2">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all ${
                    i < step
                      ? "bg-primary border-primary text-primary-foreground"
                      : i === step
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border text-muted-foreground"
                  }`}
                >
                  {i < step ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <s.icon className="w-4 h-4" />
                  )}
                </div>
                <span
                  className={`text-xs mt-1 ${i === step ? "text-primary" : "text-muted-foreground"}`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 mb-4 ${i < step ? "bg-primary" : "bg-border"}`}
                  style={{ minWidth: 24 }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="bg-card border border-border rounded-xl p-6">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-semibold mb-4">
                  Personal Information
                </h2>
                <div>
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    data-ocid="register.input"
                    placeholder="Ravi Kumar Sharma"
                    value={form.name}
                    onChange={(e) => set("name", e.target.value)}
                    className="mt-1"
                  />
                  {errors.name && (
                    <p
                      className="text-destructive text-xs mt-1"
                      data-ocid="register.error_state"
                    >
                      {errors.name}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="age">Age (17+ required)</Label>
                  <Input
                    id="age"
                    data-ocid="register.age.input"
                    type="number"
                    placeholder="21"
                    min={17}
                    max={120}
                    value={form.age}
                    onChange={(e) => set("age", e.target.value)}
                    className="mt-1"
                  />
                  {errors.age && (
                    <p
                      className="text-destructive text-xs mt-1"
                      data-ocid="register.age.error_state"
                    >
                      {errors.age}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="mobile">Mobile Number</Label>
                  <Input
                    id="mobile"
                    data-ocid="register.mobile.input"
                    placeholder="9876543210"
                    maxLength={10}
                    value={form.mobile}
                    onChange={(e) =>
                      set("mobile", e.target.value.replace(/\D/g, ""))
                    }
                    className="mt-1"
                  />
                  {errors.mobile && (
                    <p
                      className="text-destructive text-xs mt-1"
                      data-ocid="register.mobile.error_state"
                    >
                      {errors.mobile}
                    </p>
                  )}
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-semibold mb-4">
                  Identity Verification
                </h2>
                <div>
                  <Label htmlFor="aadhaar">Aadhaar Number (Mock)</Label>
                  <Input
                    id="aadhaar"
                    data-ocid="register.aadhaar.input"
                    placeholder="123456789012"
                    maxLength={12}
                    value={form.aadhaar}
                    onChange={(e) =>
                      set("aadhaar", e.target.value.replace(/\D/g, ""))
                    }
                    className="mt-1 font-data tracking-widest"
                  />
                  {errors.aadhaar && (
                    <p
                      className="text-destructive text-xs mt-1"
                      data-ocid="register.aadhaar.error_state"
                    >
                      {errors.aadhaar}
                    </p>
                  )}
                </div>
                <div>
                  <Label htmlFor="pan">PAN Card (Mock)</Label>
                  <Input
                    id="pan"
                    data-ocid="register.pan.input"
                    placeholder="ABCDE1234F"
                    maxLength={10}
                    value={form.pan}
                    onChange={(e) => set("pan", e.target.value.toUpperCase())}
                    className="mt-1 font-data tracking-widest uppercase"
                  />
                  {errors.pan && (
                    <p
                      className="text-destructive text-xs mt-1"
                      data-ocid="register.pan.error_state"
                    >
                      {errors.pan}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Format: AAAAA0000A
                  </p>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h2 className="text-lg font-semibold mb-4">
                  Email Verification
                </h2>
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    data-ocid="register.email.input"
                    type="email"
                    placeholder="you@example.com"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    className="mt-1"
                  />
                  {errors.email && (
                    <p
                      className="text-destructive text-xs mt-1"
                      data-ocid="register.email.error_state"
                    >
                      {errors.email}
                    </p>
                  )}
                </div>
                {otpSent && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    <Label htmlFor="otp">Enter OTP</Label>
                    <Input
                      id="otp"
                      data-ocid="register.otp.input"
                      placeholder="4-digit OTP"
                      maxLength={6}
                      value={form.otp}
                      onChange={(e) =>
                        set("otp", e.target.value.replace(/\D/g, ""))
                      }
                      className="mt-1 font-data tracking-widest text-center text-lg"
                    />
                    {errors.otp && (
                      <p
                        className="text-destructive text-xs mt-1"
                        data-ocid="register.otp.error_state"
                      >
                        {errors.otp}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Demo: use any 4+ digit code
                    </p>
                  </motion.div>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-3"
              >
                <h2 className="text-lg font-semibold mb-4">Confirm Details</h2>
                {(
                  [
                    ["Name", form.name],
                    ["Age", form.age],
                    ["Mobile", form.mobile],
                    ["Email", form.email],
                    ["Aadhaar", `XXXX XXXX ${form.aadhaar.slice(-4)}`],
                    ["PAN", form.pan],
                  ] as [string, string][]
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between text-sm border-b border-border/50 pb-2"
                  >
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-medium font-data">{value}</span>
                  </div>
                ))}
                <div className="mt-4 p-3 rounded-lg bg-primary/10 border border-primary/20 text-xs text-muted-foreground">
                  <p className="font-semibold text-primary mb-1">
                    ✓ KYC Agreement
                  </p>
                  <p>
                    By registering, you confirm you are 17+ years old and agree
                    to SEBI/RBI compliance requirements. This is a demo
                    platform.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex gap-3 mt-6">
            {step > 0 && (
              <Button
                data-ocid="register.cancel_button"
                variant="outline"
                onClick={() => setStep((s) => s - 1)}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            {step < 3 ? (
              <Button
                data-ocid="register.primary_button"
                onClick={handleNext}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                {step === 2 && !otpSent ? "Send OTP" : "Next"}
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button
                data-ocid="register.submit_button"
                onClick={handleSubmit}
                disabled={isPending}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-bold"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <ShieldCheck className="w-4 h-4 mr-2" />
                )}
                {isPending ? "Registering..." : "Complete KYC"}
              </Button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Already registered?{" "}
          <button
            type="button"
            data-ocid="register.cancel_button"
            onClick={clear}
            className="text-primary hover:underline"
          >
            Logout &amp; try different account
          </button>
        </p>
      </div>
    </div>
  );
}
