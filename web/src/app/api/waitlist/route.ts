import { NextResponse } from "next/server";
import { clerkClient } from "@clerk/nextjs/server";

export async function POST(request: Request) {
    try {
        const { emailAddress } = await request.json();

        if (!emailAddress || typeof emailAddress !== "string") {
            return NextResponse.json(
                { error: "Email is required" },
                { status: 400 }
            );
        }

        const client = await clerkClient();
        await client.waitlistEntries.create({ emailAddress });

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        console.error("Waitlist error:", error);

        // Clerk may throw if email already on waitlist
        const message =
            error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
