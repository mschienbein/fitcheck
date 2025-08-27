/**
 * Web Scraping Service for Clothing Data Extraction
 */

import axios from 'axios';

interface ProductData {
  name?: string;
  brand?: string;
  price?: number;
  currency?: string;
  imageUrl?: string;
  sizes?: string[];
  sizeChart?: Record<string, Record<string, number>>;
  description?: string;
  material?: string;
  category?: string;
}

/**
 * Extract OpenGraph and meta tags from HTML
 */
function extractMetaTags(html: string): Record<string, string> {
  const metaTags: Record<string, string> = {};
  
  // Extract OpenGraph tags
  const ogRegex = /<meta\s+property=["']og:([^"']+)["']\s+content=["']([^"']+)["']/gi;
  let match;
  while ((match = ogRegex.exec(html)) !== null) {
    metaTags[`og:${match[1]}`] = match[2];
  }
  
  // Extract Twitter tags
  const twitterRegex = /<meta\s+name=["']twitter:([^"']+)["']\s+content=["']([^"']+)["']/gi;
  while ((match = twitterRegex.exec(html)) !== null) {
    metaTags[`twitter:${match[1]}`] = match[2];
  }
  
  // Extract regular meta tags
  const metaRegex = /<meta\s+name=["']([^"']+)["']\s+content=["']([^"']+)["']/gi;
  while ((match = metaRegex.exec(html)) !== null) {
    metaTags[match[1]] = match[2];
  }
  
  return metaTags;
}

/**
 * Extract JSON-LD structured data
 */
function extractJsonLd(html: string): Record<string, unknown>[] {
  const jsonLdRegex = /<script\s+type=["']application\/ld\+json["']>([^<]+)<\/script>/gi;
  const jsonLdData = [];
  let match;
  
  while ((match = jsonLdRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      jsonLdData.push(data);
    } catch (e) {
      // Invalid JSON, skip
    }
  }
  
  return jsonLdData;
}

/**
 * Extract product images from HTML
 */
function extractImages(html: string, baseUrl: string): string[] {
  const images: Set<string> = new Set();
  
  // Extract from img tags
  const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const url = match[1];
    if (url && !url.includes('icon') && !url.includes('logo')) {
      images.add(url.startsWith('http') ? url : new URL(url, baseUrl).toString());
    }
  }
  
  // Extract from data-src (lazy loading)
  const dataSrcRegex = /data-src=["']([^"']+)["']/gi;
  while ((match = dataSrcRegex.exec(html)) !== null) {
    const url = match[1];
    if (url) {
      images.add(url.startsWith('http') ? url : new URL(url, baseUrl).toString());
    }
  }
  
  return Array.from(images);
}

/**
 * Extract size information from HTML
 */
function extractSizes(html: string): string[] {
  const sizes: Set<string> = new Set();
  
  // Common size patterns
  const sizePatterns = [
    /\b(XXS|XS|S|M|L|XL|XXL|XXXL)\b/g,
    /\b(size\s*[0-9]+)\b/gi,
    /\b([0-9]+[A-Z])\b/g, // e.g., 32W, 34L
  ];
  
  for (const pattern of sizePatterns) {
    let match;
    while ((match = pattern.exec(html)) !== null) {
      sizes.add(match[1].toUpperCase());
    }
  }
  
  return Array.from(sizes);
}

/**
 * Extract price from HTML
 */
