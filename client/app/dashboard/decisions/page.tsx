"use client";

import { debugLog } from "@/lib/logger";
import { useState, useEffect, useRef } from "react";
import { useDecisionStore } from "@/store/decisionStore";
import { DecisionList } from "./DecisionList";
import { DecisionWorkspace } from "./DecisionWorkspace";
import { DecisionInsights } from "./DecisionInsights";
import { Button } from "@/components/ui/button";
import { Plus, RefreshCw, AlertCircle, X, CheckCircle2, Trash2 } from "lucide-react";
import { NewDecisionModal } from "./NewDecisionModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

// Custom Modal Components
const ErrorModal = ({ isOpen, onClose, error, onRetry }: { isOpen: boolean; onClose: () => void; error: string; onRetry: () => void }) => (
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
        <p className="text-gray-600 dark:text-gray-400">{error}</p>
      </div>
      <div className="flex gap-3">
        <Button onClick={onClose} variant="outline" className="flex-1">
          Cancel
        </Button>
        <Button onClick={onRetry} className="flex-1 bg-blue-600 hover:bg-blue-700">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    </DialogContent>
  </Dialog>
);

const SuccessModal = ({ isOpen, onClose, message }: { isOpen: boolean; onClose: () => void; message: string }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5 text-green-500" />
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

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, decisionTitle }: { isOpen: boolean; onClose: () => void; onConfirm: () => void; decisionTitle: string }) => (
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

const InfoModal = ({ isOpen, onClose, title, message }: { isOpen: boolean; onClose: () => void; title: string; message: string }) => (
  <Dialog open={isOpen} onOpenChange={onClose}>
    <DialogContent className="max-w-md">
      <DialogHeader>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
            <AlertCircle className="w-5 h-5 text-blue-500" />
          </div>
          <DialogTitle className="text-blue-600 dark:text-slate-300">{title}</DialogTitle>
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

export default function DecisionsPage() {
  const { 
    decisions, 
    currentDecisionId, 
    setCurrentDecision,
    fetchDecisions, 
    loading, 
    error, 
    clearError,
    deleteDecision
  } = useDecisionStore();
  
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [decisionToDelete, setDecisionToDelete] = useState<{ id: string; title: string } | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoTitle, setInfoTitle] = useState("");
  const [infoMessage, setInfoMessage] = useState("");
  const [hasLoaded, setHasLoaded] = useState(false);
  const hasRequestedRef = useRef(false);
  
  // Track if decision was actually created
  const [decisionCreated, setDecisionCreated] = useState(false);

  const currentDecision = decisions.find(d => d.id === currentDecisionId);

  useEffect(() => {
    debugLog("=== DecisionsPage Debug ===");
    debugLog("decisions.length:", decisions.length);
    debugLog("currentDecisionId:", currentDecisionId);
    debugLog("currentDecision:", currentDecision);
    debugLog("loading:", loading);
  }, [decisions, currentDecisionId, currentDecision, loading]);

  useEffect(() => {
    if (hasRequestedRef.current || loading || hasLoaded) return;
    hasRequestedRef.current = true;
    fetchDecisions();
    setHasLoaded(true);
  }, [fetchDecisions, hasLoaded, loading]);

  useEffect(() => {
    if (decisions.length > 0 && !currentDecisionId) {
      setCurrentDecision(decisions[0].id);
    }
  }, [decisions, currentDecisionId, setCurrentDecision]);

  const handleRefresh = () => {
    clearError();
    fetchDecisions();
  };

  const handleModalClose = (decisionWasCreated: boolean = false) => {
    setShowModal(false);
    if (decisionWasCreated) {
      fetchDecisions();
      setSuccessMessage("Decision created successfully!");
      setShowSuccessModal(true);
    }
  };

  const handleDeleteClick = (id: string, title: string) => {
    setDecisionToDelete({ id, title });
    setShowDeleteConfirm(true);
  };

  const handleConfirmDelete = async () => {
    if (decisionToDelete) {
      try {
        await deleteDecision(decisionToDelete.id);
        setShowDeleteConfirm(false);
        setSuccessMessage(`Decision "${decisionToDelete.title}" deleted successfully`);
        setShowSuccessModal(true);
        setDecisionToDelete(null);
      } catch (err: any) {
        setErrorMessage(err.message || "Failed to delete decision");
        setShowErrorModal(true);
      }
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
    setDecisionToDelete(null);
  };

  const handleError = (message: string) => {
    setErrorMessage(message);
    setShowErrorModal(true);
  };

  const showInfo = (title: string, message: string) => {
    setInfoTitle(title);
    setInfoMessage(message);
    setShowInfoModal(true);
  };

  if (loading && decisions.length === 0 && !error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-gray-500 font-medium">Loading decisions...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (error && decisions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Failed to Load Decisions</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={handleRefresh} className="bg-blue-600 hover:bg-blue-700">
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 dark:bg-slate-900 overflow-hidden flex">
      {/* Rest of the content */}
      <div className="flex-1 flex h-full overflow-hidden">

      {/* Floating New Decision Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <Button 
          onClick={() => setShowModal(true)} 
          className="bg-blue-600 hover:bg-blue-700 shadow-lg gap-2 rounded-full px-6 py-6 h-auto"
        >
          <Plus className="w-5 h-5" />
          New Decision
        </Button>
      </div>

      <DecisionList 
        isOpen={sidebarOpen} 
        mobileOpen={false} 
        onMobileClose={() => {}} 
        onNewDecision={() => setShowModal(true)} 
        onDeleteDecision={handleDeleteClick}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <DecisionWorkspace 
          currentDecision={currentDecision} 
          onError={handleError}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setShowSuccessModal(true);
          }}
        />
      </div>

      {/* `key` resets the sidebar on navigation so one decision's analysis is
          never shown next to another decision's record. */}
      {currentDecision && <DecisionInsights key={currentDecision.id} decision={currentDecision} />}
      </div>

      {/* New Decision Modal - Pass the callback */}
      <NewDecisionModal 
        isOpen={showModal} 
        onClose={handleModalClose}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal 
        isOpen={showDeleteConfirm}
        onClose={handleCancelDelete}
        onConfirm={handleConfirmDelete}
        decisionTitle={decisionToDelete?.title || ""}
      />

      {/* Success Modal */}
      <SuccessModal 
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        message={successMessage}
      />

      {/* Error Modal */}
      <ErrorModal 
        isOpen={showErrorModal}
        onClose={() => {
          setShowErrorModal(false);
          clearError();
        }}
        error={errorMessage}
        onRetry={() => {
          setShowErrorModal(false);
          handleRefresh();
        }}
      />

      {/* Info Modal */}
      <InfoModal 
        isOpen={showInfoModal}
onClose={() => setShowInfoModal(false)}
        title={infoTitle}
        message={infoMessage}
      />
    </div>
  );
}