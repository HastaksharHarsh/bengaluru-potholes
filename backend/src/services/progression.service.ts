// ─── Progression Service — Cluster severity trend analysis ──────────────────
// Analyses nearby potholes (within a radius) and determines if severity scores
// have been growing over time — indicating a deteriorating road segment.

import { findNearbyPotholes } from "./pothole.service";
import { getTrafficScore, type TrafficData } from "./traffic.service";
import type { Pothole, Severity } from "../models/types";

export interface ProgressionResult {
    clusterSize: number;             // # of potholes in the area
    trend: "worsening" | "stable" | "improving";
    trendScore: number;              // -100 to +100 (positive = worsening)
    avgSeverityScore: number;        // current cluster avg
    earliestReport: string;          // ISO date of first report in cluster
    latestReport: string;            // ISO date of most recent report
    timelineEntries: Array<{
        id: string;
        reportedAt: string;
        severityScore: number;
        severity: Severity;
    }>;
    riskLabel: "Critical Hotspot" | "Deteriorating" | "Stable" | "Recovering";
    liveTraffic?: TrafficData;       // current traffic at the cluster location
}

/**
 * Analyse progression for potholes clustered near a location.
 * @param lat  Latitude of the target point
 * @param lng  Longitude of the target point
 * @param radiusMeters  Radius to consider for clustering (default 50m)
 */
export async function getClusterProgression(
    lat: number,
    lng: number,
    radiusMeters = 50
): Promise<ProgressionResult> {
    const [nearby, liveTraffic] = await Promise.all([
        findNearbyPotholes(lat, lng, radiusMeters),
        getTrafficScore(lat, lng)
    ]);

    // Sort chronologically (oldest first)
    const sorted = [...nearby].sort(
        (a, b) => new Date(a.reportedAt).getTime() - new Date(b.reportedAt).getTime()
    );

    if (sorted.length === 0) {
        return {
            clusterSize: 0,
            trend: "stable",
            trendScore: 0,
            avgSeverityScore: 0,
            earliestReport: "",
            latestReport: "",
            timelineEntries: [],
            riskLabel: "Stable",
            liveTraffic,
        };
    }

    const timelineEntries = sorted.map((p) => ({
        id: p.id,
        reportedAt: p.reportedAt,
        severityScore: p.severityScore,
        severity: p.severity,
    }));

    const avgSeverityScore = Math.round(
        sorted.reduce((sum, p) => sum + p.severityScore, 0) / sorted.length
    );

    // ─── Compute Trend Score ─────────────────────────────────────────────────
    // We use weighted linear regression of severityScore over time.
    // Positive slope = worsening, negative = improving.
    let trendScore = 0;

    if (sorted.length >= 2) {
        const t0 = new Date(sorted[0].reportedAt).getTime();
        const points = sorted.map((p) => ({
            // Normalise time to days since first report
            t: (new Date(p.reportedAt).getTime() - t0) / (1000 * 60 * 60 * 24) || 0.01,
            s: p.severityScore,
        }));

        // Simple least-squares slope: Σ((t - t̄)(s - s̄)) / Σ((t - t̄)²)
        const tMean = points.reduce((a, p) => a + p.t, 0) / points.length;
        const sMean = points.reduce((a, p) => a + p.s, 0) / points.length;

        let num = 0;
        let den = 0;
        for (const p of points) {
            num += (p.t - tMean) * (p.s - sMean);
            den += (p.t - tMean) ** 2;
        }

        const slope = den !== 0 ? num / den : 0;

        // Normalise slope to -100..+100 range
        // A slope of +5 severity-points/day is extreme worsening → cap at ±100
        trendScore = Math.max(-100, Math.min(100, Math.round(slope * 20)));

        // Also boost trend score if the cluster itself is growing rapidly
        // (many reports in a short window = rapid deterioration signal)
        const spanDays = points[points.length - 1].t;
        if (spanDays > 0 && sorted.length >= 3) {
            const density = sorted.length / spanDays; // reports/day
            const densityBoost = Math.min(20, Math.round(density * 5));
            trendScore = Math.max(-100, Math.min(100, trendScore + densityBoost));
        }
    } else {
        // Single report — use its severity score as a baseline indicator
        trendScore = sorted[0].severityScore >= 60 ? 20 : 0;
    }

    // ─── Classify ────────────────────────────────────────────────────────────
    let trend: ProgressionResult["trend"];
    let riskLabel: ProgressionResult["riskLabel"];

    if (trendScore >= 30) {
        trend = "worsening";
        riskLabel = sorted.length >= 4 && avgSeverityScore >= 60 ? "Critical Hotspot" : "Deteriorating";
    } else if (trendScore <= -20) {
        trend = "improving";
        riskLabel = "Recovering";
    } else {
        trend = "stable";
        riskLabel = "Stable";
    }

    return {
        clusterSize: sorted.length,
        trend,
        trendScore,
        avgSeverityScore,
        earliestReport: sorted[0].reportedAt,
        latestReport: sorted[sorted.length - 1].reportedAt,
        timelineEntries,
        riskLabel,
        liveTraffic,
    };
}
