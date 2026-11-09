"use client";
import { orionFetch } from "@/lib/orion-fetch";
import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Search,
  Eye,
  Trash2,
  FileText,
  X,
  Share2,
  Check,
  Clock,
  XCircle,
  Edit,
  Plus,
  Minus,
  Download,
  AlertCircle,
  Info,
  CheckCircle,
  TrendingUp,
} from "lucide-react";

function SavedAnalyses() {
  const supabase = createClient();
  const router = useRouter();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredAnalyses, setFilteredAnalyses] = useState([]);
  const [selectedAnalysis, setSelectedAnalysis] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareData, setShareData] = useState({
    analysisId: null,
    recipientId: "",
    message: "",
  });
  const [isSharing, setIsSharing] = useState(false);
  const [seniors, setSeniors] = useState([]);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingAnalysis, setEditingAnalysis] = useState(null);
  const [editData, setEditData] = useState({
    analysis_type: "",
    results: {},
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSavedAnalyses();
    fetchSeniors();
  }, []);

  useEffect(() => {
    // Filter analyses based on search term
    if (searchTerm.trim() === "") {
      setFilteredAnalyses(analyses);
    } else {
      const filtered = analyses.filter(
        (analysis) =>
          analysis.audits?.title
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          analysis.analysis_type
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          analysis.summary?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredAnalyses(filtered);
    }
  }, [searchTerm, analyses]);

  const fetchSavedAnalyses = async () => {
    try {
      setLoading(true);

      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting user:", userError);
        toast.error("Error fetching user information");
        return;
      }

      if (!user) {
        toast.error("Please log in to view saved analyses");
        router.push("/sign-in");
        return;
      }

      // Fetch saved analyses for the current user
      const { data: analysesData, error: analysesError } = await supabase
        .from("audit_analysis")
        .select(
          `
          *,
          audits (
            title,
            category,
            status
          )
        `
        )
        .eq("created_by", user.id)
        .order("created_at", { ascending: false });

      if (analysesError) {
        console.error("Error fetching analyses:", analysesError);
        toast.error("Error fetching saved analyses");
        return;
      }

      setAnalyses(analysesData || []);
    } catch (error) {
      console.error("Error in fetchSavedAnalyses:", error);
      toast.error("An error occurred while fetching analyses");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAnalysis = async (analysisId) => {
    if (!confirm("Are you sure you want to delete this analysis?")) return;

    try {
      setIsDeleting(true);
      const { error } = await supabase
        .from("audit_analysis")
        .delete()
        .eq("id", analysisId);

      if (error) {
        console.error("Error deleting analysis:", error);
        toast.error("Error deleting analysis");
        return;
      }

      toast.success("Analysis deleted successfully");
      await fetchSavedAnalyses();
    } catch (error) {
      console.error("Error in handleDeleteAnalysis:", error);
      toast.error("An error occurred while deleting the analysis");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownloadAnalysis = (analysis) => {
    try {
      const dataStr = JSON.stringify(analysis, null, 2);
      const dataUri =
        "data:application/json;charset=utf-8," + encodeURIComponent(dataStr);

      const exportFileDefaultName = `analysis_${
        analysis.audits?.title || "unknown"
      }_${new Date().toISOString().split("T")[0]}.json`;

      const linkElement = document.createElement("a");
      linkElement.setAttribute("href", dataUri);
      linkElement.setAttribute("download", exportFileDefaultName);
      linkElement.click();

      toast.success("Analysis downloaded successfully");
    } catch (error) {
      console.error("Error downloading analysis:", error);
      toast.error("Error downloading analysis");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchSeniors = async () => {
    try {
      // Fetch users with senior roles from your profiles table
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .in("role", ["manager", "senior_auditor", "director", "admin"])
        .order("full_name");

      if (error) {
        console.error("Error fetching seniors:", error);
        return;
      }

      setSeniors(profiles || []);
    } catch (error) {
      console.error("Error in fetchSeniors:", error);
    }
  };

  const handleShareAnalysis = async () => {
    try {
      setIsSharing(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to share analyses");
        return;
      }

      // Validate required fields
      if (!shareData.analysisId || !shareData.recipientId) {
        toast.error("Please select an analysis and recipient");
        return;
      }

      // Create share record in analysis_shares table
      const { data, error: shareError } = await supabase
        .from("analysis_shares")
        .insert({
          analysis_id: shareData.analysisId,
          shared_with_user_id: shareData.recipientId,
          shared_by_user_id: user.id,
          permission_level: "view",
          expires_at: null, // No expiry
        });

      if (shareError) {
        console.error("Error sharing analysis:", {
          error: shareError,
          message: shareError.message,
          details: shareError.details,
          code: shareError.code,
        });
        toast.error(
          `Error sharing analysis: ${shareError.message || "Database error"}`
        );
        return;
      }

      // Create notification for the recipient
      try {
        await orionFetch("/api/notifications", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userId: shareData.recipientId,
            type: "analysis_shared",
            title: "Analysis Shared",
            message: `An analysis has been shared with you${
              shareData.message ? ": " + shareData.message : "."
            }`,
            data: {
              analysisId: shareData.analysisId,
            },
          }),
        });
      } catch (notificationError) {
        console.error("Error creating notification:", notificationError);
        // Don't fail the sharing process for notification errors
      }

      toast.success("Analysis shared successfully");
      setShareModalOpen(false);
      setShareData({ analysisId: null, recipientId: "", message: "" });
      fetchSavedAnalyses(); // Refresh to show updated status
    } catch (error) {
      console.error("Error in handleShareAnalysis:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSharing(false);
    }
  };

  const handleEditAnalysis = (analysis) => {
    setEditingAnalysis(analysis);
    setEditData({
      analysis_type: analysis.analysis_type || "",
      results: analysis.results || {},
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    try {
      setIsSaving(true);

      const { error } = await supabase
        .from("audit_analysis")
        .update({
          analysis_type: editData.analysis_type,
          results: editData.results,
        })
        .eq("id", editingAnalysis.id);

      if (error) {
        console.error("Error updating analysis:", error.message || error);
        toast.error(
          `Error saving changes: ${error.message || "Unknown error"}`
        );
        return;
      }

      toast.success("Analysis updated successfully");
      setEditModalOpen(false);
      setEditingAnalysis(null);
      setEditData({
        analysis_type: "",
        results: {},
      });
      fetchSavedAnalyses(); // Refresh the analyses
    } catch (error) {
      console.error("Error in handleSaveEdit:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const renderAnalysisResults = (results) => {
    if (!results || !Array.isArray(results)) {
      return (
        <div className="text-gray-600 dark:text-gray-400 text-sm">
          No analysis results available
        </div>
      );
    }

    // Filter out status items for display
    const displayItems = results.filter((item) => item.metric !== "Status");

    if (displayItems.length === 0) {
      return (
        <div className="text-gray-600 dark:text-gray-400 text-sm">
          No analysis results to display
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {displayItems.map((item, index) => (
          <div key={index} className="border-l-4 border-cyan-400 pl-4 py-2">
            <div className="flex items-start gap-3">
              <span className="text-lg">{item.icon || "📊"}</span>
              <div className="flex-1">
                <h5 className="font-medium text-gray-900 dark:text-white mb-1">
                  {item.metric}
                </h5>
                <div className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                  {item.value && typeof item.value === "string" ? (
                    <div className="whitespace-pre-wrap">{item.value}</div>
                  ) : (
                    <pre className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {JSON.stringify(item.value, null, 2)}
                    </pre>
                  )}
                </div>
                {item.observation && (
                  <div className="mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-xs text-blue-800 dark:text-blue-200">
                    <strong>Observation:</strong> {item.observation}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const getAnalysisIcon = (type) => {
    switch (type) {
      case "summary":
        return <Info className="w-5 h-5 text-blue-500" />;
      case "riskAssessment":
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case "controlEffectiveness":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "complianceCheck":
        return <Check className="w-5 h-5 text-purple-500" />;
      case "recommendations":
        return <TrendingUp className="w-5 h-5 text-orange-500" />;
      default:
        return <FileText className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-600 text-white";
      case "In Progress":
        return "bg-yellow-600 text-white";
      case "Not Started":
        return "bg-gray-600 text-white";
      default:
        return "bg-gray-600 text-white";
    }
  };

  const renderAnalysisDetails = (analysis) => {
    if (!analysis) return null;

    // Find status item for progress indicator
    const statusItem = Array.isArray(analysis.results)
      ? analysis.results.find((item) => item.metric === "Status")
      : null;

    return (
      <div className="space-y-6">
        {/* Status Indicator */}
        {statusItem && (
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <span className="text-xl">{statusItem.icon || "✅"}</span>
            <div>
              <div className="font-medium text-green-800 dark:text-green-200">
                {statusItem.value}
              </div>
              {statusItem.progress && (
                <div className="text-sm text-green-600 dark:text-green-400">
                  Progress: {statusItem.progress}%
                </div>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                {analysis.audits?.title || "Untitled Analysis"}
              </h3>
              <Badge className={getStatusColor(analysis.audits?.status)}>
                {analysis.audits?.status || "Unknown"}
              </Badge>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Created on {formatDate(analysis.created_at)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => handleEditAnalysis(analysis)}
              className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
            <Button
              onClick={() => {
                setShareData({ ...shareData, analysisId: analysis.id });
                setShareModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
            <Button
              onClick={() => setSelectedAnalysis(null)}
              className="bg-gray-800 hover:bg-gray-700 text-white dark:bg-gray-700 dark:hover:bg-gray-600"
            >
              <X className="w-4 h-4 mr-2" />
              Close
            </Button>
            <Button
              onClick={() => handleDeleteAnalysis(analysis.id)}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-600 dark:hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>

        {/* Analysis Type */}
        <div className="space-y-2">
          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
            Analysis Type
          </h4>
          <div className="flex items-center space-x-2">
            {getAnalysisIcon(analysis.analysis_type)}
            <span className="text-gray-700 dark:text-gray-300">
              {analysis.analysis_type || "Unknown Type"}
            </span>
          </div>
        </div>

        {/* Analysis Results */}
        {analysis.results && (
          <div className="space-y-4">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              Analysis Results
            </h4>
            <div className="bg-gray-50 dark:bg-slate-900 p-4 rounded-lg border border-gray-200 dark:border-slate-700 max-h-96 overflow-y-auto">
              {renderAnalysisResults(analysis.results)}
            </div>
          </div>
        )}

        {/* Audit Information */}
        {analysis.audits && (
          <div className="space-y-2 border-t border-gray-200 dark:border-slate-700 pt-6">
            <h4 className="text-lg font-medium text-gray-900 dark:text-white">
              Audit Information
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Title
                </label>
                <p className="text-gray-900 dark:text-white">
                  {analysis.audits.title || "N/A"}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                  Category
                </label>
                <p className="text-gray-900 dark:text-white">
                  {analysis.audits.category || "N/A"}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <main className="main-content">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Loading saved analyses...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <main className="main-content">
        <div className="header">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => router.push("/dashboard/analysis")}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Analysis
              </Button>
              <div>
                <h2 className="header-title">Saved Analyses</h2>
                <p className="header-subtitle">
                  View and manage your saved audit analyses
                </p>
              </div>
            </div>
            
          </div>
        </div>

        <div className="space-y-6">
          {/* Search */}
          <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search analyses by title, type, or summary..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
                />
              </div>
            </CardContent>
          </Card>

          {filteredAnalyses.length === 0 ? (
            <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
              <CardContent className="p-8 text-center">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  {analyses.length === 0
                    ? "No Saved Analyses"
                    : "No Analyses Found"}
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  {analyses.length === 0
                    ? "You haven't saved any analyses yet. Generate and save an analysis to see it here."
                    : "No analyses match your search criteria. Try adjusting your search terms."}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Analyses List */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Analyses ({filteredAnalyses.length})
                </h3>
                <div className="space-y-3">
                  {filteredAnalyses.map((analysis) => (
                    <Card
                      key={analysis.id}
                      className={`bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 cursor-pointer transition-all hover:border-cyan-400/50 ${
                        selectedAnalysis?.id === analysis.id
                          ? "border-cyan-400/50 bg-gray-50 dark:bg-slate-800/80"
                          : ""
                      }`}
                      onClick={() => setSelectedAnalysis(analysis)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="text-gray-900 dark:text-white font-medium line-clamp-1">
                                {analysis.audits?.title || "Untitled Analysis"}
                              </h4>
                              <div className="flex items-center gap-1">
                                <Badge
                                  className={getStatusColor(
                                    analysis.audits?.status
                                  )}
                                >
                                  {analysis.audits?.status || "Unknown"}
                                </Badge>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                              {getAnalysisIcon(analysis.analysis_type)}
                              <span className="text-gray-600 dark:text-gray-400 text-sm">
                                {analysis.analysis_type || "Unknown Type"}
                              </span>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-2 line-clamp-2">
                              {analysis.summary || "No summary available"}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-500">
                              <span>{formatDate(analysis.created_at)}</span>
                              <span>
                                {analysis.audits?.category ||
                                  "Unknown Category"}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditAnalysis(analysis);
                              }}
                              className="text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-400/10"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShareData({
                                  ...shareData,
                                  analysisId: analysis.id,
                                });
                                setShareModalOpen(true);
                              }}
                              className="text-blue-600 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-400/10"
                            >
                              <Share2 className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-cyan-600 hover:bg-cyan-100 dark:text-cyan-400 dark:hover:bg-cyan-400/10"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Analysis Details */}
              <div className="space-y-4">
                {selectedAnalysis ? (
                  <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                    <CardContent className="p-6">
                      {renderAnalysisDetails(selectedAnalysis)}
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                    <CardContent className="p-8 text-center">
                      <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Select an Analysis
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Click on an analysis from the list to view its details.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Share Modal */}
        <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
          <DialogContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white">
            <DialogHeader>
              <DialogTitle>Share Analysis</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Share with
                </label>
                <Select
                  value={shareData.recipientId}
                  onValueChange={(value) =>
                    setShareData({ ...shareData, recipientId: value })
                  }
                >
                  <SelectTrigger className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Select a person to share with" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                    {seniors.map((senior) => (
                      <SelectItem
                        key={senior.id}
                        value={senior.id}
                        className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
                      >
                        {senior.full_name} ({senior.email}) - {senior.role}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Message (optional)
                </label>
                <Textarea
                  placeholder="Add a message for the recipient..."
                  value={shareData.message}
                  onChange={(e) =>
                    setShareData({ ...shareData, message: e.target.value })
                  }
                  className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setShareModalOpen(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleShareAnalysis}
                  disabled={!shareData.recipientId || isSharing}
                  className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  {isSharing ? "Sharing..." : "Share Analysis"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit Modal */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Analysis</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Analysis Type
                </label>
                <Select
                  value={editData.analysis_type || ""}
                  onValueChange={(value) =>
                    setEditData({ ...editData, analysis_type: value })
                  }
                >
                  <SelectTrigger className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white">
                    <SelectValue placeholder="Select analysis type" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700">
                    <SelectItem
                      value="summary"
                      className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      Summary
                    </SelectItem>
                    <SelectItem
                      value="riskAssessment"
                      className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      Risk Assessment
                    </SelectItem>
                    <SelectItem
                      value="controlEffectiveness"
                      className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      Control Effectiveness
                    </SelectItem>
                    <SelectItem
                      value="complianceCheck"
                      className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      Compliance Check
                    </SelectItem>
                    <SelectItem
                      value="recommendations"
                      className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-slate-700"
                    >
                      Recommendations
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">
                  Analysis Results (JSON)
                </label>
                <Textarea
                  value={JSON.stringify(editData.results || {}, null, 2)}
                  onChange={(e) => {
                    try {
                      const parsed = JSON.parse(e.target.value);
                      setEditData({ ...editData, results: parsed });
                    } catch (err) {
                      // Keep the raw text value for editing
                      setEditData({ ...editData, results: e.target.value });
                    }
                  }}
                  className="bg-gray-50 dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white font-mono text-sm"
                  placeholder="Enter analysis results as JSON"
                  rows={12}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  onClick={() => setEditModalOpen(false)}
                  className="bg-gray-600 hover:bg-gray-700 text-white dark:bg-gray-700 dark:hover:bg-gray-600"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveEdit}
                  disabled={!editData.analysis_type || isSaving}
                  className="bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

export default SavedAnalyses;