function extractPrice(html: string): { price?: number; currency?: string } {
  // Common price patterns
  const pricePatterns = [
    /[\$£€]\s*([0-9,]+\.?[0-9]*)/,
    /([0-9,]+\.?[0-9]*)\s*[\$£€]/,
    /"price"\s*:\s*"?([0-9,]+\.?[0-9]*)"?/i,
    /data-price=["']([0-9,]+\.?[0-9]*)/i,
  ];
  
  for (const pattern of pricePatterns) {
    const match = html.match(pattern);
    if (match) {
      const price = parseFloat(match[1].replace(/,/g, ''));
      if (!isNaN(price)) {
        // Detect currency
        let currency = 'USD';
        if (html.includes('£')) currency = 'GBP';
        else if (html.includes('€')) currency = 'EUR';
        
        return { price, currency };
      }
    }
  }
  
  return {};
}

/**
 * Main scraping function
 */
export async function scrapeProductPage(url: string): Promise<ProductData> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const html = response.data;
    const metaTags = extractMetaTags(html);
    const jsonLd = extractJsonLd(html);
    const images = extractImages(html, url);
    const sizes = extractSizes(html);
    const priceData = extractPrice(html);
    
    // Build product data from various sources
    const productData: ProductData = {
      name: metaTags['og:title'] || metaTags['twitter:title'],
      description: metaTags['og:description'] || metaTags['description'],
      imageUrl: metaTags['og:image'] || images[0],
      ...priceData,
      sizes: sizes.length > 0 ? sizes : undefined,
    };
    
    // Try to extract from JSON-LD
    for (const data of jsonLd) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const product = data as any; // Type assertion for JSON-LD data
      if (product['@type'] === 'Product' || product.type === 'Product') {
        productData.name = productData.name || (typeof product.name === 'string' ? product.name : undefined);
        productData.brand = product.brand?.name || product.manufacturer;
        productData.description = productData.description || (typeof product.description === 'string' ? product.description : undefined);
        
        if (product.offers) {
          const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
          productData.price = productData.price || (offer.price ? parseFloat(offer.price) : undefined);
          productData.currency = productData.currency || offer.priceCurrency;
        }
        
        if (product.image) {
          const img = Array.isArray(product.image) ? product.image[0] : product.image;
          productData.imageUrl = productData.imageUrl || (typeof img === 'string' ? img : img?.url);
        }
      }
    }
    
    // Extract brand from URL patterns
    if (!productData.brand) {
      const urlParts = new URL(url).hostname.split('.');
      productData.brand = urlParts[urlParts.length - 2]; // e.g., 'nike' from nike.com
    }
    
    // Detect category from URL or content
    const categoryPatterns = {
      shirt: /shirt|blouse|top/i,
      pants: /pants|trousers|jeans|bottoms/i,
      dress: /dress|gown/i,
      shoes: /shoes|sneakers|boots|footwear/i,
      jacket: /jacket|coat|blazer|outerwear/i,
    };
    
    for (const [category, pattern] of Object.entries(categoryPatterns)) {
      if (pattern.test(url) || pattern.test(html)) {
        productData.category = category;
        break;
      }
    }
    
    return productData;
    
  } catch (error) {
    console.error('Scraping error:', error);
    throw new Error(`Failed to scrape product page: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Scrape size chart from a brand's size guide page
 */
export async function scrapeSizeChart(url: string): Promise<Record<string, Record<string, number>>> {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      timeout: 10000
    });
    
    const html = response.data;
    const sizeChart: Record<string, Record<string, number>> = {};
    
    // Look for table elements containing size data
    const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/gi;
    let tableMatch;
    
    while ((tableMatch = tableRegex.exec(html)) !== null) {
      const tableHtml = tableMatch[1];
      
      // Check if this table contains size information
      if (!/size|chest|waist|length/i.test(tableHtml)) continue;
      
      // Extract headers
      const headerRegex = /<th[^>]*>([^<]+)<\/th>/gi;
      const headers: string[] = [];
      let headerMatch;
      while ((headerMatch = headerRegex.exec(tableHtml)) !== null) {
        headers.push(headerMatch[1].trim());
      }
      
      // Extract rows
      const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
      let rowMatch;
      while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
        const cellRegex = /<td[^>]*>([^<]+)<\/td>/gi;
        const cells: string[] = [];
        let cellMatch;
        while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
          cells.push(cellMatch[1].trim());
        }
        
        if (cells.length > 0) {
          const size = cells[0];
          if (/^(XXS|XS|S|M|L|XL|XXL|XXXL|\d+)$/i.test(size)) {
            sizeChart[size] = {};
            for (let i = 1; i < Math.min(cells.length, headers.length); i++) {
              const measurement = parseFloat(cells[i]);
              if (!isNaN(measurement)) {
                sizeChart[size][headers[i].toLowerCase()] = measurement;
              }
            }
          }
        }
      }
      
      if (Object.keys(sizeChart).length > 0) {
        break; // Found a valid size chart
      }
    }
    
    return sizeChart;
    
  } catch (error) {
    console.error('Size chart scraping error:', error);
    return {};
  }
}

/**
 * Get size chart URL for known brands
 */
export function getSizeChartUrl(brand: string, category?: string): string | null {
  const sizeCharts: Record<string, string> = {
    'nike': 'https://www.nike.com/size-fit-guide',
    'adidas': 'https://www.adidas.com/us/help/size_guide',
    'zara': 'https://www.zara.com/us/en/help/size-guide',
    'hm': 'https://www2.hm.com/en_us/customer-service/size-guide.html',
    'uniqlo': 'https://www.uniqlo.com/us/en/size-guide',
    'gap': 'https://www.gap.com/browse/sizeChart.do',
    'allsaints': 'https://www.allsaints.com/size-guide/',
  };
  
  const brandKey = brand.toLowerCase().replace(/[^a-z]/g, '');
  return sizeCharts[brandKey] || null;
}