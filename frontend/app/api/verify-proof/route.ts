import { NextResponse } from "next/server";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export async function POST(request: Request) {
  try {
    const { requestId } = await request.json();

    if (!requestId) {
      return NextResponse.json(
        { success: false, error: "Request ID is required" },
        { status: 400 }
      );
    }

    // Execute the verification script
    const { stdout, stderr } = await execAsync(
      `node backend/scripts/verifyArticleProof.js ${requestId}`
    );

    if (stderr) {
      console.error("Script error:", stderr);
      return NextResponse.json(
        { success: false, error: stderr },
        { status: 500 }
      );
    }

    // Parse the script output
    const result = JSON.parse(stdout);
    return NextResponse.json(result);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 }
    );
  }
}
