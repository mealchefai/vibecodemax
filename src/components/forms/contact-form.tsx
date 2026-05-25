"use client";

import React from "react";
import { Button, Input, Alert, AlertDescription } from "@/components/ui";
import { TurnstileWidget } from "@/components/security/TurnstileWidget";

export function ContactForm() {
  const [formData, setFormData] = React.useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });
  const [isLoading, setIsLoading] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState("");
  const [errorMessage, setErrorMessage] = React.useState("");
  const [captchaToken, setCaptchaToken] = React.useState("");
  const [captchaResetSignal, setCaptchaResetSignal] = React.useState(0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setIsLoading(true);

    if (
      !formData.name ||
      !formData.email ||
      !formData.subject ||
      !formData.message
    ) {
      setErrorMessage("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setErrorMessage("Please enter a valid email address");
      setIsLoading(false);
      return;
    }
    if (!captchaToken) {
      setErrorMessage("Please complete the verification challenge");
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...formData, captchaToken }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Request failed");
      }

      setSuccessMessage(
        "Thank you for your message! We'll get back to you within 24 hours."
      );
      setFormData({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
      setCaptchaToken("");
      setCaptchaResetSignal((prev) => prev + 1);
    } catch (err) {
      setErrorMessage(
        err instanceof Error
          ? err.message
          : "Failed to send message. Please try again."
      );
      console.error("Contact form error:", err);
      setCaptchaToken("");
      setCaptchaResetSignal((prev) => prev + 1);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange =
    (field: keyof typeof formData) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const value = e.target.value;
      setFormData((prev) => ({ ...prev, [field]: value }));

      if (errorMessage) setErrorMessage("");
      if (successMessage) setSuccessMessage("");
    };

  return (
    <div className="bg-surface backdrop-blur-sm border border-border rounded-lg p-8">
      <h2 className="text-2xl font-semibold text-text-primary mb-6">
        Send us a message
      </h2>

      {successMessage && (
        <Alert variant="success" className="mb-6">
          <svg
            className="h-4 w-4 text-success"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {errorMessage && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-text-primary mb-2"
            >
              Name *
            </label>
            <Input
              type="text"
              id="name"
              placeholder="Your full name"
              value={formData.name}
              onChange={handleInputChange("name")}
              className="h-12 bg-background border-border"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-text-primary mb-2"
            >
              Email *
            </label>
            <Input
              type="email"
              id="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={handleInputChange("email")}
              className="h-12 bg-background border-border"
              required
              disabled={isLoading}
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="subject"
            className="block text-sm font-medium text-text-primary mb-2"
          >
            Subject *
          </label>
          <Input
            type="text"
            id="subject"
            placeholder="What is this about?"
            value={formData.subject}
            onChange={handleInputChange("subject")}
            className="h-12 bg-background border-border"
            required
            disabled={isLoading}
          />
        </div>

        <div>
          <label
            htmlFor="message"
            className="block text-sm font-medium text-text-primary mb-2"
          >
            Message *
          </label>
          <textarea
            id="message"
            rows={6}
            placeholder="Tell us more about your question or how we can help..."
            value={formData.message}
            onChange={handleInputChange("message")}
            className="w-full px-3 py-3 bg-background border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors resize-none"
            required
            disabled={isLoading}
          />
        </div>
        <div className="space-y-2">
          <TurnstileWidget
            action="contact"
            onTokenChange={setCaptchaToken}
            resetSignal={captchaResetSignal}
          />
          {!captchaToken && (
            <p className="text-xs text-text-secondary">
              Complete the verification challenge before sending your message.
            </p>
          )}
        </div>

        <Button type="submit" className="w-full h-12" disabled={isLoading}>
          {isLoading ? (
            <>
              <svg
                className="animate-spin -ml-1 mr-3 h-4 w-4"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              Sending...
            </>
          ) : (
            "Send Message"
          )}
        </Button>
      </form>

      <p className="mt-4 text-sm text-text-secondary text-center">
        We typically respond within 24 hours during business days.
      </p>
    </div>
  );
}
