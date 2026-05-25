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
import { createUser } from "../actions";
import { useRouter } from "next/navigation";

type InviteUserModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function InviteUserModal({ open, onOpenChange }: InviteUserModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    isAdmin: false,
  });
  const [error, setError] = useState<string | null>(null);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = formData.name.trim();
    const email = formData.email.trim();
    const password = formData.password;

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

    if (!password || password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    startTransition(async () => {
      const result = await createUser({
        name,
        email,
        password,
        isAdmin: formData.isAdmin,
      });

      if (result.success) {
        onOpenChange(false);
        setFormData({ name: "", email: "", password: "", isAdmin: false });
        router.refresh();
      } else {
        setError(result.error || "Failed to create user");
      }
    });
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <ModalTitle>Invite User</ModalTitle>
          <ModalDescription>
            Create a new user and optionally grant admin access
          </ModalDescription>
        </ModalHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <Label htmlFor="invite-name">Name</Label>
              <Input
                id="invite-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter user name"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                placeholder="Enter email address"
                disabled={isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-password">Temporary Password</Label>
              <Input
                id="invite-password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder="Set a temporary password"
                disabled={isPending}
              />
            </div>

            <div className="flex items-center justify-between space-x-2 rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="invite-admin-toggle" className="text-base">
                  Admin Access
                </Label>
                <div className="text-sm text-text-secondary">
                  Grant administrative privileges to this user
                </div>
              </div>
              <Switch
                id="invite-admin-toggle"
                checked={formData.isAdmin}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isAdmin: checked })
                }
                disabled={isPending}
              />
            </div>

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
              {isPending ? "Creating..." : "Create User"}
            </Button>
          </ModalFooter>
        </form>
      </ModalContent>
    </Modal>
  );
}
