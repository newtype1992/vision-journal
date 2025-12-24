export function isNetworkError(error: unknown): boolean {
  if (!error) return false;

  const message =
    typeof error === "object" && error && "message" in error
      ? String((error as { message?: unknown }).message)
      : String(error);

  return (
    message.includes("Network request failed") || message.includes("Failed to fetch")
  );
}
