import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Loader2,
  Mail,
  RefreshCw,
  ShieldCheck,
  User,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
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
  { label: "Face Scan", icon: Camera },
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

  // Face scan state
  const [faceImage, setFaceImage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) {
        t.stop();
      }
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch {
      setCameraError("Camera not available. You can skip this step.");
      setCameraActive(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: camera starts only when entering step 2
  useEffect(() => {
    if (step === 2 && !faceImage) {
      void startCamera();
    }
    return () => {
      if (streamRef.current) {
        for (const t of streamRef.current.getTracks()) {
          t.stop();
        }
        streamRef.current = null;
      }
      setCameraActive(false);
    };
  }, [step]); // intentionally omit faceImage/startCamera

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 320;
    canvas.height = videoRef.current.videoHeight || 320;
    canvas.getContext("2d")?.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setFaceImage(dataUrl);
    stopCamera();
  };

  const retakePhoto = () => {
    setFaceImage(null);
    startCamera();
  };

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
    // step 2 = face scan (optional, no validation required)
    if (step === 3) {
      if (!EMAIL_REGEX.test(form.email))
        errs.email = "Enter a valid email address";
      if (otpSent && form.otp.length < 4) errs.otp = "Enter the 4-digit OTP";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = () => {
    if (!validateStep()) return;
    if (step === 3 && !otpSent) {
      setOtpSent(true);
      toast.success(`OTP sent to ${form.email}`);
      return;
    }
    if (step === 2) stopCamera();
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    if (step === 3) stopCamera();
    setStep((s) => s - 1);
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
        <div className="flex items-center justify-between mb-8 px-1">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                    i < step
                      ? "bg-primary border-primary text-primary-foreground"
                      : i === step
                        ? "border-primary text-primary bg-primary/10"
                        : "border-border text-muted-foreground"
                  }`}
                >
                  {i < step ? (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  ) : (
                    <s.icon className="w-3.5 h-3.5" />
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1 ${
                    i === step ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  {s.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 mb-4 ${
                    i < step ? "bg-primary" : "bg-border"
                  }`}
                  style={{ minWidth: 12 }}
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
                <h2 className="text-lg font-semibold mb-1">Face Scan</h2>
                <p className="text-xs text-muted-foreground mb-4">
                  Position your face in the frame for identity verification
                </p>

                {cameraError ? (
                  <div
                    className="flex flex-col items-center gap-3 py-6"
                    data-ocid="register.face.panel"
                  >
                    <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center">
                      <Camera className="w-7 h-7 text-destructive" />
                    </div>
                    <p
                      className="text-sm text-muted-foreground text-center"
                      data-ocid="register.error_state"
                    >
                      {cameraError}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleNext()}
                      className="mt-1"
                    >
                      Skip Face Scan
                    </Button>
                  </div>
                ) : faceImage ? (
                  <div
                    className="flex flex-col items-center gap-3"
                    data-ocid="register.face.panel"
                  >
                    <div className="relative">
                      <img
                        src={faceImage}
                        alt="Captured face"
                        className="w-56 h-56 rounded-full object-cover border-4 border-green-500 shadow-[0_0_20px_rgba(34,197,94,0.4)]"
                      />
                      <div className="absolute bottom-2 right-2 w-9 h-9 bg-green-500 rounded-full flex items-center justify-center shadow-lg">
                        <CheckCircle2 className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <p className="text-sm font-medium text-green-400">
                      ✓ Photo Captured
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={retakePhoto}
                      className="flex items-center gap-2"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Retake
                    </Button>
                  </div>
                ) : (
                  <div
                    className="flex flex-col items-center gap-4"
                    data-ocid="register.face.panel"
                  >
                    {/* Camera frame */}
                    <div className="relative">
                      {/* Oval face guide overlay */}
                      <div
                        className={`relative w-56 h-56 rounded-full overflow-hidden border-4 transition-all ${
                          cameraActive
                            ? "border-green-500 shadow-[0_0_24px_rgba(34,197,94,0.5)]"
                            : "border-border"
                        }`}
                      >
                        <video
                          ref={videoRef}
                          autoPlay
                          playsInline
                          muted
                          className="w-full h-full object-cover scale-x-[-1]"
                        />
                        {/* Scanning animation line */}
                        {cameraActive && (
                          <motion.div
                            className="absolute left-0 right-0 h-0.5 bg-green-400/70"
                            style={{
                              boxShadow: "0 0 8px rgba(74,222,128,0.8)",
                            }}
                            initial={{ top: "10%" }}
                            animate={{ top: "90%" }}
                            transition={{
                              duration: 1.8,
                              repeat: Number.POSITIVE_INFINITY,
                              ease: "linear",
                              repeatType: "reverse",
                            }}
                          />
                        )}
                        {/* Face guide oval overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                          <svg
                            viewBox="0 0 100 100"
                            className="w-full h-full"
                            style={{ opacity: 0.5 }}
                            aria-hidden="true"
                          >
                            <title>Face guide</title>
                            <ellipse
                              cx="50"
                              cy="50"
                              rx="32"
                              ry="40"
                              fill="none"
                              stroke="rgba(74,222,128,0.8)"
                              strokeWidth="1.5"
                              strokeDasharray="4 3"
                            />
                          </svg>
                        </div>
                      </div>
                      {cameraActive && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
                      )}
                    </div>

                    {cameraActive ? (
                      <Button
                        data-ocid="register.face.button"
                        onClick={capturePhoto}
                        className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6"
                      >
                        <Camera className="w-4 h-4 mr-2" /> Capture Photo
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Starting camera...
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
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

            {step === 4 && (
              <motion.div
                key="step4"
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
                    ["Face Scan", faceImage ? "✓ Captured" : "Skipped"],
                  ] as [string, string][]
                ).map(([label, value]) => (
                  <div
                    key={label}
                    className="flex justify-between text-sm border-b border-border/50 pb-2"
                  >
                    <span className="text-muted-foreground">{label}</span>
                    <span
                      className={`font-medium font-data ${
                        label === "Face Scan" && faceImage
                          ? "text-green-400"
                          : ""
                      }`}
                    >
                      {value}
                    </span>
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
                onClick={handleBack}
                className="flex-1"
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            )}
            {step < 4 ? (
              // On face scan step, only show Next if photo captured; Skip is shown inline if camera error
              step === 2 && !faceImage && !cameraError ? null : (
                <Button
                  data-ocid="register.primary_button"
                  onClick={handleNext}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
                >
                  {step === 3 && !otpSent ? "Send OTP" : "Next"}
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              )
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
