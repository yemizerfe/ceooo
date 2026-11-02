"use client";
import { debugLog } from "@/lib/logger";
// app/pricing/page.tsx

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { usePricingStore } from "@/store/pricingStore";
import { useAuthStore } from "@/store/authStore";
import { Check, Sparkles, Zap, Crown, Star, Shield, Users, BarChart, Headphones, Rocket, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { PricingTier, FAQ, EnterpriseFeature } from "@/types/pricing";

const pricingTiers: PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    price: 49,
    period: "monthly",
    description: "Perfect for solo executives and small teams",
    features: [
      "AI-powered meeting assistant",
      "Smart email prioritization",
      "Basic analytics dashboard",
      "Up to 5 team members",
      "Email support",
      "2GB storage",
      "Basic integrations",
    ],
    highlighted: false,
    buttonText: "Get Started",
    buttonVariant: "outline",
  },
  {
    id: "professional",
    name: "Professional",
    price: 99,
    period: "monthly",
    description: "Most popular for growing companies",
    features: [
      "Everything in Starter",
      "Advanced AI decision making",
      "Real-time collaboration",
      "Unlimited team members",
      "Priority support (24/7)",
      "50GB storage",
      "Advanced integrations",
      "Custom workflows",
      "Team analytics",
    ],
    highlighted: true,
    badge: "Most Popular",
    buttonText: "Start Free Trial",
    buttonVariant: "default",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: 299,
    period: "monthly",
    description: "For large organizations with custom needs",
    features: [
      "Everything in Professional",
      "Custom AI training",
      "Dedicated account manager",
      "SLA guarantee (99.9%)",
      "Unlimited storage",
      "Custom integrations",
      "Advanced security features",
      "On-premise deployment",
      "SSO & SAML",
      "Audit logs",
    ],
    highlighted: false,
    badge: "Coming Soon",
    buttonText: "Contact Sales",
    buttonVariant: "outline",
  },
];

const faqs: FAQ[] = [
  {
    question: "Can I switch plans later?",
    answer: "Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.",
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards (Visa, MasterCard, American Express), PayPal, and bank transfers for Enterprise plans.",
  },
  {
    question: "Is there a free trial?",
    answer: "Yes, all plans come with a 14-day free trial. No credit card required to start.",
  },
  {
    question: "Can I cancel my subscription?",
    answer: "You can cancel anytime. No hidden fees or long-term contracts.",
  },
  {
    question: "Do you offer discounts for non-profits?",
    answer: "Yes, we offer special pricing for non-profit organizations. Please contact our sales team.",
  },
  {
    question: "Is my data secure?",
    answer: "Absolutely. We use bank-level encryption and comply with GDPR, CCPA, and SOC 2 standards.",
  },
];

const enterpriseFeatures = [
  {
    title: "Custom AI Training",
    description: "Train our AI on your company's data and workflows",
    icon: Zap,
  },
  {
    title: "Dedicated Support",
    description: "24/7 priority support with dedicated account manager",
    icon: Headphones,
  },
  {
    title: "Advanced Security",
    description: "SOC 2 compliant, SSO, audit logs, and custom security",
    icon: Shield,
  },
  {
    title: "Custom Integrations",
    description: "Connect with your existing tools and systems",
    icon: Users,
  },
];

