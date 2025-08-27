import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { scrapeProductPage, getSizeChartUrl, scrapeSizeChart } from "@/lib/scraper-service";
import { extractClothingMeasurements } from "@/lib/gemini-service";

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { url } = await req.json();
    
    if (!url || !url.startsWith('http')) {
      return NextResponse.json(
        { error: "Invalid URL provided" },
        { status: 400 }
      );
    }

    // Scrape product data
    const productData = await scrapeProductPage(url);
    
    if (!productData.imageUrl) {
      return NextResponse.json(
        { error: "Could not extract product image from URL" },
        { status: 400 }
      );
    }

    // Try to get size chart for the brand
    let sizingData = {};
    if (productData.brand) {
      const sizeChartUrl = getSizeChartUrl(productData.brand, productData.category);
      if (sizeChartUrl) {
        const sizeChart = await scrapeSizeChart(sizeChartUrl);
        if (Object.keys(sizeChart).length > 0) {
          sizingData = { sizeChart };
        }
      }
    }

    // If we have an image, try to extract measurements using AI
    if (productData.imageUrl) {
      try {
        const response = await fetch(productData.imageUrl);
        const imageBuffer = Buffer.from(await response.arrayBuffer());
        const measurements = await extractClothingMeasurements(
          imageBuffer,
          productData.category
        );
        
        sizingData = {
          ...sizingData,
          ...measurements
        };
      } catch (error) {
        console.error("Failed to extract measurements from image:", error);
      }
    }

    // Save to database
    const clothingItem = await prisma.clothingItem.create({
      data: {
        userId: session.user.id,
        name: productData.name || "Imported Item",
        category: productData.category || "other",
        brand: productData.brand,
        sourceUrl: url,
        imageUrl: productData.imageUrl,
        price: productData.price,
        currency: productData.currency,
        sizingData: sizingData,
        metadata: {
          description: productData.description,
          sizes: productData.sizes,
          importedAt: new Date().toISOString()
        }
      }
    });

    return NextResponse.json({
      success: true,
      item: clothingItem,
      productData,
      sizingData
    });

  } catch (error) {
    console.error("Import URL error:", error);
    return NextResponse.json(
      { 
        error: "Failed to import from URL",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}