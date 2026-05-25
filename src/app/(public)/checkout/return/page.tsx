export const dynamic = "force-dynamic";

type CheckoutReturnSearchParams = Promise<{
  status?: string | string[];
}>;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function CheckoutReturnPage({
  searchParams,
}: {
  searchParams: CheckoutReturnSearchParams;
}) {
  const params = await searchParams;
  const status = firstValue(params.status);
  const isSuccess = status === "success";
  const isCancelled = status === "cancelled";

  const title = isSuccess
    ? "Payment Successful"
    : isCancelled
      ? "Checkout Not Completed"
      : "Checkout Status Unavailable";
  const description = isSuccess
    ? "Your checkout is complete."
    : isCancelled
      ? "No payment was completed."
      : "We could not determine the checkout result from this link.";

  return (
    <div className="min-h-[calc(100vh-8rem)] bg-background flex items-center justify-center px-6 py-16">
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-8 text-center ">
        <div
          className={`mx-auto mb-6 flex h-12 w-12 items-center justify-center rounded-full ${
            isSuccess
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
          aria-hidden="true"
        >
          {isSuccess ? (
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="m5 13 4 4L19 7"
              />
            </svg>
          ) : (
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          )}
        </div>

        <div className="space-y-3">
          <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
          <p className="text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </section>
    </div>
  );
}
