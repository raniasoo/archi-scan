// PDF generation disabled - using client-side jsPDF instead
// This file exists only to clear the build cache
export async function POST() {
  return new Response(
    JSON.stringify({ error: "PDF generation moved to client-side" }),
    { status: 410, headers: { "Content-Type": "application/json" } }
  )
}
