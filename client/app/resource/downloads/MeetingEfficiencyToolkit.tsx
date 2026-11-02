"use client";
// components/resources/MeetingEfficiencyToolkit.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Clock, Users, CheckCircle2, AlertCircle } from "lucide-react";

export function MeetingEfficiencyToolkit() {
  return (
    <div className="p-8 max-w-4xl mx-auto bg-white">
      {/* Header */}
      <div className="text-center mb-8 pb-8 border-b">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Meeting Efficiency Toolkit</h1>
        <p className="text-gray-600">Templates and checklists for productive executive meetings</p>
      </div>

      {/* Pre-Meeting Checklist */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
            Pre-Meeting Checklist
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[
              "Define clear meeting objective",
              "Set agenda and share 48 hours in advance",
              "Invite only essential participants",
              "Share pre-reading materials",
              "Set time limit (30-60 minutes recommended)",
              "Assign roles (facilitator, note-taker, timekeeper)",
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <input type="checkbox" className="w-4 h-4 rounded border-gray-300" />
                <span className="text-sm">{item}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Meeting Agenda Template */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-500" />
            Meeting Agenda Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded">
              <p className="font-semibold">Meeting Title: _________________________</p>
              <p className="text-sm mt-2">Date: ___________ | Time: ___________ | Duration: ___________</p>
            </div>
            <div className="space-y-2">
              <div className="flex gap-4 text-sm">
                <span className="font-semibold w-24">Time</span>
                <span className="font-semibold flex-1">Topic</span>
                <span className="font-semibold w-24">Owner</span>
              </div>
              {[
                { time: "5 min", topic: "Check-in & review agenda", owner: "Facilitator" },
                { time: "15 min", topic: "Review action items from last meeting", owner: "CEO" },
                { time: "25 min", topic: "Main discussion topic", owner: "Topic owner" },
                { time: "10 min", topic: "Decisions & action items", owner: "All" },
                { time: "5 min", topic: "Next steps & close", owner: "Facilitator" },
              ].map((item, idx) => (
                <div key={idx} className="flex gap-4 text-sm border-b pb-2">
                  <span className="w-24">{item.time}</span>
                  <span className="flex-1">{item.topic}</span>
                  <span className="w-24">{item.owner}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Decision Record Template */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-purple-500" />
            Decision Record Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="font-semibold">Decision: _________________________</p>
                <p className="text-gray-500 text-xs mt-1">What was decided?</p>
              </div>
              <div>
                <p className="font-semibold">Date: _________________________</p>
              </div>
              <div>
                <p className="font-semibold">Decision Maker: _________________________</p>
              </div>
              <div>
                <p className="font-semibold">Impact Level: High / Medium / Low</p>
              </div>
            </div>
            <div>
              <p className="font-semibold">Rationale:</p>
              <p className="text-sm text-gray-600 mt-1">_________________________________________</p>
              <p className="text-sm text-gray-600">_________________________________________</p>
            </div>
            <div>
              <p className="font-semibold">Action Items:</p>
              <div className="mt-2 space-y-1">
                {["", "", ""].map((_, idx) => (
                  <div key={idx} className="flex gap-2 text-sm">
                    <span>•</span>
                    <span className="flex-1">_________________________</span>
                    <span className="w-24">Owner: ______</span>
                    <span className="w-24">Due: ______</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Meeting Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-500" />
            Meeting Metrics Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-blue-50 rounded">
              <div className="text-2xl font-bold text-blue-600">___%</div>
              <div className="text-xs text-gray-600">Decision Rate</div>
            </div>
            <div className="p-3 bg-green-50 rounded">
              <div className="text-2xl font-bold text-green-600">___%</div>
              <div className="text-xs text-gray-600">Action Completion</div>
            </div>
            <div className="p-3 bg-purple-50 rounded">
              <div className="text-2xl font-bold text-purple-600">___ hrs</div>
              <div className="text-xs text-gray-600">Avg Meeting Time</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}