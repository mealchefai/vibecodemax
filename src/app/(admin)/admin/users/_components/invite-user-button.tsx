"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InviteUserModal } from "./invite-user-modal";

export function InviteUserButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        <svg
          className="h-4 w-4 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        Invite User
      </Button>

      <InviteUserModal open={isOpen} onOpenChange={setIsOpen} />
    </>
  );
}
