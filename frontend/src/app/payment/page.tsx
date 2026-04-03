"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import axios from "axios";
import Link from "next/link";
import { Type, CreditCard, Check, Loader2, Clock, Send, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Card, CardContent } from "@/components/ui/card";

const PLANS = [
  {
    id: "Starter",
    label: "Starter",
    price: 15,
    description: "1 video generation",
    quota: 1,
    color: "from-blue-500 to-cyan-500",
  },
  {
    id: "Creator",
    label: "Creator",
    price: 30,
    description: "30 video generations",
    quota: 30,
    color: "from-purple-500 to-pink-500",
  },
  {
    id: "Agency",
    label: "Agency",
    price: 99,
    description: "Unlimited video generations",
    quota: -1,
    color: "from-orange-500 to-red-500",
  },
];

interface UserRecord {
  id?: string;
  _id?: string;
  email?: string;
  name?: string;
  role?: string;
  phone_number?: string;
}

export default function PaymentPage() {
  const router = useRouter();
  const [user, setUser] = useState<UserRecord | null>(null);

  // Form state
  const [payerName, setPayerName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("");

  // Flow state
  const [step, setStep] = useState<"form" | "qr" | "submitting">("form");
  const [countdown, setCountdown] = useState(60);
  const [canSubmit, setCanSubmit] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");

  const countdownRef = useRef<NodeJS.Timeout | null>(null);

  const chosenPlan = PLANS.find((p) => p.id === selectedPlan);

  useEffect(() => {
    const userCookie = Cookies.get("user");
    if (!userCookie) {
      router.push("/login");
      return;
    }
    try {
      const parsed = JSON.parse(userCookie);
      // admin should never land here
      if (parsed.role === "admin") {
        router.push("/dashboard");
        return;
      }
      setUser(parsed);
      setPayerName(parsed.name || "");
      setPhone(parsed.phone_number || "");
    } catch {
      router.push("/login");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCountdown = () => {
    setCountdown(60);
    setCanSubmit(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          setCanSubmit(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleConfirm = () => {
    if (!payerName.trim() || !phone.trim() || !selectedPlan) {
      setError("Please fill in all fields before confirming.");
      return;
    }
    setError("");
    setStep("qr");
    startCountdown();
  };

  const handleSubmit = async () => {
    setSubmitLoading(true);
    try {
      await axios.post("http://localhost:5000/api/payments", {
        user_id: user?.id || user?._id,
        payer_name: payerName,
        email: user?.email,
        phone_number: phone,
        plan_name: selectedPlan,
        amount: chosenPlan?.price ?? 0,
      });
      // Store plan in cookie so dashboard can read it immediately
      const updatedUser = { ...user, plan: selectedPlan };
      Cookies.set("user", JSON.stringify(updatedUser), { expires: 7 });
      router.push("/dashboard");
    } catch {
      setError("Failed to submit payment. Please try again.");
      setSubmitLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white relative flex flex-col items-center justify-center p-4">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-purple-700/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-700/20 rounded-full blur-[120px]" />
      </div>

      {/* Logo */}
      <div className="mb-8 z-10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/30">
            <Type className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-2xl tracking-tight">TypeMotion</span>
        </Link>
      </div>

      <div className="w-full max-w-lg z-10">
        {/* Step indicator */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className={`flex items-center gap-2 text-sm font-medium ${step === "form" ? "text-purple-400" : "text-green-400"}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step === "form" ? "bg-purple-500/30 border border-purple-500" : "bg-green-500/30 border border-green-500"}`}>
              {step === "form" ? "1" : <Check className="w-4 h-4" />}
            </div>
            Details
          </div>
          <ChevronRight className="w-4 h-4 text-gray-600" />
          <div className={`flex items-center gap-2 text-sm font-medium ${step !== "form" ? "text-purple-400" : "text-gray-600"}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${step !== "form" ? "bg-purple-500/30 border border-purple-500" : "bg-gray-800 border border-gray-700"}`}>
              2
            </div>
            Payment
          </div>
        </div>

        <Card className="bg-gray-900/60 border-white/10 backdrop-blur-xl shadow-2xl">
          <CardContent className="p-8">
            {step === "form" && (
              <div className="space-y-6">
                <div className="text-center mb-2">
                  <h1 className="text-2xl font-bold text-white mb-1">Choose Your Plan</h1>
                  <p className="text-gray-400 text-sm">Fill in your details and select a subscription plan</p>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/40 text-red-400 rounded-lg text-sm text-center">
                    {error}
                  </div>
                )}

                {/* Payer Name */}
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Payer Name</Label>
                  <Input
                    placeholder="Your full name"
                    value={payerName}
                    onChange={(e) => setPayerName(e.target.value)}
                    className="bg-black/50 border-white/10 text-white placeholder:text-gray-600 h-11"
                  />
                </div>

                {/* Email (read-only) */}
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Login Email</Label>
                  <Input
                    value={user?.email || ""}
                    readOnly
                    className="bg-black/30 border-white/10 text-gray-400 h-11 cursor-not-allowed"
                  />
                </div>

                {/* Phone */}
                <div className="space-y-2">
                  <Label className="text-gray-300 text-sm">Phone Number</Label>
                  <Input
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="bg-black/50 border-white/10 text-white placeholder:text-gray-600 h-11"
                  />
                </div>

                {/* Plan selector */}
                <div className="space-y-3">
                  <Label className="text-gray-300 text-sm">Subscription Plan</Label>
                  <div className="grid grid-cols-1 gap-3">
                    {PLANS.map((plan) => (
                      <button
                        key={plan.id}
                        type="button"
                        onClick={() => setSelectedPlan(plan.id)}
                        className={`relative w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                          selectedPlan === plan.id
                            ? "border-purple-500 bg-purple-500/10"
                            : "border-white/10 bg-black/30 hover:border-white/20 hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg bg-gradient-to-tr ${plan.color} flex items-center justify-center`}>
                              <CreditCard className="w-4 h-4 text-white" />
                            </div>
                            <div>
                              <p className="font-semibold text-white text-sm">{plan.label}</p>
                              <p className="text-gray-400 text-xs">{plan.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-bold text-lg">${plan.price}</span>
                            <span className="text-gray-500 text-xs">/mo</span>
                            {selectedPlan === plan.id && (
                              <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center ml-1">
                                <Check className="w-3 h-3 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount display */}
                {chosenPlan && (
                  <div className="flex items-center justify-between p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/20 rounded-xl">
                    <span className="text-gray-300 text-sm">Amount to Pay</span>
                    <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-blue-400">
                      ${chosenPlan.price}
                    </span>
                  </div>
                )}

                <Button
                  onClick={handleConfirm}
                  disabled={!payerName || !phone || !selectedPlan}
                  className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-base disabled:opacity-40"
                >
                  Confirm Payment
                </Button>
              </div>
            )}

            {(step === "qr" || step === "submitting") && (
              <div className="space-y-6 text-center">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-1">Scan & Pay</h2>
                  <p className="text-gray-400 text-sm">
                    Scan the QR code below to pay{" "}
                    <span className="text-white font-semibold">${chosenPlan?.price}</span> for the{" "}
                    <span className="text-purple-400 font-semibold">{selectedPlan}</span> plan
                  </p>
                </div>

                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/40 text-red-400 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                {/* Payment summary */}
                <div className="text-left bg-black/40 border border-white/10 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between text-gray-400"><span>Name</span><span className="text-white">{payerName}</span></div>
                  <div className="flex justify-between text-gray-400"><span>Email</span><span className="text-white">{user?.email}</span></div>
                  <div className="flex justify-between text-gray-400"><span>Phone</span><span className="text-white">{phone}</span></div>
                  <div className="flex justify-between text-gray-400"><span>Plan</span><span className="text-purple-400 font-semibold">{selectedPlan}</span></div>
                  <div className="flex justify-between text-gray-400 border-t border-white/10 pt-2"><span>Total</span><span className="text-white font-bold text-base">${chosenPlan?.price}</span></div>
                </div>

                {/* QR Code */}
                <div className="flex justify-center">
                  <div className="p-3 bg-white rounded-2xl shadow-2xl shadow-purple-500/20 inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/qr.jpeg" alt="Scan to pay" className="w-52 h-52 object-cover rounded-lg" />
                  </div>
                </div>

                {/* Countdown / Submit */}
                {!canSubmit ? (
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex items-center gap-2 text-gray-400 text-sm">
                      <Clock className="w-4 h-4 animate-pulse text-purple-400" />
                      <span>After paying, submit button unlocks in</span>
                    </div>
                    <div className="relative w-20 h-20">
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
                        <circle cx="40" cy="40" r="34" fill="none" stroke="#1f1f2e" strokeWidth="6" />
                        <circle
                          cx="40" cy="40" r="34"
                          fill="none"
                          stroke="url(#grad)"
                          strokeWidth="6"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 34}
                          strokeDashoffset={2 * Math.PI * 34 * (1 - countdown / 60)}
                          className="transition-all duration-1000"
                        />
                        <defs>
                          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#a855f7" />
                            <stop offset="100%" stopColor="#3b82f6" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xl font-bold text-white">{countdown}s</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-green-400 text-sm flex items-center justify-center gap-2">
                      <Check className="w-4 h-4" />
                      Timer complete! Click below to confirm your payment.
                    </p>
                    <Button
                      onClick={handleSubmit}
                      disabled={submitLoading}
                      className="w-full h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-semibold text-base"
                    >
                      {submitLoading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Confirming...</>
                      ) : (
                        <><Send className="w-4 h-4 mr-2" /> Submit Payment & Continue</>
                      )}
                    </Button>
                  </div>
                )}

                <button
                  onClick={() => { setStep("form"); if (countdownRef.current) clearInterval(countdownRef.current); }}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  ← Change plan
                </button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
