import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateVirtualTryOn } from "@/lib/gemini-service";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // Check authentication - temporarily disabled for testing
    const session = await getServerSession(authOptions);
    // if (!session?.user?.id) {
    //   return NextResponse.json(
    //     { error: "Unauthorized" },
    //     { status: 401 }
    //   );
    // }

    // Parse form data
    const formData = await req.formData();
    const userImage = formData.get("userImage") as File;
    const clothingImage = formData.get("clothingImage") as File;
    const clothingItemId = formData.get("clothingItemId") as string;
    const baselineImageUrl = formData.get("baselineImageUrl") as string;
    const backgroundPreference = formData.get("backgroundPreference") as string;

    if (!userImage || !clothingImage) {
      return NextResponse.json(
        { error: "Both user and clothing images are required" },
        { status: 400 }
      );
    }

    // Check user's subscription limits - disabled for testing
    // const user = session?.user?.id ? await prisma.user.findUnique({
    //   where: { id: session.user.id },
    //   select: {
    //     subscription: true,
    //     tryOnHistory: {
    //       where: {
    //         createdAt: {
    //           gte: new Date(new Date().setHours(0, 0, 0, 0))
    //         }
    //       }
    //     }
    //   }
    // }) : null;

    // // Free users: 5 try-ons per day
    // const dailyLimit = user?.subscription === "free" ? 5 : 100;
    // if (user && user.tryOnHistory.length >= dailyLimit) {
    //   return NextResponse.json(
    //     { 
    //       error: "Daily limit reached",
    //       message: `Free users are limited to ${dailyLimit} try-ons per day. Upgrade to Pro for unlimited access.`
    //     },
    //     { status: 429 }
    //   );
    // }

    // Convert images to buffers
    const userImageBuffer = Buffer.from(await userImage.arrayBuffer());
    const clothingImageBuffer = Buffer.from(await clothingImage.arrayBuffer());

    // Generate virtual try-on
    const resultImageUrl = await generateVirtualTryOn(
      userImageBuffer,
      clothingImageBuffer,
      {
        backgroundPreference,
        preserveBackground: false
      }
    );

    // Save to history if clothingItemId provided and user is authenticated
    if (clothingItemId && session?.user?.id) {
      await prisma.tryOnHistory.create({
        data: {
          userId: session.user.id,
          clothingItemId,
          baselineImageUrl: baselineImageUrl || "",
          resultImageUrl,
          prompt: `Virtual try-on with ${backgroundPreference || 'neutral'} background`,
        }
      });
    }

    return NextResponse.json({
      success: true,
      imageUrl: resultImageUrl,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("Virtual try-on error:", error);
    return NextResponse.json(
      { 
        error: "Failed to generate virtual try-on",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}