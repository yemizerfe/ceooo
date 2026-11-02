import { AIPromptLibrary } from "../AIPromptLibrary";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AIPromptLibraryPage() {
  return (
    <div className="min-h-screen pt-0 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/resource/downloads" className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 mb-6 text-sm font-medium">
          <ArrowLeft className="w-4 h-4" />
          Back to Downloads
        </Link>
        <AIPromptLibrary />
      </div>
    </div>
  );
}
