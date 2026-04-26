// ─── AI Service — Gemini 2.5 Pro integration ────────────────────────────────
import { geminiModel } from "../config/vertexai";
import type {
  AISeverityResult,
  AIImageAnalysis,
  Severity,
  SizeBucket,
  Pothole,
  Locality,
} from "../models/types";
import { distanceMeters } from "../utils/geohash";

/**
 * Analyze a pothole image using Gemini 2.5 Pro multimodal.
 * Returns whether it's a pothole, confidence, estimated size, and description.
 */
export async function analyzeImage(
  imageBase64: string,
  mimeType: string = "image/webp"
): Promise<AIImageAnalysis> {
  try {
    const prompt = `You are an expert road infrastructure analyst. Analyze this image and determine:
1. Is this a pothole or road damage? (true/false)
2. Confidence level (0-100)
3. Estimated size category: "small" (<30cm), "medium" (30-60cm), or "large" (>60cm)
4. Brief description of the road damage

Respond in this exact JSON format, nothing else:
{
  "isPothole": true,
  "confidence": 85,
  "estimatedSize": "medium",
  "description": "A medium-sized pothole on an asphalt road surface with crumbled edges."
}`;

    const result = await geminiModel.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType,
                data: imageBase64,
              },
            },
            { text: prompt },
          ],
        },
      ],
    });

    const response = result.response;
    const text = response?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return {
        isPothole: parsed.isPothole ?? false,
        confidence: Math.min(100, Math.max(0, parsed.confidence ?? 0)),
        estimatedSize: parsed.estimatedSize || undefined,
        description: parsed.description || "Unable to analyze image",
      };
    }

    return {
      isPothole: false,
      confidence: 0,
      description: "Could not parse AI analysis",
    };
  } catch (err: any) {
    console.error("❌ AI Image Analysis failed:", err.message);
    return {
      isPothole: false,
      confidence: 0,
      description: `AI analysis error: ${err.message}`,
    };
  }
}

/**
 * Compute AI severity score for a pothole.
 * Considers: size, traffic density, arterial status, cluster density.
 */
export async function computeSeverity(
  size: SizeBucket,
  position: { lat: number; lng: number },
  locality: Locality,
  nearbyPotholes: Pothole[],
  trafficScore?: number,
): Promise<AISeverityResult> {
  const sizeWeight = size === "large" ? 35 : size === "medium" ? 20 : 8;

  // Use live traffic score if available, otherwise fall back to static locality density
  const effectiveTrafficScore = trafficScore ?? locality.trafficDensity;
  const trafficWeight = effectiveTrafficScore * 0.4;
  const arterialBonus = locality.isArterial ? 25 : 5;

  const nearby = nearbyPotholes.filter(
    (p) => distanceMeters(p.position, position) < 60
  );
  const clusterBoost = Math.min(15, nearby.length * 2);

  const score = Math.min(
    100,
    Math.round(sizeWeight + trafficWeight + arterialBonus + clusterBoost)
  );

  let severity: Severity = "low";
  if (score >= 80) severity = "critical";
  else if (score >= 60) severity = "high";
  else if (score >= 40) severity = "medium";

  const trafficSource = trafficScore !== undefined ? "live" : "static";
  const reasons = [
    `Size: ${size} (+${sizeWeight})`,
    `Traffic impact ${Math.round(effectiveTrafficScore)}/100 — ${trafficSource} (+${Math.round(trafficWeight)})`,
    locality.isArterial ? "Arterial road (+25)" : "Local road (+5)",
    nearby.length
      ? `Cluster: ${nearby.length} nearby reports (+${clusterBoost})`
      : "No nearby reports",
  ];

  return { severity, score, reasons };
}

/**
 * Generate AI-powered weekly report summary using Gemini 2.5 Pro.
 */
export async function generateWeeklyReportSummary(data: {
  totalReported: number;
  totalFixed: number;
  pending: number;
  reoccurring: number;
  severityBreakdown: { low: number; medium: number; high: number; critical: number };
  topLocality: string;
  worstLocality: string;
  breachedCount: number;
}): Promise<string> {
  try {
    const prompt = `You are an AI analyst for Bengaluru's Road Watch civic platform (BBMP).
Generate a concise weekly report summary (3-4 sentences) based on this data:

- Total potholes reported: ${data.totalReported}
- Total fixed: ${data.totalFixed}
- Pending: ${data.pending}
- Reoccurring (improper repairs): ${data.reoccurring}
- Critical severity: ${data.severityBreakdown.critical}
- High severity: ${data.severityBreakdown.high}
- Medium severity: ${data.severityBreakdown.medium}
- Low severity: ${data.severityBreakdown.low}
- SLA breaches: ${data.breachedCount}
- Top performing locality: ${data.topLocality}
- Worst performing locality: ${data.worstLocality}

Write in a professional civic report tone. Highlight key concerns and positive trends.
Focus on actionable insights for BBMP supervisors.
Return ONLY the summary text, no JSON or formatting.`;

    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    return text.trim() || "Unable to generate AI summary for this period.";
  } catch (err: any) {
    console.error("❌ AI Report generation failed:", err.message);
    return `Automated summary unavailable. Key metrics: ${data.totalReported} reported, ${data.totalFixed} fixed, ${data.pending} pending, ${data.severityBreakdown.critical} critical.`;
  }
}

/**
 * Generate comprehensive AI-powered insights for weekly reports.
 */
export async function generateAIInsights(data: {
  totalReported: number;
  totalFixed: number;
  pending: number;
  reoccurring: number;
  avgFixTime: number; // in days
  resolutionRate: number; // percentage
  worstLocality: string;
  bestWard: string;
  severityDistribution: { low: number; medium: number; high: number; critical: number };
}): Promise<import("../models/types").AIInsights> {
  try {
    const prompt = `Analyze the following civic report data for Bengaluru Road Watch and generate insights.

Input Data:
${JSON.stringify(data, null, 2)}

Generate:
1. Weekly summary (concise overview)
2. Key issues (bullet points, focus on bottlenecks or critical severities)
3. Observed patterns (trends in fixing, reoccurrence, or geographical hotspots)
4. Recommendations (actionable steps for BBMP supervisors)

Respond ONLY with a valid JSON object in this exact structure:
{
  "summary": "string",
  "issues": ["string"],
  "patterns": ["string"],
  "recommendations": ["string"]
}`;

    const result = await geminiModel.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const text = result.response?.candidates?.[0]?.content?.parts?.[0]?.text || "";
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Invalid AI response format");
  } catch (err: any) {
    console.error("❌ AI Insights generation failed:", err.message);
    return {
      summary: "AI analytics currently unavailable due to processing error.",
      issues: ["Could not process issues."],
      patterns: ["Could not process patterns."],
      recommendations: ["Check raw data metrics for insights."]
    };
  }
}
