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
import { deleteUser } from "../actions";
import { useRouter } from "next/navigation";

type DeleteUserModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

export function DeleteUserModal({
  open,
  onOpenChange,
  user,
}: DeleteUserModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    setError(null);
    startTransition(async () => {
      const result = await deleteUser(user.id);
      if (result.success) {
        onOpenChange(false);
        router.refresh();
      } else {
        setError(result.error || "Failed to delete user");
      }
    });
  };

  return (
    <Modal open={open} onOpenChange={onOpenChange}>
      <ModalContent className="max-w-md">
        <ModalHeader>
          <ModalTitle>Delete User</ModalTitle>
          <ModalDescription>
            This permanently removes the user from authentication, profiles, and
            admin access.
          </ModalDescription>
        </ModalHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-danger/30 bg-danger/10 p-4 text-sm text-danger">
            This action cannot be undone.
          </div>
          <div className="text-sm text-text-secondary">
            You are about to delete{" "}
            <span className="font-medium text-text-primary">{user.name}</span> (
            {user.email}).
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
          <Button
            variant="destructive"
            type="button"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete User"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
