"use client";

import { orionFetch } from "@/lib/orion-fetch";
import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MdShare, MdClose, MdSearch, MdPerson } from "react-icons/md";

export default function AnalysisSharingModal({
  analysis,
  isOpen,
  onClose,
  onShare,
}) {
  const supabase = createClient();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [message, setMessage] = useState("");
  const [isSharing, setIsSharing] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchUsers();
    }
  }, [isOpen]);

  useEffect(() => {
    // Filter users based on search term
    if (searchTerm.trim() === "") {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(
        (user) =>
          user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [searchTerm, users]);

  const fetchUsers = async () => {
    try {
      setLoading(true);

      // Fetch users from API endpoint
      const response = await orionFetch("/api/users");

      if (!response.ok) {
        throw new Error("Failed to fetch users");
      }

      const { users } = await response.json();
      setUsers(users || []);
    } catch (error) {
      console.error("Error in fetchUsers:", error);
      toast.error("An error occurred while fetching users");
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (user) => {
    if (selectedUsers.find((u) => u.id === user.id)) {
      // Remove user if already selected
      setSelectedUsers(selectedUsers.filter((u) => u.id !== user.id));
    } else {
      // Add user if not selected
      setSelectedUsers([...selectedUsers, user]);
    }
  };

  const handleShare = async () => {
    if (!analysis) {
      toast.error("No analysis to share");
      return;
    }

    if (selectedUsers.length === 0) {
      toast.error("Please select at least one user to share with");
      return;
    }

    try {
      setIsSharing(true);

      // Get current user
      const {
        data: { user: currentUser },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("Error getting current user:", userError);
        toast.error("Error getting user information");
        return;
      }

      // Create sharing records
      const sharingPromises = selectedUsers.map((user) =>
        supabase.from("shared_analyses").insert({
          analysis_id: analysis.id,
          shared_by: currentUser.id,
          shared_with: user.id,
          message: message.trim() || null,
        })
      );

      const results = await Promise.all(sharingPromises);

      // Check for errors
      const errors = results.filter((result) => result.error);
      if (errors.length > 0) {
        console.error("Error sharing analysis:", errors);
        toast.error("Error sharing analysis with some users");
        return;
      }

      toast.success(
        `Analysis shared with ${selectedUsers.length} user(s) successfully`
      );

      // Reset form
      setSelectedUsers([]);
      setMessage("");
      setSearchTerm("");

      // Call onShare callback if provided
      if (onShare) {
        onShare();
      }

      onClose();
    } catch (error) {
      console.error("Error in handleShare:", error);
      toast.error("An error occurred while sharing the analysis");
    } finally {
      setIsSharing(false);
    }
  };

  const handleClose = () => {
    setSelectedUsers([]);
    setMessage("");
    setSearchTerm("");
    onClose();
  };

  if (!analysis) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-gray-800 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center space-x-2">
              <MdShare className="w-5 h-5" />
              <span>Share Analysis</span>
            </DialogTitle>
          </DialogHeader>
          <div className="p-8 text-center">
            <p className="text-gray-400">No analysis available to share</p>
            <Button
              onClick={handleClose}
              className="mt-4 bg-gray-600 hover:bg-gray-700 text-white"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-gray-800 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center space-x-2">
            <MdShare className="w-5 h-5" />
            <span>Share Analysis</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Analysis Info */}
          {analysis && (
            <div className="bg-gray-700 p-4 rounded-lg">
              <h3 className="text-white font-medium mb-2">
                {analysis.audit_title || "Untitled Analysis"}
              </h3>
              <p className="text-gray-300 text-sm">
                Type: {analysis.analysis_type || "Unknown"}
              </p>
              {analysis.summary && (
                <p className="text-gray-400 text-sm mt-2">{analysis.summary}</p>
              )}
            </div>
          )}

          {/* Message */}
          <div>
            <Label htmlFor="message" className="text-gray-300">
              Message (Optional)
            </Label>
            <Textarea
              id="message"
              placeholder="Add a message to accompany the shared analysis..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-cyan-500"
              rows={3}
            />
          </div>

          {/* User Search */}
          <div>
            <Label className="text-gray-300">Select Users to Share With</Label>
            <div className="relative mt-2">
              <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-500 focus:ring-cyan-500"
              />
            </div>
          </div>

          {/* Selected Users */}
          {selectedUsers.length > 0 && (
            <div>
              <Label className="text-gray-300">
                Selected Users ({selectedUsers.length})
              </Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {selectedUsers.map((user) => (
                  <Badge
                    key={user.id}
                    variant="secondary"
                    className="bg-cyan-600 text-white px-3 py-1"
                  >
                    <MdPerson className="w-3 h-3 mr-1" />
                    {user.full_name || user.email}
                    <button
                      onClick={() => handleUserSelect(user)}
                      className="ml-2 hover:text-gray-300"
                    >
                      <MdClose className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* User List */}
          <div>
            <Label className="text-gray-300">Available Users</Label>
            <div className="mt-2 max-h-48 overflow-y-auto border border-gray-600 rounded-lg">
              {loading ? (
                <div className="p-4 text-center text-gray-400">
                  Loading users...
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="p-4 text-center text-gray-400">
                  {searchTerm
                    ? "No users found matching your search"
                    : "No users available"}
                </div>
              ) : (
                <div className="divide-y divide-gray-600">
                  {filteredUsers.map((user) => {
                    const isSelected = selectedUsers.find(
                      (u) => u.id === user.id
                    );
                    return (
                      <div
                        key={user.id}
                        onClick={() => handleUserSelect(user)}
                        className={`p-3 cursor-pointer hover:bg-gray-700 transition-colors ${
                          isSelected ? "bg-cyan-900 bg-opacity-50" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-white font-medium">
                              {user.full_name || "Unknown User"}
                            </p>
                            <p className="text-gray-400 text-sm">
                              {user.email}
                            </p>
                            {user.role && (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {user.role}
                              </Badge>
                            )}
                          </div>
                          {isSelected && (
                            <div className="text-cyan-400">
                              <MdClose className="w-4 h-4" />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              onClick={handleClose}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              onClick={handleShare}
              disabled={isSharing || selectedUsers.length === 0}
              className="bg-cyan-600 hover:bg-cyan-700 text-white disabled:opacity-50"
            >
              {isSharing
                ? "Sharing..."
                : `Share with ${selectedUsers.length} user(s)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
