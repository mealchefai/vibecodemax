"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EditUserModal } from "./edit-user-modal";
import { DeleteUserModal } from "./delete-user-modal";

type UserActionsProps = {
  user: {
    id: string;
    name: string;
    email: string;
    role: "admin" | "user";
  };
};

export function UserActions({ user }: UserActionsProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  return (
    <>
      <div className="flex gap-2 justify-end">
        <Button
          variant="ghost"
          size="sm"
          className="hover:bg-foreground/10"
          onClick={() => setIsEditModalOpen(true)}
          title="Edit user"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="text-danger hover:bg-foreground/10 hover:text-danger"
          title="Delete user"
          onClick={() => setIsDeleteModalOpen(true)}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </Button>
      </div>

      <EditUserModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        user={user}
      />
      <DeleteUserModal
        open={isDeleteModalOpen}
        onOpenChange={setIsDeleteModalOpen}
        user={user}
      />
    </>
  );
}
