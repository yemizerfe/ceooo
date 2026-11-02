"use client";

import { debugLog } from "@/lib/logger";
import { useState } from "react";
import { useDecisionStore } from "@/store/decisionStore";
import { cn } from "@/lib/utils";
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Search,
  Circle,
  CheckCircle2,
  Clock,
  TrendingUp,
  X,
  Trash2,
  AlertCircle,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface DecisionListProps {
  isOpen: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onNewDecision: () => void;
  onDeleteDecision?: (id: string, title: string) => void;
}

const statusIcons = {
  pending: Circle,
  in_progress: Clock,
  "in-progress": Clock,
  decided: CheckCircle2,
  executing: TrendingUp,
};

const priorityColors = {
  high: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  medium: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400",
  low: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400",
};

// Delete Confirmation Modal Component
const DeleteConfirmModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  decisionTitle 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  decisionTitle: string;
}) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
            <Trash2 className="w-5 h-5 text-red-500" />
          </div>
          <DialogTitle className="text-red-600 dark:text-red-400">Delete Decision</DialogTitle>
        </div>
      </DialogHeader>
      <div className="py-4">
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          Are you sure you want to delete this decision?
        </p>
        <p className="font-semibold text-gray-900 dark:text-white">"{decisionTitle}"</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
          This action cannot be undone. All associated data will be permanently removed.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={onClose} variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button onClick={onConfirm} className="flex-1 bg-red-600 hover:bg-red-700">
          <Trash2 className="w-4 h-4 mr-2" />
          Delete
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

// Success Modal Component
const SuccessModal = ({ 
  isOpen, 
  onClose, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  message: string;
}) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-500" />
          </div>
          <DialogTitle className="text-green-600 dark:text-green-400">Success</DialogTitle>
        </div>
      </DialogHeader>
      <div className="py-4">
        <p className="text-gray-600 dark:text-gray-400">{message}</p>
      </div>
      <Button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-700">
        Got it
      </Button>
    </DialogContent>
  </Dialog>
);

// Error Modal Component
const ErrorModal = ({ 
  isOpen, 
  onClose, 
  message, 
  onRetry 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  message: string;
  onRetry: () => void;
}) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <DialogTitle className="text-red-600 dark:text-red-400">Error</DialogTitle>
        </div>
      </DialogHeader>
      <div className="py-4">
        <p className="text-gray-600 dark:text-gray-400">{message}</p>
      </div>
      <div className="flex gap-3">
        <Button onClick={onClose} variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button onClick={onRetry} className="flex-1 bg-blue-600 hover:bg-blue-700">
          Try Again
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

export function DecisionList({ isOpen, mobileOpen, onMobileClose, onNewDecision, onDeleteDecision }: DecisionListProps) {
  const { decisions, currentDecisionId, setCurrentDecision, deleteDecision, loading } = useDecisionStore();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Modal states
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [decisionToDelete, setDecisionToDelete] = useState<{ id: string; title: string } | null>(null);
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorModalOpen, setErrorModalOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // NOTE: Decision fetching is handled by the decisions page (page.tsx) on mount.
  // DecisionList must NOT auto-fetch: its useRef guard resets whenever the page
  // shows the loading spinner (which unmounts this component), causing an
  // infinite mount -> fetch -> unmount loop when the server has 0 decisions.

  const filteredDecisions = decisions.filter((d) =>
    (d.title ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteClick = (id: string, title: string) => {
    setDecisionToDelete({ id, title });
    setDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (decisionToDelete) {
      try {
        await deleteDecision(decisionToDelete.id);
        setDeleteModalOpen(false);
        setSuccessMessage(`Decision "${decisionToDelete.title}" deleted successfully`);
        setSuccessModalOpen(true);
        setDecisionToDelete(null);
      } catch (error: any) {
        setDeleteModalOpen(false);
        setErrorMessage(error.message || "Failed to delete decision");
        setErrorModalOpen(true);
      }
    }
  };

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Decisions</h2>
          <Button size="sm" variant="ghost" onClick={onNewDecision} className="h-8 w-8 p-0">
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search decisions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-gray-100 dark:bg-white/5 border-0"
          />
        </div>
      </div>

      {/* Decision List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-gray-500 mt-2">Loading...</p>
          </div>
        ) : filteredDecisions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-gray-500">No decisions yet</p>
            <Button variant="link" onClick={onNewDecision} className="mt-2">
              Create your first decision
            </Button>
          </div>
        ) : (
          filteredDecisions.map((decision) => {
            const statusKey = decision.status === 'in_progress' ? 'in_progress' : decision.status;
            const StatusIcon = statusIcons[statusKey as keyof typeof statusIcons] || Circle;
            const isSelected = currentDecisionId === decision.id;
            
            return (
              <div
                key={decision.id}
                className={cn(
                  "relative w-full rounded-lg transition-all cursor-pointer",
                  isSelected
                    ? "bg-blue-50 dark:bg-blue-500/10 border-l-4 border-blue-500"
                    : "hover:bg-gray-100 dark:hover:bg-white/5"
                )}
              >
                <div
                  onClick={() => {
                    debugLog("Selected decision:", decision);
                    setCurrentDecision(decision.id);
                    onMobileClose();
                  }}
                  className="p-3"
                >
                  <div className="flex items-start gap-2 mb-2 pr-6">
                    <StatusIcon className={cn(
                      "w-4 h-4 mt-0.5 flex-shrink-0",
                      decision.status === "pending" && "text-gray-400",
                      (decision.status === "in_progress" || decision.status === "in-progress") && "text-yellow-500",
                      decision.status === "decided" && "text-green-500",
                      decision.status === "executing" && "text-blue-500"
                    )} />
                    <span className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                      {decision.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 ml-6">
                    <Badge className={priorityColors[decision.priority as keyof typeof priorityColors]}>
                      {decision.priority}
                    </Badge>
                    <span className="text-xs text-gray-500 capitalize">{decision.status.replace('_', ' ')}</span>
                  </div>
                </div>
                
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onDeleteDecision) {
                      onDeleteDecision(decision.id, decision.title);
                      return;
                    }
                    handleDeleteClick(decision.id, decision.title);
                  }}
                  className="absolute top-3 right-3 p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden lg:flex flex-col border-r border-gray-200 dark:border-white/10 bg-white dark:bg-slate-900 transition-all duration-300",
        isOpen ? "w-64" : "w-16"
      )}>
        {isOpen ? sidebarContent : (
          <div className="flex flex-col items-center py-4">
            <Button variant="ghost" size="icon" onClick={onNewDecision} className="mb-4">
              <Plus className="w-5 h-5" />
            </Button>
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
              <span className="text-xs font-bold text-blue-600">{decisions.length}</span>
            </div>
          </div>
        )}
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={onMobileClose} />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white dark:bg-slate-900 shadow-xl">
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setDecisionToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        decisionTitle={decisionToDelete?.title || ""}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        message={successMessage}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={errorModalOpen}
        onClose={() => setErrorModalOpen(false)}
        message={errorMessage}
        onRetry={() => {
          setErrorModalOpen(false);
          if (decisionToDelete) {
            setDeleteModalOpen(true);
          }
        }}
      />
    </>
  );
}