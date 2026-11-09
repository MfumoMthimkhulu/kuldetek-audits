"use client";
import { orionFetch } from "@/lib/orion-fetch";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MdPerson, MdShare } from "react-icons/md";
import { toast } from "sonner";
import { createClient } from "@/utils/supabase/client";

export default function ShareAnalysisModal({
  isOpen,
  onClose,
  analysis,
  currentUser,
  onShareSuccess,
}) {
  const supabase = createClient();
  const [users, setUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [permissionLevel, setPermissionLevel] = useState("view");
  const [shareExpiry, setShareExpiry] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadUsers();
    }
  }, [isOpen]);

  const loadUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .neq("id", currentUser?.id);

      if (error) throw error;
      setUsers(profiles || []);
    } catch (error) {
      console.error("Error loading users:", error);
      toast.error("Failed to load users");
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const handleUserSelection = (userId, checked) => {
    if (checked) {
      setSelectedUsers([...selectedUsers, userId]);
    } else {
      setSelectedUsers(selectedUsers.filter((id) => id !== userId));
    }
  };

  const shareAnalysis = async () => {
    if (selectedUsers.length === 0) {
      toast.error("Please select at least one user to share with");
      return;
    }

    setIsSharing(true);
    try {
      // Create shares for selected users
      const shares = selectedUsers.map((userId) => ({
        analysis_id: analysis.id,
        shared_with_user_id: userId,
        shared_by_user_id: currentUser.id,
        permission_level: permissionLevel,
        expires_at: shareExpiry ? new Date(shareExpiry).toISOString() : null,
      }));

      const { error: shareError } = await supabase
        .from("analysis_shares")
        .insert(shares);

      if (shareError) throw shareError;

      // Create notifications
      const notificationPromises = selectedUsers.map(async (userId) => {
        try {
          await orionFetch("/api/notifications", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId,
              type: "analysis_shared",
              title: "Analysis Shared",
              message: `${
                currentUser?.user_metadata?.full_name || currentUser?.email
              } shared a ${analysis.analysis_type} analysis with you.`,
              data: {
                auditId: analysis.audit_id,
                analysisType: analysis.analysis_type,
                analysisId: analysis.id,
                sharedBy: currentUser.id,
              },
            }),
          });
        } catch (error) {
          console.error("Error creating notification:", error);
        }
      });

      await Promise.all(notificationPromises);

      toast.success(`Analysis shared with ${selectedUsers.length} user(s)`);
      onShareSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error sharing analysis:", error);
      toast.error("Failed to share analysis");
    } finally {
      setIsSharing(false);
    }
  };

  const handleClose = () => {
    setSelectedUsers([]);
    setPermissionLevel("view");
    setShareExpiry("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-[#1e293b] border-[#334155] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Share Analysis</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-gray-300">Select Users</Label>
            {isLoadingUsers ? (
              <div className="text-center py-4">
                <p className="text-gray-300">Loading users...</p>
              </div>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-2 mt-2">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={user.id}
                      checked={selectedUsers.includes(user.id)}
                      onCheckedChange={(checked) =>
                        handleUserSelection(user.id, checked)
                      }
                    />
                    <Label
                      htmlFor={user.id}
                      className="text-white flex items-center space-x-2"
                    >
                      <MdPerson className="w-4 h-4" />
                      <span>{user.full_name || user.email}</span>
                    </Label>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <Label className="text-gray-300">Permission Level</Label>
            <Select value={permissionLevel} onValueChange={setPermissionLevel}>
              <SelectTrigger className="bg-[#0f172a] border-[#334155] text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1e293b] border-[#334155]">
                <SelectItem
                  value="view"
                  className="text-white hover:bg-[#334155]"
                >
                  View Only
                </SelectItem>
                <SelectItem
                  value="edit"
                  className="text-white hover:bg-[#334155]"
                >
                  Edit
                </SelectItem>
                <SelectItem
                  value="comment"
                  className="text-white hover:bg-[#334155]"
                >
                  Comment
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-gray-300">Expiry Date (Optional)</Label>
            <Input
              type="datetime-local"
              value={shareExpiry}
              onChange={(e) => setShareExpiry(e.target.value)}
              className="bg-[#0f172a] border-[#334155] text-white"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button
              onClick={shareAnalysis}
              disabled={isSharing || selectedUsers.length === 0}
              className="bg-purple-600 hover:bg-purple-700 text-white flex-1"
            >
              <MdShare className="w-4 h-4 mr-2" />
              {isSharing ? "Sharing..." : "Share"}
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
              className="border-[#334155] text-gray-300 hover:bg-[#334155]"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


