// ─── AI Service — Gemini 2.5 Pro integration (via @google/genai) ────────────
import { genAI, GEMINI_MODEL } from "../config/vertexai";
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

    const result = await genAI.models.generateContent({
      model: GEMINI_MODEL,
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

    const text = result.text ?? "";

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

    const result = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const text = result.text ?? "";
    return text.trim() || "Unable to generate AI summary for this period.";
  } catch (err: any) {
    console.error("⚠️ Gemini summary unavailable, using local generation:", err.message);
    const resPct = data.totalReported > 0 ? Math.round((data.totalFixed / data.totalReported) * 100) : 0;
    const resLabel = resPct >= 50 ? "strong" : resPct >= 25 ? "moderate" : "concerning";
    return `Weekly road audit: ${data.totalReported} potholes tracked across Bengaluru, with ${data.totalFixed} repaired (${resPct}% resolution rate — ${resLabel}). ${data.pending} remain unresolved, including ${data.severityBreakdown.critical} critical-severity cases. ${data.worstLocality} is the worst-performing locality this period, while ${data.topLocality} leads in repairs. ${data.breachedCount} SLA breaches recorded${data.reoccurring > 0 ? `, and ${data.reoccurring} potholes have reoccurred after previous repairs` : ""}. Priority: deploy crews to critical zones and audit repair quality.`;
  }
}

/**
 * Generate comprehensive AI-powered insights for weekly reports.
 * Falls back to intelligent local analysis when Gemini is unavailable.
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

    const result = await genAI.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const text = result.text ?? "";
    
    // Extract JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Invalid AI response format");
  } catch (err: any) {
    console.error("⚠️ Gemini unavailable, generating local insights:", err.message);
    return generateLocalInsights(data);
  }
}

/**
 * Smart local fallback — generates real insights from data when Gemini is down.
 */
function generateLocalInsights(data: {
  totalReported: number;
  totalFixed: number;
  pending: number;
  reoccurring: number;
  avgFixTime: number;
  resolutionRate: number;
  worstLocality: string;
  bestWard: string;
  severityDistribution: { low: number; medium: number; high: number; critical: number };
}): import("../models/types").AIInsights {
  const { totalReported, totalFixed, pending, reoccurring, avgFixTime, resolutionRate, worstLocality, bestWard, severityDistribution } = data;
  const criticalPct = totalReported > 0 ? Math.round((severityDistribution.critical / totalReported) * 100) : 0;
  const highPct = totalReported > 0 ? Math.round((severityDistribution.high / totalReported) * 100) : 0;
  const severeTotal = severityDistribution.critical + severityDistribution.high;
  const severePct = totalReported > 0 ? Math.round((severeTotal / totalReported) * 100) : 0;

  // Build dynamic summary
  const resLabel = resolutionRate >= 50 ? "above average" : resolutionRate >= 25 ? "moderate" : "critically low";
  const summary = `This week: ${totalReported} potholes reported, ${totalFixed} fixed (${Math.round(resolutionRate)}% resolution — ${resLabel}). ${pending} remain pending with ${severityDistribution.critical} critical-severity cases. ${worstLocality} requires immediate attention while ${bestWard} leads in repairs. Average fix time: ${avgFixTime.toFixed(1)} days.`;

  // Build issues
  const issues: string[] = [];
  if (resolutionRate < 25) {
    issues.push(`Resolution rate at ${Math.round(resolutionRate)}% — well below the 50% target. ${pending} potholes remain unaddressed.`);
  }
  if (severityDistribution.critical > 0) {
    issues.push(`${severityDistribution.critical} critical-severity potholes (${criticalPct}% of total) pose immediate safety risks and require priority dispatch.`);
  }
  if (severeTotal > totalReported * 0.4) {
    issues.push(`${severePct}% of all reports are high or critical severity — indicating widespread road deterioration rather than isolated incidents.`);
  }
  if (reoccurring > 0) {
    issues.push(`${reoccurring} reoccurring pothole${reoccurring > 1 ? "s" : ""} detected — previous repairs have failed, suggesting quality issues with patching materials or contractors.`);
  }
  if (avgFixTime > 7) {
    issues.push(`Average fix time of ${avgFixTime.toFixed(1)} days exceeds the 7-day benchmark. SLA enforcement needs strengthening.`);
  }
  if (issues.length === 0) {
    issues.push(`No critical blockers detected. ${totalFixed} repairs completed this period.`);
  }

  // Build patterns
  const patterns: string[] = [];
  if (severityDistribution.critical > severityDistribution.high) {
    patterns.push(`Critical reports outnumber high-severity cases (${severityDistribution.critical} vs ${severityDistribution.high}), suggesting roads are deteriorating past the moderate stage before being reported.`);
  }
  if (totalFixed > 0 && totalFixed < pending) {
    patterns.push(`Repair rate (${totalFixed}/week) is outpaced by new reports — the backlog of ${pending} pending potholes is likely growing.`);
  }
  if (reoccurring > 0) {
    patterns.push(`${reoccurring} reoccurrence${reoccurring > 1 ? "s" : ""} indicate a repair quality pattern — same locations failing within weeks of patching.`);
  }
  patterns.push(`${worstLocality} continues to be the highest-concentration area. ${bestWard} ward shows the most responsive repair crews.`);

  // Build recommendations
  const recommendations: string[] = [];
  if (severityDistribution.critical > 0) {
    recommendations.push(`Deploy emergency repair crews to ${worstLocality} — ${severityDistribution.critical} critical potholes need attention within 6-hour SLA windows.`);
  }
  if (reoccurring > 0) {
    recommendations.push(`Audit repair quality for ${reoccurring} reoccurring sites. Consider switching to hot-mix asphalt or full-depth patching for repeat failures.`);
  }
  if (resolutionRate < 30) {
    recommendations.push(`Increase crew allocation — current ${Math.round(resolutionRate)}% resolution rate requires at least 2× repair capacity to clear the ${pending}-pothole backlog.`);
  }
  recommendations.push(`Replicate ${bestWard} ward's repair workflow across underperforming zones to standardise response times.`);

  return { summary, issues, patterns, recommendations };
}
