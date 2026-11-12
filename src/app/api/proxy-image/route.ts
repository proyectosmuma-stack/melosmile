import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url) return new NextResponse("Missing url parameter", { status: 400 });
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch from origin");
    
    const blob = await res.blob();
    return new NextResponse(blob, {
      headers: {
        "Content-Type": res.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=31536000",
      }
    });
  } catch (error) {
    console.error("Proxy Image Error:", error);
    return new NextResponse("Error fetching image", { status: 500 });
  }
}
