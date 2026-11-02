"use client";

import { useState } from "react";
import { CreditCard, Download, CheckCircle2, AlertCircle, Plus, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/store/authStore";
import { useDecisionStore } from "@/store/decisionStore";
import { useAIInsightStore } from "@/store/aiInsightStore";

const plans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    description: "For individuals getting started",
    features: ["5 decisions/month", "Basic AI insights", "Email support", "1GB storage"],
  },
  {
    id: "pro",
    name: "Professional",
    price: 99,
    description: "Most popular for growing companies",
    features: ["Unlimited decisions", "Advanced AI insights", "Priority 24/7 support", "50GB storage", "API access"],
    popular: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 299,
    description: "For large organizations",
    features: ["Custom AI training", "Dedicated account manager", "SLA guarantee", "Unlimited storage", "On-premise deployment"],
  },
];

export default function BillingPage() {
  const { user } = useAuthStore();
  const { decisions } = useDecisionStore();
  const { insights } = useAIInsightStore();
  const [annualBilling, setAnnualBilling] = useState(false);
  const [saved, setSaved] = useState(false);

  const currentPlan = user?.subscriptionPlan || "free";
  const currentPlanData = plans.find((p) => p.id === currentPlan) || plans[0];
  const aiUsage = user?.aiUsageCount || 0;
  const aiLimit = currentPlan === "free" ? 50 : currentPlan === "pro" ? 2000 : 99999;
  const aiPct = Math.min(100, Math.round((aiUsage / aiLimit) * 100));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Billing & Subscription</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Manage your plan, payments, and invoices</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Current Plan */}
            <Card className="bg-gradient-to-r from-blue-500/10 to-indigo-500/10 border-blue-500/30">
              <CardContent className="p-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <Badge className="bg-blue-600 text-white mb-3">Current Plan</Badge>
                    <h2 className="text-2xl font-bold capitalize">{currentPlanData.name} Plan</h2>
                    <p className="text-gray-600 dark:text-gray-300 mt-1">
                      {currentPlan === "free" ? "Free forever" : `Billed ${annualBilling ? "annually" : "monthly"} at $${annualBilling ? currentPlanData.price * 12 * 0.8 : currentPlanData.price}/${annualBilling ? "year" : "month"}`}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Account: {user?.email}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">${currentPlanData.price === 0 ? "Free" : currentPlanData.price}</div>
                    {currentPlanData.price > 0 && <div className="text-sm text-gray-500">/month</div>}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-blue-200 dark:border-slate-700 flex items-center justify-between text-sm">
                  <span className={`flex items-center gap-2 ${user?.isVerified ? "text-green-600" : "text-yellow-600"}`}>
                    <CheckCircle2 className="w-4 h-4" />
                    {user?.isVerified ? "Account verified" : "Account not verified"}
                  </span>
                  <Button variant="outline" size="sm">Manage Subscription</Button>
                </div>
              </CardContent>
            </Card>

            {/* Annual Toggle */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Annual Billing</h3>
                    <p className="text-sm text-gray-500">Save 20% with yearly commitment</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-sm ${!annualBilling ? "font-medium" : "text-gray-500"}`}>Monthly</span>
                    <Switch checked={annualBilling} onCheckedChange={setAnnualBilling} />
                    <span className={`text-sm ${annualBilling ? "font-medium" : "text-gray-500"}`}>Yearly</span>
                    <Badge className="bg-green-500 text-white">Save 20%</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Plans */}
            <div>
              <h2 className="text-xl font-semibold mb-4">Available Plans</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {plans.map((plan) => (
                  <Card key={plan.id} className={plan.id === currentPlan ? "ring-2 ring-blue-500" : ""}>
                    <CardContent className="p-4">
                      {plan.popular && <Badge className="bg-yellow-500 text-white mb-2">Most Popular</Badge>}
                      <h3 className="text-lg font-semibold">{plan.name}</h3>
                      <div className="mt-2">
                        <span className="text-2xl font-bold">${annualBilling && plan.price > 0 ? Math.round(plan.price * 12 * 0.8) : plan.price}</span>
                        <span className="text-gray-500">/{plan.price === 0 ? "forever" : annualBilling ? "year" : "month"}</span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{plan.description}</p>
                      <ul className="mt-4 space-y-2">
                        {plan.features.map((f, i) => (
                          <li key={i} className="text-sm flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />{f}
                          </li>
                        ))}
                      </ul>
                      <Button className="w-full mt-4" variant={plan.id === currentPlan ? "outline" : "default"} disabled={plan.id === currentPlan}>
                        {plan.id === currentPlan ? "Current Plan" : plan.price > (currentPlanData.price || 0) ? "Upgrade" : "Downgrade"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Billing Address */}
            <Card>
              <CardHeader><CardTitle>Billing Address</CardTitle></CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-4">
                  <div><Label>Street Address</Label><Input placeholder="123 Business Ave" /></div>
                  <div><Label>City</Label><Input placeholder="San Francisco" /></div>
                  <div><Label>State</Label><Input placeholder="CA" /></div>
                  <div><Label>ZIP Code</Label><Input placeholder="94105" /></div>
                  <div><Label>Country</Label><Input placeholder="United States" /></div>
                </div>
                <Button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000); }} className="mt-4 gap-2">
                  {saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                  {saved ? "Saved!" : "Save Address"}
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            {/* Usage Summary — real data */}
            <Card>
              <CardHeader><CardTitle>Usage Summary</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>AI Credits Used</span>
                    <span>{aiUsage} / {aiLimit === 99999 ? "∞" : aiLimit}</span>
                  </div>
                  <Progress value={aiPct} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Decisions Created</span>
                    <span>{decisions.length}</span>
                  </div>
                  <Progress value={Math.min(100, (decisions.length / (currentPlan === "free" ? 5 : 100)) * 100)} className="h-2" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>AI Insights Generated</span>
                    <span>{insights.length}</span>
                  </div>
                  <Progress value={Math.min(100, (insights.length / 50) * 100)} className="h-2" />
                </div>
                <div className="pt-2 border-t text-xs text-gray-500">
                  Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}
                </div>
              </CardContent>
            </Card>

            {/* Payment Method placeholder */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Payment Method</CardTitle>
                  <Button variant="outline" size="sm" className="gap-1"><Plus className="w-4 h-4" />Add</Button>
                </div>
              </CardHeader>
              <CardContent>
                {currentPlan === "free" ? (
                  <p className="text-sm text-gray-500">No payment method required for free plan.</p>
                ) : (
                  <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-white/10">
                    <CreditCard className="w-5 h-5" />
                    <div>
                      <p className="font-medium">Visa ending in 4242</p>
                      <p className="text-sm text-gray-500">Expires 12/26</p>
                    </div>
                    <Badge variant="outline" className="ml-auto">Default</Badge>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Cancel */}
            <Card className="border-red-200 dark:border-red-500/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <h3 className="font-semibold">Cancel Subscription</h3>
                </div>
                <p className="text-sm text-gray-500 mb-3">Your data will be available for 30 days after cancellation.</p>
                <Button variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" disabled={currentPlan === "free"}>
                  {currentPlan === "free" ? "No Active Subscription" : "Request Cancellation"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
