// Runs once when the server starts. Fails fast on missing or unsafe config
// instead of erroring on the first request.
export function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const problems: string[] = [];

  if (!process.env.DATABASE_URL) problems.push("DATABASE_URL is not set");
  const secret = process.env.AUTH_SECRET ?? "";
  if (secret.length < 32) problems.push("AUTH_SECRET must be at least 32 characters (generate one with: npx auth secret)");

  if (problems.length) {
    const msg = `Configuration error:\n - ${problems.join("\n - ")}`;
    if (process.env.NODE_ENV === "production") throw new Error(msg);
    console.warn(msg);
  }
}
