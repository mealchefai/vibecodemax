import { PageContainer } from "@/components/layout";
import { ContactForm } from "@/components/forms/contact-form";

export default function ContactPage() {
  return (
    <PageContainer maxWidth="lg" padding="lg">
      <div className="py-section-mobile md:py-section">
        <div className="mx-auto max-w-3xl text-center mb-16">
          <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground">
            <span>Contact Us</span>
          </h1>
          <p className="mt-6 text-lg leading-7 text-muted-foreground">
            Have a question or need help? We&apos;d love to hear from you. Send
            us a message and we&apos;ll respond as soon as possible.
          </p>
        </div>

        <div className="max-w-2xl mx-auto">
          <ContactForm />
        </div>
      </div>
    </PageContainer>
  );
}
