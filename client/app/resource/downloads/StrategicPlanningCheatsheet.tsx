"use client";
// components/resources/StrategicPlanningCheatsheet.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Target, Calendar, CheckCircle2, TrendingUp } from "lucide-react";

export function StrategicPlanningCheatsheet() {
  return (
    <div className="p-8 max-w-4xl mx-auto bg-white">
      {/* Header */}
      <div className="text-center mb-8 pb-8 border-b">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Strategic Planning Cheat Sheet</h1>
        <p className="text-gray-600">A one-page reference for effective strategic planning</p>
        <div className="flex justify-center gap-4 mt-4 text-sm text-gray-500">
          <span>© CEOOO</span>
          <span>Version 1.0</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* OKR Framework */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-500" />
              OKR Framework
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <p className="font-semibold">Objective:</p>
                <p className="text-sm text-gray-600">What you want to achieve (Qualitative, Inspirational)</p>
                <div className="mt-2 p-2 bg-gray-50 rounded">
                  <p className="text-sm italic">Example: "Dominate the European market"</p>
                </div>
              </div>
              <div>
                <p className="font-semibold">Key Results:</p>
                <p className="text-sm text-gray-600">How you measure success (Quantitative, Measurable)</p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>• KR1: Achieve €10M in European sales</li>
                  <li>• KR2: Sign 50 enterprise customers</li>
                  <li>• KR3: Achieve 30% market share</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quarterly Planning Timeline */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-green-500" />
              Quarterly Planning Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { week: "Week 1-2", task: "Review previous quarter performance" },
                { week: "Week 3-4", task: "Set OKRs for next quarter" },
                { week: "Week 5-6", task: "Align teams and allocate resources" },
                { week: "Week 7-8", task: "Launch initiatives and track progress" },
                { week: "Week 9-10", task: "Mid-quarter review and adjustments" },
                { week: "Week 11-12", task: "Quarter wrap-up and retrospective" },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-2 text-sm">
                  <span className="font-semibold w-16">{item.week}:</span>
                  <span className="text-gray-600">{item.task}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Strategic Priorities Matrix */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-purple-500" />
              Strategic Priorities Matrix
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="font-semibold text-red-700">Urgent & Important</p>
                <p className="text-xs mt-1">Do First</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="font-semibold text-yellow-700">Important, Not Urgent</p>
                <p className="text-xs mt-1">Schedule</p>
              </div>
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="font-semibold text-blue-700">Urgent, Not Important</p>
                <p className="text-xs mt-1">Delegate</p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="font-semibold text-gray-700">Not Urgent, Not Important</p>
                <p className="text-xs mt-1">Eliminate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Success Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              Key Success Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex justify-between">
                <span>Revenue Growth</span>
                <span className="font-semibold">≥ 20% YoY</span>
              </li>
              <li className="flex justify-between">
                <span>Profit Margin</span>
                <span className="font-semibold">≥ 25%</span>
              </li>
              <li className="flex justify-between">
                <span>Customer Retention</span>
                <span className="font-semibold">≥ 90%</span>
              </li>
              <li className="flex justify-between">
                <span>Employee NPS</span>
                <span className="font-semibold">≥ 50</span>
              </li>
              <li className="flex justify-between">
                <span>Market Share</span>
                <span className="font-semibold">Top 3</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 text-center text-xs text-gray-400 border-t">
        <p>For more resources, visit ceooo.com/resources</p>
      </div>
    </div>
  );
}