"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MdNotifications,
  MdVisibility,
  MdDownload,
  MdSearch,
  MdAnalytics,
  MdAssessment,
  MdWarning,
  MdInfo,
  MdCheckCircle,
  MdMarkAsUnread,
  MdDelete,
} from "react-icons/md";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Notifications() {
  const router = useRouter();
  const supabase = createClient();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  useEffect(() => {
    // Filter notifications based on search term
    if (searchTerm.trim() === "") {
      setFilteredNotifications(notifications);
    } else {
      const filtered = notifications.filter(
        (notification) =>
          notification.title
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          notification.message
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          notification.notification_type
            ?.toLowerCase()
            .includes(searchTerm.toLowerCase())
      );
      setFilteredNotifications(filtered);
    }
  }, [searchTerm, notifications]);

  const fetchNotifications = async () => {
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
        toast.error("Please log in to view notifications");
        router.push("/sign-in");
        return;
      }

      // Fetch notifications for the current user
      // Try the richer select first (includes related audit_analysis/audits)
      const { data: notificationsData, error: notificationsError } =
        await supabase
          .from("analysis_notifications")
          .select(
            `
            *,
            audit_analysis (
              analysis_type,
              results,
              created_at,
              audits (
                title,
                category,
                status
              )
            )
          `
          )
          .eq("user_id", user.id)
          .order("created_at", { ascending: false });

      if (notificationsError) {
        // Supabase sometimes returns an object that logs as {} — stringify to capture details
        try {
          console.error(
            "Error fetching notifications (rich select):",
            notificationsError,
            JSON.stringify(notificationsError)
          );
        } catch (e) {
          console.error(
            "Error fetching notifications (rich select):",
            notificationsError
          );
        }

        // Fallback: try a simple select without relations to determine if the join is the issue
        try {
          const { data: fallbackData, error: fallbackError } = await supabase
            .from("analysis_notifications")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

          if (fallbackError) {
            console.error(
              "Fallback error fetching notifications:",
              fallbackError,
              JSON.stringify(fallbackError)
            );
            toast.error(
              `Error fetching notifications: ${
                fallbackError?.message || JSON.stringify(fallbackError)
              }`
            );
            return;
          }

          setNotifications(fallbackData || []);
        } catch (fallbackCatch) {
          console.error(
            "Unexpected error during fallback fetchNotifications:",
            fallbackCatch
          );
          toast.error(
            "An unexpected error occurred while fetching notifications"
          );
        }

        return;
      }

      setNotifications(notificationsData || []);
    } catch (error) {
      console.error("Error in fetchNotifications:", error);
      toast.error("An error occurred while fetching notifications");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      setIsMarkingAsRead(true);
      const { error } = await supabase
        .from("analysis_notifications")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("id", notificationId);

      if (error) {
        console.error("Error marking notification as read:", error);
        toast.error("Error updating notification");
        return;
      }

      toast.success("Notification marked as read");
      await fetchNotifications();
    } catch (error) {
      console.error("Error in handleMarkAsRead:", error);
      toast.error("An error occurred while updating the notification");
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      setIsMarkingAsRead(true);
      const { error } = await supabase
        .from("analysis_notifications")
        .update({
          is_read: true,
          read_at: new Date().toISOString(),
        })
        .eq("user_id", (await supabase.auth.getUser()).data.user.id)
        .eq("is_read", false);

      if (error) {
        console.error("Error marking all notifications as read:", error);
        toast.error("Error updating notifications");
        return;
      }

      toast.success("All notifications marked as read");
      await fetchNotifications();
    } catch (error) {
      console.error("Error in handleMarkAllAsRead:", error);
      toast.error("An error occurred while updating notifications");
    } finally {
      setIsMarkingAsRead(false);
    }
  };

  const handleDeleteNotification = async (notificationId) => {
    if (!confirm("Are you sure you want to delete this notification?")) return;

    try {
      const { error } = await supabase
        .from("analysis_notifications")
        .delete()
        .eq("id", notificationId);

      if (error) {
        console.error("Error deleting notification:", error);
        toast.error("Error deleting notification");
        return;
      }

      toast.success("Notification deleted successfully");
      await fetchNotifications();
    } catch (error) {
      console.error("Error in handleDeleteNotification:", error);
      toast.error("An error occurred while deleting the notification");
    }
  };

  const handleViewAnalysis = (notification) => {
    setSelectedNotification(notification);
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case "analysis_shared":
        return <MdAnalytics className="w-5 h-5 text-blue-500" />;
      case "analysis_updated":
        return <MdAssessment className="w-5 h-5 text-green-500" />;
      case "analysis_comment":
        return <MdInfo className="w-5 h-5 text-purple-500" />;
      default:
        return <MdNotifications className="w-5 h-5 text-gray-500" />;
    }
  };

  const getAnalysisIcon = (type) => {
    switch (type) {
      case "summary":
        return <MdInfo className="w-4 h-4 text-blue-500" />;
      case "riskAssessment":
        return <MdWarning className="w-4 h-4 text-red-500" />;
      case "controlEffectiveness":
        return <MdAssessment className="w-4 h-4 text-green-500" />;
      case "complianceCheck":
        return <MdCheckCircle className="w-4 h-4 text-purple-500" />;
      case "recommendations":
        return <MdAnalytics className="w-4 h-4 text-orange-500" />;
      default:
        return <MdAnalytics className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Completed":
        return "bg-green-100 text-green-800";
      case "In Progress":
        return "bg-yellow-100 text-yellow-800";
      case "Not Started":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  if (loading) {
    // Skeleton loading UI: header, search, and several pulsing notification cards
    return (
      <div className="dashboard-container">
        <main className="main-content">
          <div className="dashboard-header mb-6">
            <div>
              <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse mb-2" />
              <div className="h-4 w-96 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
            </div>
            <div>
              <div className="h-8 w-36 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
            </div>
          </div>

          {/* Search skeleton */}
          <div className="mb-6">
            <div className="relative">
              <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-md pl-10 pr-4 animate-pulse" />
            </div>
          </div>

          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 transition-colors shadow-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3 flex-1">
                    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse mt-1" />
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-12 animate-pulse" />
                      </div>

                      <div className="space-y-2 mb-3">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-3/4 animate-pulse" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 animate-pulse" />
                      </div>

                      <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-3">
                        <div className="flex items-center space-x-2 mb-2">
                          <div className="w-4 h-4 rounded bg-gray-200 dark:bg-gray-700 animate-pulse" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse" />
                          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                        </div>
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 animate-pulse" />
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24 animate-pulse" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 animate-pulse" />
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-2 ml-4">
                    <div className="w-20 h-8 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
                    <div className="w-10 h-8 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
                    <div className="w-10 h-8 bg-gray-200 dark:bg-gray-700 rounded-md animate-pulse" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <main className="main-content">
        <div className="dashboard-header">
          <div>
            <h2 className="header-title">Notifications</h2>
            <p className="header-subtitle">
              View and manage your analysis notifications
            </p>
          </div>
          {unreadCount > 0 && (
            <Button
              onClick={handleMarkAllAsRead}
              disabled={isMarkingAsRead}
              className="bg-cyan-600 hover:bg-cyan-700 text-white"
            >
              <MdMarkAsUnread className="w-5 h-5 mr-2" />
              Mark All as Read
            </Button>
          )}
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <Input
              type="text"
              placeholder="Search notifications by title, message, or type..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-cyan-500 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <Card className="bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
            <CardContent className="text-center py-12">
              <MdNotifications className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                {searchTerm ? "No notifications found" : "No notifications"}
              </h3>
              <p className="text-gray-500 dark:text-gray-500 mb-4">
                {searchTerm
                  ? "Try adjusting your search terms"
                  : "You'll receive notifications when analyses are shared with you"}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredNotifications.map((notification) => (
              <Card
                key={notification.id}
                className={`bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors ${
                  !notification.is_read
                    ? "ring-2 ring-cyan-500 ring-opacity-50"
                    : ""
                }`}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3 flex-1">
                      {getNotificationIcon(notification.notification_type)}
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="text-gray-900 dark:text-white font-medium">
                            {notification.title}
                          </h3>
                          {!notification.is_read && (
                            <Badge className="bg-cyan-600 text-white text-xs">
                              New
                            </Badge>
                          )}
                        </div>

                        <p className="text-gray-700 dark:text-gray-300 text-sm mb-3">
                          {notification.message}
                        </p>

                        {notification.audit_analysis && (
                          <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg mb-3">
                            <div className="flex items-center space-x-2 mb-2">
                              {getAnalysisIcon(
                                notification.audit_analysis.analysis_type
                              )}
                              <span className="text-gray-900 dark:text-white font-medium">
                                {notification.audit_analysis.audits?.title ||
                                  "Unknown Audit"}
                              </span>
                              <Badge
                                className={getStatusColor(
                                  notification.audit_analysis.audits?.status
                                )}
                              >
                                {notification.audit_analysis.audits?.status ||
                                  "Unknown"}
                              </Badge>
                            </div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                              Analysis Type:{" "}
                              {notification.audit_analysis.analysis_type ||
                                "Unknown"}
                            </p>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">
                              Shared by: Unknown User
                            </p>
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500">
                          <span>
                            {new Date(notification.created_at).toLocaleString()}
                          </span>
                          <span>{notification.notification_type}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2 ml-4">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewAnalysis(notification)}
                        className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <MdVisibility className="w-4 h-4 mr-1" />
                        View
                      </Button>

                      {!notification.is_read && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleMarkAsRead(notification.id)}
                          disabled={isMarkingAsRead}
                          className="border-cyan-600 text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-900"
                        >
                          <MdMarkAsUnread className="w-4 h-4" />
                        </Button>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          handleDeleteNotification(notification.id)
                        }
                        className="border-red-600 text-red-600 hover:bg-red-50 dark:hover:bg-red-900"
                      >
                        <MdDelete className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Analysis Detail Modal */}
        {selectedNotification && (
          <Dialog
            open={!!selectedNotification}
            onOpenChange={() => setSelectedNotification(null)}
          >
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-gray-900 dark:text-white flex items-center space-x-2">
                  {getNotificationIcon(selectedNotification.notification_type)}
                  <span>{selectedNotification.title}</span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      Notification Type
                    </label>
                    <p className="text-gray-900 dark:text-white">
                      {selectedNotification.notification_type || "Unknown"}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-400">
                      Created
                    </label>
                    <p className="text-white">
                      {new Date(
                        selectedNotification.created_at
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-400">
                    Message
                  </label>
                  <p className="text-white mt-1">
                    {selectedNotification.message}
                  </p>
                </div>

                {selectedNotification.audit_analysis && (
                  <div>
                    <label className="text-sm font-medium text-gray-400">
                      Analysis Details
                    </label>
                    <div className="mt-2 p-4 bg-gray-900 rounded-lg">
                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          <label className="text-sm font-medium text-gray-400">
                            Audit Title
                          </label>
                          <p className="text-white">
                            {selectedNotification.audit_analysis.audits
                              ?.title || "Unknown"}
                          </p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-400">
                            Analysis Type
                          </label>
                          <p className="text-white">
                            {selectedNotification.audit_analysis
                              .analysis_type || "Unknown"}
                          </p>
                        </div>
                      </div>

                      {selectedNotification.audit_analysis.results && (
                        <div>
                          <label className="text-sm font-medium text-gray-400">
                            Analysis Results
                          </label>
                          <div className="mt-2 p-3 bg-gray-800 rounded">
                            <pre className="text-sm text-gray-300 whitespace-pre-wrap">
                              {JSON.stringify(
                                selectedNotification.audit_analysis.results,
                                null,
                                2
                              )}
                            </pre>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex space-x-2 pt-4">
                  <Button
                    onClick={() => setSelectedNotification(null)}
                    variant="outline"
                    className="border-gray-600 text-gray-300 hover:bg-gray-700"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </main>
    </div>
  );
}
