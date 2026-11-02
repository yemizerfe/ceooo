"use client";
// components/resources/AIPromptLibrary.tsx

export function AIPromptLibrary() {
  return (
    <div id="ai-prompt-library-pdf" className="p-8 max-w-4xl mx-auto bg-white">
      <div className="text-center mb-8 pb-8 border-b">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Prompt Library for CEOs</h1>
        <p className="text-gray-600">100+ proven prompts to get the best results from AI decision assistants</p>
      </div>

      {/* Strategic Planning Prompts */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span className="text-purple-500">🎯</span> Strategic Planning Prompts
        </h2>
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="font-semibold text-sm">Market Expansion Strategy:</p>
            <p className="text-sm text-gray-600 mt-1">"Analyze the potential risks and opportunities of expanding into [market name]. Consider competitive landscape, regulatory environment, and cultural factors."</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="font-semibold text-sm">OKR Development:</p>
            <p className="text-sm text-gray-600 mt-1">"Help me create OKRs for [department/goal]. Suggest 1 objective and 3 key results that are specific, measurable, and time-bound."</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="font-semibold text-sm">Competitive Analysis:</p>
            <p className="text-sm text-gray-600 mt-1">"Compare our company with [competitor names]. Identify our competitive advantages, weaknesses, and strategic opportunities."</p>
          </div>
        </div>
      </div>

      {/* Financial Decision Prompts */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
          <span className="text-green-500">💰</span> Financial Decision Prompts
        </h2>
        <div className="space-y-3">
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="font-semibold text-sm">Investment Analysis:</p>
            <p className="text-sm text-gray-600 mt-1">"Evaluate the ROI of investing $[amount] in [project/initiative]. Consider short-term and long-term returns, risks, and opportunity costs."</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <p className="font-semibold text-sm">Budget Optimization:</p>
            <p className="text-sm text-gray-600 mt-1">"Our current budget is $[amount]. Suggest how to reallocate resources to maximize growth while reducing costs by [percentage]%."</p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 pt-4 text-center text-xs text-gray-400 border-t">
        <p>For the complete library of 100+ prompts, visit ceooo.com/resources</p>
      </div>
    </div>
  );
}