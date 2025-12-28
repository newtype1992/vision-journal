export function getErrorMessage(error: unknown) {
  if (!error) return "Unknown error";
  if (typeof error === "string") return error;
  if (error instanceof Error) return error.message;
  if (typeof error === "object" && "message" in error) {
    const message = (error as { message?: string }).message;
    if (message) return message;
  }
  return "Unknown error";
}
