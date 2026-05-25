"use client";

import { useState, useTransition } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
  ModalDescription,
  ModalFooter,
  ModalClose,
} from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { updateUser } from "../actions";
import { useRouter } from "next/navigation";

type EditUserModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "user";
  };
};

export function EditUserModal({
  open,
  onOpenChange,
  user,
}: EditUserModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    name: user.name,
    email: user.email,
    isAdmin: user.role === "admin",
  });
  const [error, setError] = useState<string | null>(null);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = formData.name.trim();
    const email = formData.email.trim();

    if (!name) {
      setError("Name is required.");
      return;
    }

    if (!email) {
      setError("Email is required.");
      return;
    }

    if (!emailPattern.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    startTransition(async () => {
      const result = await updateUser({
        userId: user.id,
        name,
        email,
        isAdmin: formData.isAdmin,
      });

      if (result.success) {
        onOpenChange(false);
        router.refresh();
      } else {
        setError(result.error || "Failed to update user");
      }
    });
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <ModalTitle>Edit User</ModalTitle>
          <ModalDescription>
            Update user information and permissions
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter user name"
                disabled={isPending}
              />
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter email address"
                disabled={isPending}
              />
            </div>

            {/* Admin Toggle */}
            <div className="flex items-center justify-between space-x-2 rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="admin-toggle" className="text-base">
                  Admin Access
                </Label>
                <div className="text-sm text-text-secondary">
                  Grant or revoke administrative privileges
                </div>
              </div>
              <Switch
                id="admin-toggle"
                checked={formData.isAdmin}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isAdmin: checked })
                }
                disabled={isPending}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="rounded-lg bg-danger/10 border border-danger/20 p-3">
                <p className="text-sm text-danger">{error}</p>
              </div>
            )}
          </div>

          <ModalFooter>
            <ModalClose asChild>
              <Button variant="outline" type="button" disabled={isPending}>
                Cancel
              </Button>
            </ModalClose>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Changes"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
