/* eslint-disable @next/next/no-img-element */
"use client";

import React from "react";
import { useRef, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { User } from "@/lib/auth/require-user";
import type { Profile } from "@/lib/db/profiles";

interface ProfileFormProps {
  user: User;
  profile: Profile | null;
  onSave?: (data: { display_name: string }) => Promise<void>;
}

interface ProfileFormData {
  display_name: string;
  avatar_url: string;
}

export function ProfileForm({ user, profile, onSave }: ProfileFormProps) {
  const [formData, setFormData] = useState<ProfileFormData>({
    display_name: profile?.display_name || user.name || "",
    avatar_url: profile?.avatar_url || user.avatar_url || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleInputChange = (field: keyof ProfileFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleAvatarSelect = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingAvatar(true);
    setErrors({});

    try {
      const uploadResponse = await fetch("/api/storage/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          purpose: "avatar",
        }),
      });

      if (!uploadResponse.ok) {
        const errorPayload = await uploadResponse.json().catch(() => ({}));
        throw new Error(errorPayload.error || "Failed to start upload.");
      }

      const { uploadUrl, fileId } = await uploadResponse.json();

      const putResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!putResponse.ok) {
        throw new Error("Failed to upload avatar. Please try again.");
      }

      const completeResponse = await fetch("/api/storage/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId, purpose: "avatar" }),
      });

      if (!completeResponse.ok) {
        const errorPayload = await completeResponse.json().catch(() => ({}));
        throw new Error(errorPayload.error || "Failed to finalize upload.");
      }

      const { avatarUrl } = await completeResponse.json();

      if (avatarUrl) {
        setFormData((prev) => ({
          ...prev,
          avatar_url: avatarUrl,
        }));
      }
    } catch (error) {
      setErrors({
        _root:
          error instanceof Error
            ? error.message
            : "Failed to upload avatar. Please try again.",
      });
    } finally {
      setIsUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});

    // Basic validation
    if (!formData.display_name.trim()) {
      setErrors({ display_name: "Display name is required" });
      setIsLoading(false);
      return;
    }

    try {
      if (onSave) {
        await onSave({
          display_name: formData.display_name.trim(),
        });
      }

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error("Profile update error:", error);
      setErrors({
        _root:
          error instanceof Error
            ? error.message
            : "Failed to update profile. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const displayName =
    formData.display_name || user.name || user.email || "User";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Profile Header */}
      <Card className="bg-surface border-border">
        <CardHeader>
          <CardTitle>Profile Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-6">
            <div className="flex flex-col items-center space-y-3">
              <div className="h-20 w-20 rounded-full bg-primary flex items-center justify-center">
                {formData.avatar_url ? (
                  <img
                    src={formData.avatar_url}
                    alt={displayName}
                    className="h-20 w-20 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-2xl font-medium text-primary-foreground">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAvatarSelect}
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? "Uploading..." : "Change Avatar"}
              </Button>
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <h3 className="text-lg font-semibold">{displayName}</h3>
                <p className="text-text-secondary">{user.email}</p>
              </div>

              <p className="text-sm text-text-secondary">
                Member since{" "}
                {user.created_at
                  ? new Date(user.created_at).toISOString().slice(0, 10)
                  : "N/A"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {errors._root && (
        <Card className="bg-surface border-border">
          <CardContent className="pt-6">
            <p className="text-destructive text-sm">{errors._root}</p>
          </CardContent>
        </Card>
      )}

      {/* Success Display */}
      {isSaved && (
        <Card className="bg-surface border-border">
          <CardContent className="pt-6">
            <p className="text-success text-sm">
              Profile updated successfully!
            </p>
          </CardContent>
        </Card>
      )}

      {/* Personal Information */}
      <Card className="bg-surface border-border">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name *</Label>
            <Input
              id="display_name"
              placeholder="Enter your display name"
              value={formData.display_name}
              onChange={(e) =>
                handleInputChange("display_name", e.target.value)
              }
              className={errors.display_name ? "border-destructive" : ""}
            />
            {errors.display_name && (
              <p className="text-destructive text-xs">{errors.display_name}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={user.email || ""}
              disabled
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-text-secondary">
              Email cannot be changed. Contact support if you need to update it.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex gap-3">
        <Button type="submit" variant="default" disabled={isLoading}>
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