const ChevronDown = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export default function PricingPage() {
  const { billingPeriod, setBillingPeriod, calculatePrice } = usePricingStore();
  const { isAuthenticated } = useAuthStore();
  const [hoveredPlan, setHoveredPlan] = useState<string | null>(null);
  const [selectedFAQ, setSelectedFAQ] = useState<number | null>(null);
  const [isYearly, setIsYearly] = useState(false);

  useEffect(() => {
    setBillingPeriod(isYearly ? 'yearly' : 'monthly');
  }, [isYearly, setBillingPeriod]);

  const handleSubscribe = (plan: PricingTier) => {
    if (!isAuthenticated) {
      // Store the intended redirect URL
      localStorage.setItem('redirectAfterLogin', '/pricing');
      window.location.href = '/signup';
      return;
    }
    
    // Handle subscription logic here
    debugLog(`Subscribing to ${plan.name} plan (${billingPeriod})`);
    // You can integrate with Stripe, Paddle, or your payment processor here
  };

  const handleContactSales = () => {
    window.location.href = '/contact';
  };

return (
    <div className="min-h-screen bg-white dark:bg-slate-900 overflow-hidden pt-0">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-500/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-16 md:py-24">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <Badge className="mb-4 px-4 py-2 bg-blue-500/10 text-blue-400 border-blue-500/20">
            <Sparkles className="w-3.5 h-3.5 mr-2" />
            Pricing Plans
          </Badge>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-slate-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Choose the perfect plan for your leadership needs. All plans include a 14-day free trial.
          </p>
        </motion.div>

        {/* Billing Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="flex items-center justify-center gap-4 mb-12"
        >
          <Label htmlFor="billing-toggle" className={`text-sm ${!isYearly ? 'text-slate-900' : 'text-gray-400'}`}>
            Monthly
          </Label>
          <div className="relative">
            <Switch
              id="billing-toggle"
              checked={isYearly}
              onCheckedChange={setIsYearly}
              className="data-[state=checked]:bg-blue-600"
            />
            {isYearly && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -top-8 left-1/2 transform -translate-x-1/2 whitespace-nowrap"
              >
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                  Save 20%
                </Badge>
              </motion.div>
            )}
          </div>
          <Label htmlFor="billing-toggle" className={`text-sm ${isYearly ? 'text-slate-900' : 'text-gray-400'}`}>
            Yearly
          </Label>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 mb-20">
          {pricingTiers.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              onMouseEnter={() => setHoveredPlan(tier.id)}
              onMouseLeave={() => setHoveredPlan(null)}
              className="relative"
            >
              {tier.highlighted && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 z-10">
                  <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-1">
                    {tier.badge}
                  </Badge>
                </div>
              )}
              
              <Card className={`relative overflow-hidden transition-all duration-300 ${
                tier.highlighted 
                  ? 'bg-slate-800 border-slate-800 shadow-2xl scale-105 md:scale-110' 
                  : 'bg-white border-gray-200 hover:border-slate-900/40 shadow-sm'
              } ${hoveredPlan === tier.id ? 'transform -translate-y-2 shadow-xl' : ''}`}>
                <CardHeader>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <CardTitle className={`text-2xl mb-2 ${tier.highlighted ? 'text-white' : 'text-slate-900'}`}>{tier.name}</CardTitle>
                      <CardDescription className={tier.highlighted ? 'text-blue-200' : 'text-gray-500'}>{tier.description}</CardDescription>
                    </div>
                    {tier.id === 'enterprise' && (
                      <div className="p-2 rounded-lg bg-yellow-500/10">
                        <Crown className="w-6 h-6 text-yellow-500" />
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <span className={`text-4xl font-bold ${tier.highlighted ? 'text-white' : 'text-slate-900'}`}>
                      ${calculatePrice(tier.price, billingPeriod).toFixed(0)}
                    </span>
                    <span className="text-gray-400 ml-2">/{billingPeriod === 'monthly' ? 'month' : 'year'}</span>
                  </div>
                </CardHeader>

                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, idx) => (
                      <motion.li
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className={`flex items-start gap-3 ${tier.highlighted ? 'text-blue-100' : 'text-gray-600'}`}
                      >
                        <Check className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </motion.li>
                    ))}
                  </ul>
                </CardContent>

                <CardFooter>
                  <Button
                    onClick={() => tier.id === 'enterprise' ? handleContactSales() : handleSubscribe(tier)}
                    variant={tier.buttonVariant as any}
                    className={`w-full ${
                      tier.highlighted 
                        ? 'bg-white text-slate-900 hover:bg-gray-100' 
                        : 'bg-slate-800 hover:bg-[#245a8f] text-white border-slate-800'
                    }`}
                    disabled={tier.id === 'enterprise'}
                  >
                    {tier.buttonText}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </CardFooter>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Enterprise Features Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Enterprise Features</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Everything you need to scale your leadership and drive organizational success
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {enterpriseFeatures.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-500/30 transition-all shadow-sm"
                >
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-500 text-sm">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-20"
        >
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Frequently Asked Questions</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Have questions? We've got answers. Check out our most common questions below.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4 max-w-4xl mx-auto">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
              >
                <button
                  onClick={() => setSelectedFAQ(selectedFAQ === index ? null : index)}
                  className="w-full px-6 py-4 flex justify-between items-center text-left hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  <span className="font-semibold text-slate-900">{faq.question}</span>
                  <motion.div
                    animate={{ rotate: selectedFAQ === index ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {selectedFAQ === index && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="px-6 pb-4"
                    >
                      <p className="text-gray-500">{faq.answer}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* CTA Section */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center"
        >
          <div className="bg-white rounded-2xl p-12 border border-slate-200 shadow-sm">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Ready to transform your leadership?</h2>
            <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
              Join thousands of executives who use CEOOO to streamline their workflow and make better decisions.
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Button 
                size="lg" 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => {
                  if (!isAuthenticated) {
                    localStorage.setItem('redirectAfterLogin', '/pricing');
                    window.location.href = '/signup';
                  } else {
                    window.location.href = '/dashboard';
                  }
                }}
              >
                Start Free Trial
                <Rocket className="ml-2 w-4 h-4" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="border-gray-300 text-slate-900 hover:bg-gray-100"
                onClick={() => window.location.href = '/contact'}
              >
                Schedule Demo
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-6">No credit card required • Cancel anytime • 14-day free trial</p>
          </div>
        </motion.div>

        {/* Trust Badges */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-16 text-center"
        >
          <p className="text-sm text-gray-500 mb-4">Trusted by 1000+ companies worldwide</p>
          <div className="flex justify-center items-center gap-8 flex-wrap opacity-50">
            {['TechCorp', 'InnovateInc', 'GlobalSoft', 'FutureLabs', 'SmartSys'].map((company) => (
              <span key={company} className="text-gray-400 font-semibold">
                {company}
              </span>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}


