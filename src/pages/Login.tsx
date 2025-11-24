// src/pages/Login.tsx
import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function Login() {
  const [empId, setEmpId] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const signIn = async () => {
    const id = empId.trim();
    if (!id) return setMsg("Please enter your Employee ID.");
    setSubmitting(true);
    setMsg(null);
    try {
      // Persist minimal session
      localStorage.setItem(
        "auth",
        JSON.stringify({
          empID: id,
          empName: "", // will be inferred in dashboards via APIs if needed
        })
      );
      // redirect to dashboard
      window.location.replace("/dashboard");
    } catch (e: any) {
      setMsg(e?.message || "Failed to sign in");
    } finally {
      setSubmitting(false);
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === "Enter") signIn();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Sign in</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="text-sm text-gray-600">Employee ID (for PEL1415, simply enter: 1415)</label>
          <Input
            value={empId}
            onChange={(e) => setEmpId(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="e.g. 30874"
            inputMode="numeric"
            className="text-lg"
          />
          <Button className="w-full" onClick={signIn} disabled={submitting}>
            {submitting ? "Signing in..." : "Continue"}
          </Button>

          {msg && <div className="text-sm text-red-600">{msg}</div>}
        </CardContent>
      </Card>
    </div>
  );
}