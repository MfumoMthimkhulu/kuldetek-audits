"use client";
import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, XCircle, Clock, FileText, User, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

function ApprovalsPage() {
  const supabase = createClient();
  const router = useRouter();
  const [pendingShares, setPendingShares] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedShare, setSelectedShare] = useState(null);
  const [responseMessage, setResponseMessage] = useState("");
  const [isResponding, setIsResponding] = useState(false);

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // fetching audits shared with the current user
      const { data: shares, error: sharesError } = await supabase
        .from("audit_report_shares")
        .select("*")
        .eq("shared_with", user.id)
        .eq("status", "pending")
        .order("shared_at", { ascending: false });

      if (sharesError) {
        console.error(
          "Error fetching audits shared with current user:",
          sharesError
        );
        toast.error("Error fetching pending approvals");
        return;
      }

      if (!shares || shares.length === 0) {
        setPendingShares([]);
        return;
      }

      // Get report IDs and fetch reports separately
      const reportIds = shares.map((share) => share.report_id);

      const { data: reports, error: reportsError } = await supabase
        .from("audit_reports")
        .select("*")
        .in("id", reportIds);

      if (reportsError) {
        console.error("Error fetching reports:", reportsError);
        toast.error("Error fetching report details");
        return;
      }

      // Get shared_by user IDs and fetch profiles
      const userIds = shares.map((share) => share.shared_by);

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      if (profilesError) {
        console.error("Error fetching profiles:", profilesError);
      }

      // Manually join the data
      const joinedData = shares.map((share) => ({
        ...share,
        audit_reports:
          reports?.find((report) => report.id === share.report_id) || null,
        shared_by_profile:
          profiles?.find((profile) => profile.id === share.shared_by) || null,
      }));

      console.log("Joined data:", joinedData); // Debug log
      setPendingShares(joinedData);
    } catch (error) {
      console.error("Error in fetchPendingApprovals:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (shareId, reportId, action) => {
    try {
      setIsResponding(true);

      // Update share status
      const { error: shareError } = await supabase
        .from("audit_report_shares")
        .update({
          status: action,
          responded_at: new Date().toISOString(),
          response_message: responseMessage,
        })
        .eq("id", shareId);

      if (shareError) {
        console.error("Error updating share:", shareError);
        toast.error("Error updating approval status");
        return;
      }

      // Update report approval status
      const reportStatus = action === "approved" ? "approved" : "rejected";
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const updateData = {
        approval_status: reportStatus,
        ...(action === "approved" && {
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        }),
      };

      const { error: reportError } = await supabase
        .from("audit_reports")
        .update(updateData)
        .eq("id", reportId);

      if (reportError) {
        console.error("Error updating report:", reportError);
        toast.error("Error updating report status");
        return;
      }

      toast.success(`Report ${action} successfully`);
      setSelectedShare(null);
      setResponseMessage("");
      fetchPendingApprovals();
    } catch (error) {
      console.error("Error in handleApproval:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsResponding(false);
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

  if (loading) {
    return (
      <div className="dashboard-container">
        <main className="main-content">
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Loading pending approvals...</div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <main className="main-content">
        <div className="header">
          <div className="flex items-center gap-4">
            <Button
              onClick={() => router.push("/dashboard")}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h2 className="header-title">Pending Approvals</h2>
              <p className="header-subtitle">
                Review and approve audit reports shared with you (
                {pendingShares.length} pending)
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          {pendingShares.length === 0 ? (
            <Card className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
              <CardContent className="p-8 text-center">
                <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No Pending Approvals
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  There are no reports waiting for your approval at the moment.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Pending Shares List */}
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Pending Reports ({pendingShares.length})
                </h3>
                <div className="space-y-3">
                  {pendingShares.map((share) => (
                    <Card
                      key={share.id}
                      className={`bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 cursor-pointer transition-all hover:border-cyan-500/50 dark:hover:border-cyan-400/50 ${
                        selectedShare?.id === share.id
                          ? "border-cyan-500/50 dark:border-cyan-400/50 bg-gray-50 dark:bg-gray-700/80"
                          : ""
                      }`}
                      onClick={() => setSelectedShare(share)}
                    >
                      <CardContent className="p-4">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-gray-900 dark:text-white font-medium mb-1">
                                {share.audit_reports?.title ||
                                  "Report Title Not Available"}
                              </h4>
                              <div className="flex items-center gap-2 text-sm text-gray-400">
                                <User className="w-3 h-3" />
                                <span>
                                  From:{" "}
                                  {share.shared_by_profile?.full_name ||
                                    share.shared_by_profile?.email ||
                                    "Unknown User"}
                                </span>
                              </div>
                            </div>
                            <Badge className="bg-yellow-600 text-white">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending
                            </Badge>
                          </div>
                          <p className="text-gray-400 text-sm line-clamp-2">
                            {share.audit_reports?.summary ||
                              "No summary available"}
                          </p>
                          {share.message && (
                            <div className="bg-gray-100 dark:bg-gray-900 p-2 rounded text-sm">
                              <p className="text-gray-700 dark:text-gray-300">
                                "{share.message}"
                              </p>
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            Shared on {formatDate(share.shared_at)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Report Review */}
              <div className="space-y-4">
                {selectedShare ? (
                  <Card className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                    <CardHeader>
                      <CardTitle className="text-gray-900 dark:text-white">
                        Review Report
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Report Details */}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-gray-900 dark:text-white font-medium mb-2">
                            Report Title
                          </h4>
                          <p className="text-gray-700 dark:text-gray-300">
                            {selectedShare.audit_reports?.title ||
                              "Report Title Not Available"}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-gray-900 dark:text-white font-medium mb-2">
                            Summary
                          </h4>
                          <p className="text-gray-700 dark:text-gray-300 text-sm">
                            {selectedShare.audit_reports?.summary ||
                              "No summary available"}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-gray-900 dark:text-white font-medium mb-2">
                            Audit Scope
                          </h4>
                          <p className="text-gray-700 dark:text-gray-300 text-sm">
                            {selectedShare.audit_reports?.audit_scope ||
                              "No audit scope available"}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-gray-900 dark:text-white font-medium mb-2">
                            Conclusion
                          </h4>
                          <p className="text-gray-700 dark:text-gray-300 text-sm">
                            {selectedShare.audit_reports?.conclusion ||
                              "No conclusion available"}
                          </p>
                        </div>
                        {selectedShare.audit_reports?.findings &&
                          Array.isArray(
                            selectedShare.audit_reports.findings
                          ) && (
                            <div>
                              <h4 className="text-gray-900 dark:text-white font-medium mb-2">
                                Findings (
                                {selectedShare.audit_reports.findings.length})
                              </h4>
                              <div className="space-y-2">
                                {selectedShare.audit_reports.findings.map(
                                  (finding, index) => {
                                    // Handle both object and string formats
                                    const isObject =
                                      typeof finding === "object" &&
                                      finding !== null;
                                    const findingTitle = isObject
                                      ? finding.title
                                      : null;
                                    const findingDescription = isObject
                                      ? finding.description
                                      : finding;
                                    const findingEvidence = isObject
                                      ? finding.evidence
                                      : null;
                                    const findingSeverity = isObject
                                      ? finding.severity
                                      : null;

                                    return (
                                      <div
                                        key={finding.id || index}
                                        className="bg-white dark:bg-gray-900 p-3 rounded border-l-4 border-red-500"
                                      >
                                        <div className="flex items-start gap-3">
                                          <div className="bg-red-500 text-white text-xs px-2 py-1 rounded font-medium">
                                            {index + 1}
                                          </div>
                                          <div className="flex-1">
                                            {findingTitle && (
                                              <h5 className="text-gray-900 dark:text-white font-medium text-sm mb-1">
                                                {findingTitle}
                                              </h5>
                                            )}
                                            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-2">
                                              {findingDescription}
                                            </p>
                                            {findingEvidence && (
                                              <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                                                <strong>Evidence:</strong>{" "}
                                                {findingEvidence}
                                              </div>
                                            )}
                                            {findingSeverity && (
                                              <div
                                                className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                                                  findingSeverity === "High"
                                                    ? "bg-red-600 text-white"
                                                    : findingSeverity ===
                                                      "Medium"
                                                    ? "bg-yellow-600 text-white"
                                                    : "bg-blue-600 text-white"
                                                }`}
                                              >
                                                {findingSeverity} Severity
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          )}
                        {selectedShare.audit_reports?.recommendations &&
                          Array.isArray(
                            selectedShare.audit_reports.recommendations
                          ) && (
                            <div>
                              <h4 className="text-gray-900 dark:text-white font-medium mb-2">
                                Recommendations (
                                {
                                  selectedShare.audit_reports.recommendations
                                    .length
                                }
                                )
                              </h4>
                              <div className="space-y-2">
                                {selectedShare.audit_reports.recommendations.map(
                                  (recommendation, index) => {
                                    // Handle both object and string formats
                                    const isObject =
                                      typeof recommendation === "object" &&
                                      recommendation !== null;
                                    const recommendationTitle = isObject
                                      ? recommendation.title
                                      : null;
                                    const recommendationDescription = isObject
                                      ? recommendation.description
                                      : recommendation;

                                    return (
                                      <div
                                        key={recommendation.id || index}
                                        className="bg-white dark:bg-gray-900 p-3 rounded border-l-4 border-green-500"
                                      >
                                        <div className="flex items-start gap-3">
                                          <div className="bg-green-500 text-white text-xs px-2 py-1 rounded font-medium">
                                            {index + 1}
                                          </div>
                                          <div className="flex-1">
                                            {recommendationTitle && (
                                              <h5 className="text-gray-900 dark:text-white font-medium text-sm mb-1">
                                                {recommendationTitle}
                                              </h5>
                                            )}
                                            <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                                              {recommendationDescription}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          )}
                        {selectedShare.message && (
                          <div>
                            <h4 className="text-gray-900 dark:text-white font-medium mb-2">
                              Message from Auditor
                            </h4>
                            <div className="bg-gray-100 dark:bg-gray-900 p-3 rounded">
                              <p className="text-gray-700 dark:text-gray-300 text-sm">
                                "{selectedShare.message}"
                              </p>
                            </div>
                          </div>
                        )}
                        <div>
                          <h4 className="text-gray-900 dark:text-white font-medium mb-2">
                            Shared By
                          </h4>
                          <p className="text-gray-700 dark:text-gray-300 text-sm">
                            {selectedShare.shared_by_profile?.full_name} (
                            {selectedShare.shared_by_profile?.email})
                          </p>
                          <p className="text-gray-600 dark:text-gray-400 text-xs">
                            on {formatDate(selectedShare.shared_at)}
                          </p>
                        </div>
                      </div>

                      {/* Response Section */}
                      <div className="space-y-4 border-t border-gray-300 dark:border-gray-600 pt-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-900 dark:text-white mb-2">
                            Response Message (optional)
                          </label>
                          <Textarea
                            placeholder="Add feedback or comments..."
                            value={responseMessage}
                            onChange={(e) => setResponseMessage(e.target.value)}
                            className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                            rows={3}
                          />
                        </div>

                        <div className="flex gap-2">
                          <Button
                            onClick={() =>
                              handleApproval(
                                selectedShare.id,
                                selectedShare.report_id,
                                "approved"
                              )
                            }
                            disabled={isResponding}
                            className="bg-green-600 hover:bg-green-700 text-white flex-1"
                          >
                            <Check className="w-4 h-4 mr-2" />
                            {isResponding ? "Processing..." : "Approve"}
                          </Button>
                          <Button
                            onClick={() =>
                              handleApproval(
                                selectedShare.id,
                                selectedShare.report_id,
                                "rejected"
                              )
                            }
                            disabled={isResponding}
                            className="bg-red-600 hover:bg-red-700 text-white flex-1"
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            {isResponding ? "Processing..." : "Reject"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600">
                    <CardContent className="p-8 text-center">
                      <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                        Select a Report
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Click on a report from the list to review and approve
                        it.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default ApprovalsPage;
