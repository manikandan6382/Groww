/**
 * RFC 7807 Problem Details Response Helper
 * Provides standardized, machine-readable HTTP error envelopes matching .NET 8 ProblemDetails.
 */

export function sendProblem(res, {
  status = 400,
  title,
  detail,
  type = "https://tools.ietf.org/html/rfc7807",
  instance,
  errors = null
}) {
  const payload = {
    type,
    title: title || "An error occurred",
    status,
    detail: detail || "No additional details provided.",
    instance: instance || undefined,
    errors: errors || undefined,
    success: false // Backward compatibility for legacy frontend slice checks
  };

  res.writeHead(status, {
    "Content-Type": "application/problem+json; charset=utf-8",
    "X-Content-Type-Options": "nosniff"
  });
  res.end(JSON.stringify(payload));
  return true;
}
