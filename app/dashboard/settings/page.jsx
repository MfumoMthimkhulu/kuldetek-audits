"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  FaUserShield,
  FaChevronDown,
  FaSignOutAlt,
  FaCog,
  FaBell,
  FaShieldAlt,
  FaUsers,
  FaDatabase,
  FaNetworkWired,
  FaKey,
  FaEye,
  FaEyeSlash,
  FaSave,
  FaTrash,
  FaPlus,
  FaEdit,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
} from "react-icons/fa";
import {
  MdSecurity,
  MdNotifications,
  MdAccountCircle,
  MdAdminPanelSettings,
} from "react-icons/md";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import "../../Dashboard.css";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState("profile");
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState({ type: "", text: "" });
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    getCurrentUser();
  }, []);

  const getCurrentUser = async () => {
    setIsLoading(true);
    try {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();
      if (error) throw error;

      if (user) {
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError) throw profileError;

        setCurrentUser({ ...user, profile });
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error("Error fetching current user:", error);
      setMessage({ type: "error", text: "Failed to load user data." });
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage({ type: "", text: "" }), 5000);
  };

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <main className="main-content">
          <div className="loading">Loading...</div>
        </main>
      </div>
    );
  }

  if (!currentUser) {
    return null;
  }

  console.log("Current User:", currentUser);

  return (
    <div className="dashboard-container">
      <main className="main-content">
        <div className="dashboard-header">
          <div>
            <h2 className="header-title">Settings</h2>
            <p className="header-subtitle">
              Manage your account and system preferences
            </p>
          </div>
          <UserDropdown
            onSignOut={() => router.push("/sign-in")}
            user={currentUser}
          />
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>{message.text}</div>
        )}

        <div className="settings-container">
          {/* Settings Tabs */}
          <div className="settings-tabs">
            {[
              { id: "profile", label: "Profile", icon: <MdAccountCircle /> },
              { id: "security", label: "Security", icon: <MdSecurity /> },
              {
                id: "notifications",
                label: "Notifications",
                icon: <MdNotifications />,
              },
              ...(currentUser.profile?.role === "admin"
                ? [
                    {
                      id: "admin",
                      label: "Admin Panel",
                      icon: <MdAdminPanelSettings />,
                    },
                  ]
                : []),
            ].map((tab) => (
              <button
                key={tab.id}
                className={`settings-tab ${
                  activeTab === tab.id ? "active" : ""
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="tab-icon">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="settings-content">
            {activeTab === "profile" && (
              <ProfileTab
                user={currentUser}
                onUpdate={getCurrentUser}
                showMessage={showMessage}
              />
            )}
            {activeTab === "security" && (
              <SecurityTab user={currentUser} showMessage={showMessage} />
            )}
            {activeTab === "notifications" && (
              <NotificationsTab user={currentUser} showMessage={showMessage} />
            )}
            {activeTab === "admin" && currentUser.profile?.role === "admin" && (
              <AdminTab showMessage={showMessage} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function ProfileTab({ user, onUpdate, showMessage }) {
  const [formData, setFormData] = useState({
    full_name: user.profile?.full_name || "",
    email: user.email || "",
    country: user.profile?.country || "",
    phone: user.profile?.phone || "",
    cert_url: user.profile?.cert_url || "",
    is_certified: user.profile?.is_certified || false,
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const supabase = createClient();

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
  };

  const saveProfile = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        full_name: formData.full_name,
        country: formData.country,
        phone: formData.phone,
        cert_url: formData.cert_url,
        is_certified: formData.is_certified,
        updated_at: new Date().toISOString().split("T")[0], // Convert to date format
      });

      if (error) throw error;

      showMessage("success", "Profile updated successfully!");
      onUpdate();
    } catch (error) {
      console.error("Error updating profile:", error);
      showMessage("error", "Failed to update profile. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const changePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showMessage("error", "New passwords do not match.");
      return;
    }

    if (passwordData.newPassword.length < 6) {
      showMessage("error", "Password must be at least 6 characters long.");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      showMessage("success", "Password changed successfully!");
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error) {
      console.error("Error changing password:", error);
      showMessage("error", "Failed to change password. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-section">
      <div className="card">
        <div className="card-header">
          <h3 className="card-header-title">Personal Information</h3>
          <Button onClick={saveProfile} disabled={isSaving}>
            {isSaving ? (
              "Saving..."
            ) : (
              <>
                <FaSave /> Save Changes
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Full Name</label>
            <Input
              name="full_name"
              value={formData.full_name}
              onChange={handleInputChange}
              placeholder="Enter your full name"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Email Address</label>
            <Input
              type="email"
              name="email"
              value={formData.email}
              disabled
              className="bg-zinc-800/50"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Country</label>
            <Input
              name="country"
              value={formData.country}
              onChange={handleInputChange}
              placeholder="Enter your country"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Phone Number</label>
            <Input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="Enter your phone number"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Certification URL</label>
            <Input
              type="url"
              name="cert_url"
              value={formData.cert_url}
              onChange={handleInputChange}
              placeholder="https://example.com/cert"
            />
          </div>

          <div className="space-y-2 md:col-span-2">
            <label className="flex items-center space-x-2">
              <Checkbox
                name="is_certified"
                checked={formData.is_certified}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, is_certified: checked })
                }
              />
              <span className="text-sm font-medium">Certified</span>
            </label>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-header-title">Change Password</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">New Password</label>
            <div className="relative">
              <Input
                type={showNewPassword ? "text" : "password"}
                name="newPassword"
                value={passwordData.newPassword}
                onChange={handlePasswordChange}
                placeholder="Enter new password"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                onClick={() => setShowNewPassword(!showNewPassword)}
              >
                {showNewPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm New Password</label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                name="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={handlePasswordChange}
                placeholder="Confirm new password"
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              >
                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <Button
            onClick={changePassword}
            disabled={
              isSaving ||
              !passwordData.newPassword ||
              !passwordData.confirmPassword
            }
          >
            {isSaving ? (
              "Changing..."
            ) : (
              <>
                <FaKey /> Change Password
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function SecurityTab({ user, showMessage }) {
  const [securitySettings, setSecuritySettings] = useState({
    twoFactor: user.profile?.two_factor_enabled || false,
    sessionTimeout: user.profile?.session_timeout || 30,
    passwordExpiry: user.profile?.password_expiry_days || 90,
    failedAttempts: user.profile?.failed_attempts_limit || 5,
    ipWhitelist: user.profile?.ip_whitelist_enabled || false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  const handleToggle = (setting) => {
    setSecuritySettings({
      ...securitySettings,
      [setting]: !securitySettings[setting],
    });
  };

  const handleNumberChange = (setting, value) => {
    setSecuritySettings({
      ...securitySettings,
      [setting]: parseInt(value),
    });
  };

  const saveSecuritySettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          two_factor_enabled: securitySettings.twoFactor,
          session_timeout: securitySettings.sessionTimeout,
          password_expiry_days: securitySettings.passwordExpiry,
          failed_attempts_limit: securitySettings.failedAttempts,
          ip_whitelist_enabled: securitySettings.ipWhitelist,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      showMessage("success", "Security settings updated successfully!");
    } catch (error) {
      console.error("Error updating security settings:", error);
      showMessage(
        "error",
        "Failed to update security settings. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-section">
      <div className="card">
        <div className="card-header">
          <h3 className="card-header-title">Two-Factor Authentication</h3>
          <Button onClick={saveSecuritySettings} disabled={isSaving}>
            {isSaving ? (
              "Saving..."
            ) : (
              <>
                <FaSave /> Save Settings
              </>
            )}
          </Button>
        </div>

        <div className="security-item">
          <div className="security-info">
            <FaShieldAlt className="security-icon" />
            <div>
              <h4>Enable 2FA</h4>
              <p>Add an extra layer of security to your account</p>
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={securitySettings.twoFactor}
              onChange={() => handleToggle("twoFactor")}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-header-title">Session Management</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Session Timeout (minutes)
            </label>
            <Input
              type="number"
              value={securitySettings.sessionTimeout}
              onChange={(e) =>
                handleNumberChange("sessionTimeout", e.target.value)
              }
              min="5"
              max="480"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Password Expiry (days)
            </label>
            <Input
              type="number"
              value={securitySettings.passwordExpiry}
              onChange={(e) =>
                handleNumberChange("passwordExpiry", e.target.value)
              }
              min="30"
              max="365"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Failed Login Attempts</label>
            <Input
              type="number"
              value={securitySettings.failedAttempts}
              onChange={(e) =>
                handleNumberChange("failedAttempts", e.target.value)
              }
              min="3"
              max="10"
            />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-header-title">Access Control</h3>
        </div>

        <div className="security-item">
          <div className="security-info">
            <FaNetworkWired className="security-icon" />
            <div>
              <h4>IP Whitelist</h4>
              <p>Restrict access to specific IP addresses</p>
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={securitySettings.ipWhitelist}
              onChange={() => handleToggle("ipWhitelist")}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
}

function NotificationsTab({ user, showMessage }) {
  const [notificationSettings, setNotificationSettings] = useState({
    email: user.profile?.notifications_email || true,
    sms: user.profile?.notifications_sms || false,
    push: user.profile?.notifications_push || true,
    security: user.profile?.notifications_security || true,
    audit: user.profile?.notifications_audit || true,
    compliance: user.profile?.notifications_compliance || false,
  });
  const [isSaving, setIsSaving] = useState(false);
  const supabase = createClient();

  const handleToggle = (setting) => {
    setNotificationSettings({
      ...notificationSettings,
      [setting]: !notificationSettings[setting],
    });
  };

  const saveNotificationSettings = async () => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          notifications_email: notificationSettings.email,
          notifications_sms: notificationSettings.sms,
          notifications_push: notificationSettings.push,
          notifications_security: notificationSettings.security,
          notifications_audit: notificationSettings.audit,
          notifications_compliance: notificationSettings.compliance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      showMessage("success", "Notification settings updated successfully!");
    } catch (error) {
      console.error("Error updating notification settings:", error);
      showMessage(
        "error",
        "Failed to update notification settings. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="settings-section">
      <div className="card">
        <div className="card-header">
          <h3 className="card-header-title">Notification Channels</h3>
          <Button onClick={saveNotificationSettings} disabled={isSaving}>
            {isSaving ? (
              "Saving..."
            ) : (
              <>
                <FaSave /> Save Settings
              </>
            )}
          </Button>
        </div>

        <div className="notification-item">
          <div className="notification-info">
            <FaBell className="notification-icon" />
            <div>
              <h4>Email Notifications</h4>
              <p>Receive notifications via email</p>
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notificationSettings.email}
              onChange={() => handleToggle("email")}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="notification-item">
          <div className="notification-info">
            <FaBell className="notification-icon" />
            <div>
              <h4>SMS Notifications</h4>
              <p>Receive notifications via SMS</p>
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notificationSettings.sms}
              onChange={() => handleToggle("sms")}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="notification-item">
          <div className="notification-info">
            <FaBell className="notification-icon" />
            <div>
              <h4>Push Notifications</h4>
              <p>Receive notifications in browser</p>
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notificationSettings.push}
              onChange={() => handleToggle("push")}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-header-title">Notification Types</h3>
        </div>

        <div className="notification-item">
          <div className="notification-info">
            <FaExclamationTriangle className="notification-icon" />
            <div>
              <h4>Security Alerts</h4>
              <p>Critical security events and threats</p>
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notificationSettings.security}
              onChange={() => handleToggle("security")}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="notification-item">
          <div className="notification-info">
            <FaCog className="notification-icon" />
            <div>
              <h4>Audit Reports</h4>
              <p>Completed audit reports and summaries</p>
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notificationSettings.audit}
              onChange={() => handleToggle("audit")}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="notification-item">
          <div className="notification-info">
            <FaShieldAlt className="notification-icon" />
            <div>
              <h4>Compliance Updates</h4>
              <p>Compliance status changes and requirements</p>
            </div>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={notificationSettings.compliance}
              onChange={() => handleToggle("compliance")}
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>
    </div>
  );
}

function AdminTab({ showMessage }) {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    full_name: "",
    country: "",
    phone: "",
    cert_url: "",
    is_certified: false,
    role: "auditor",
  });
  const supabase = createClient();

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error loading users:", error);
      showMessage("error", "Failed to load users.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async () => {
    try {
      // Validate required fields
      if (!newUser.email || !newUser.password || !newUser.full_name) {
        showMessage("error", "Please fill in all required fields.");
        return;
      }

      // For client-side, we'll use the regular signup method
      // Note: Admin user creation requires server-side implementation
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: newUser.email,
        password: newUser.password,
        options: {
          data: {
            full_name: newUser.full_name,
            role: newUser.role,
          },
        },
      });

      if (authError) {
        console.error("Auth error:", authError);
        if (authError.message.includes("already registered")) {
          showMessage("error", "User with this email already exists.");
        } else {
          showMessage("error", authError.message || "Failed to create user.");
        }
        return;
      }

      const confirmUser = authData?.user?.id;
      // Create profile manually since signup might not create it
      if (confirmUser) {
        await new Promise((resolve) => setTimeout(resolve, 1000));

        const { error: profileError } = await supabase.from("profiles").insert({
          id: authData.user.id,
          email: newUser.email,
          full_name: newUser.full_name,
          country: newUser.country || "",
          phone: newUser.phone || "",
          cert_url: newUser.cert_url || "",
          is_certified: newUser.is_certified,
          role: newUser.role,
        });

        if (profileError) {
          console.warn("Profile creation error:", profileError);
          showMessage("error", "User created, but profile failed to save.");
        } else {
          showMessage("success", "User created successfully!");
        }
      }

      showMessage("success", "User created successfully!");
      setShowAddUser(false);
      setNewUser({
        email: "",
        password: "",
        full_name: "",
        country: "",
        phone: "",
        cert_url: "",
        is_certified: false,
        role: "auditor",
      });
      loadUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      showMessage("error", "Failed to create user. Please try again.");
    }
  };

  const handleEditUser = (user) => {
    setEditingUser({
      ...user,
      full_name: user.full_name || "",
      country: user.country || "",
      phone: user.phone || "",
      cert_url: user.cert_url || "",
      is_certified: user.is_certified || false,
      role: user.role || "user",
    });
  };

  const handleSaveUser = async (user) => {
    try {
      // Validate required fields
      if (!user.full_name || !user.role) {
        showMessage("error", "Full name and role are required.");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: user.full_name,
          country: user.country || "",
          phone: user.phone || "",
          cert_url: user.cert_url || "",
          is_certified: user.is_certified,
          role: user.role,
          updated_at: new Date().toISOString().split("T")[0], // Convert to date format
        })
        .eq("id", user.id);

      if (error) {
        console.error("Update error:", error);
        showMessage("error", error.message || "Failed to update user.");
        return;
      }

      showMessage("success", "User updated successfully!");
      setEditingUser(null);
      loadUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      showMessage("error", "Failed to update user. Please try again.");
    }
  };

  const handleDeleteUser = async (userId) => {
    if (
      !confirm(
        "Are you sure you want to delete this user? This action cannot be undone."
      )
    )
      return;

    try {
      // First delete the profile
      const { error: profileError } = await supabase
        .from("profiles")
        .delete()
        .eq("id", userId);

      if (profileError) {
        console.error("Delete error:", profileError);
        showMessage(
          "error",
          profileError.message || "Failed to delete user profile."
        );
        return;
      }

      // Note: User deletion from auth requires admin privileges
      // For now, we'll just delete the profile
      showMessage("success", "User profile deleted successfully!");
      loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      showMessage("error", "Failed to delete user. Please try again.");
    }
  };

  if (isLoading) {
    return <div className="loading">Loading users...</div>;
  }

  return (
    <div className="settings-section">
      <div className="card">
        <div className="card-header">
          <h3 className="card-header-title">User Management</h3>
          <Button onClick={() => setShowAddUser(true)}>
            <FaPlus /> Add User
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-zinc-700">
                <th className="text-left p-3 text-sm font-medium text-zinc-400">
                  Name
                </th>
                <th className="text-left p-3 text-sm font-medium text-zinc-400">
                  Email
                </th>
                <th className="text-left p-3 text-sm font-medium text-zinc-400">
                  Role
                </th>
                <th className="text-left p-3 text-sm font-medium text-zinc-400">
                  Country
                </th>
                <th className="text-left p-3 text-sm font-medium text-zinc-400">
                  Phone
                </th>
                <th className="text-left p-3 text-sm font-medium text-zinc-400">
                  Certified
                </th>
                <th className="text-left p-3 text-sm font-medium text-zinc-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-zinc-800 hover:bg-zinc-900/50"
                >
                  <td className="p-3">
                    {editingUser?.id === user.id ? (
                      <Input
                        value={editingUser.full_name}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            full_name: e.target.value,
                          })
                        }
                        placeholder="Full name"
                        className="w-full"
                      />
                    ) : (
                      <span className="text-zinc-200">
                        {user.full_name || "N/A"}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <span className="text-zinc-200">{user.email || "N/A"}</span>
                  </td>
                  <td className="p-3">
                    {editingUser?.id === user.id ? (
                      <Select
                        value={editingUser.role}
                        onValueChange={(value) =>
                          setEditingUser({
                            ...editingUser,
                            role: value,
                          })
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="auditor">Auditor</SelectItem>
                          <SelectItem value="auditee">Auditee</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.role === "admin"
                            ? "bg-red-100 text-red-800"
                            : user.role === "security_analyst"
                            ? "bg-blue-100 text-blue-800"
                            : user.role === "auditor"
                            ? "bg-purple-100 text-purple-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {user.role?.replace("_", " ") || "User"}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {editingUser?.id === user.id ? (
                      <Input
                        value={editingUser.country}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            country: e.target.value,
                          })
                        }
                        placeholder="Country"
                        className="w-full"
                      />
                    ) : (
                      <span className="text-zinc-200">
                        {user.country || "N/A"}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {editingUser?.id === user.id ? (
                      <Input
                        value={editingUser.phone}
                        onChange={(e) =>
                          setEditingUser({
                            ...editingUser,
                            phone: e.target.value,
                          })
                        }
                        placeholder="Phone"
                        className="w-full"
                      />
                    ) : (
                      <span className="text-zinc-200">
                        {user.phone || "N/A"}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    {editingUser?.id === user.id ? (
                      <Checkbox
                        checked={editingUser.is_certified}
                        onCheckedChange={(checked) =>
                          setEditingUser({
                            ...editingUser,
                            is_certified: checked,
                          })
                        }
                      />
                    ) : (
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.is_certified
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {user.is_certified ? "Yes" : "No"}
                      </span>
                    )}
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2">
                      {editingUser?.id === user.id ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSaveUser(editingUser)}
                            title="Save"
                          >
                            <FaCheck />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingUser(null)}
                            title="Cancel"
                          >
                            <FaTimes />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditUser(user)}
                            title="Edit"
                          >
                            <FaEdit />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteUser(user.id)}
                            title="Delete"
                          >
                            <FaTrash />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAddUser && (
        <div className="card">
          <div className="card-header">
            <h3 className="card-header-title">Add New User</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={newUser.email}
                onChange={(e) =>
                  setNewUser({ ...newUser, email: e.target.value })
                }
                placeholder="user@example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                value={newUser.password}
                onChange={(e) =>
                  setNewUser({ ...newUser, password: e.target.value })
                }
                placeholder="Enter password"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                type="text"
                value={newUser.full_name}
                onChange={(e) =>
                  setNewUser({ ...newUser, full_name: e.target.value })
                }
                placeholder="Full name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Select
                value={newUser.role}
                onValueChange={(value) =>
                  setNewUser({ ...newUser, role: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="auditor">Auditor</SelectItem>
                  <SelectItem value="auditee">Auditee</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Country</label>
              <Input
                type="text"
                value={newUser.country}
                onChange={(e) =>
                  setNewUser({ ...newUser, country: e.target.value })
                }
                placeholder="Country"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Phone</label>
              <Input
                type="text"
                value={newUser.phone}
                onChange={(e) =>
                  setNewUser({ ...newUser, phone: e.target.value })
                }
                placeholder="Phone number"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Certification URL</label>
              <Input
                type="url"
                value={newUser.cert_url}
                onChange={(e) =>
                  setNewUser({ ...newUser, cert_url: e.target.value })
                }
                placeholder="https://example.com/cert"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <label className="flex items-center space-x-2">
                <Checkbox
                  checked={newUser.is_certified}
                  onCheckedChange={(checked) =>
                    setNewUser({ ...newUser, is_certified: checked })
                  }
                />
                <span className="text-sm font-medium">Certified</span>
              </label>
            </div>
          </div>

          <div className="flex gap-4 mt-6">
            <Button
              onClick={handleAddUser}
              disabled={
                !newUser.email || !newUser.password || !newUser.full_name
              }
            >
              <FaPlus /> Create User
            </Button>
            <Button variant="outline" onClick={() => setShowAddUser(false)}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function UserDropdown({ onSignOut, user }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    onSignOut();
  };

  return (
    <div className="header-user" ref={dropdownRef}>
      <button
        className="user-toggle"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="user-icon">
          <FaUserShield />
        </span>
        <span>
          {user?.profile?.full_name || user?.email?.split("@")[0]}
          <FaChevronDown className={`chevron ${isOpen ? "rotate-180" : ""}`} />
        </span>
      </button>

      {isOpen && (
        <div className="user-dropdown">
          <div className="user-info">
            <div className="user-name">
              {user?.profile?.full_name || user?.email?.split("@")[0]}
            </div>
            <div className="user-email">{user?.email}</div>
          </div>
          <div className="dropdown-divider"></div>
          <button className="dropdown-item">
            <FaCog className="item-icon" />
            <span>Settings</span>
          </button>
          <button className="dropdown-item" onClick={handleSignOut}>
            <FaSignOutAlt className="item-icon" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  );
}
