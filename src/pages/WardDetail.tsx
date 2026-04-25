import { useParams, Link } from "react-router-dom";
import { getWard } from "@/lib/bengaluru-data";
import { fetchPotholes } from "@/lib/api";
import { Pothole } from "../../backend/src/models/types";
import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, MapPin, Navigation, Calendar, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { SeverityBadge } from "@/components/SeverityBadge";
import { PotholeStatusBadge } from "@/components/PotholeStatusBadge";

export default function WardDetail() {
  const { id } = useParams();
  const { lang } = useI18n();

  const ward = id ? getWard(id) : null;
  const [dbPotholes, setDbPotholes] = useState<Pothole[]>([]);
  useEffect(() => {
    fetchPotholes().then(res => setDbPotholes(res.potholes)).catch(console.error);
  }, []);

  const wardPotholes = dbPotholes.filter((p) => p.wardId === id);

  if (!ward) return <div className="p-8">Ward not found.</div>;

  return (
    <div className="p-4 lg:p-8 max-w-5xl mx-auto space-y-5 animate-fade-in pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link to={-1 as any}><ChevronLeft className="h-5 w-5" /></Link>
        </Button>
        <div>
          <h1 className="text-xl lg:text-2xl font-display font-bold">
            Ward {ward.number} - {ward.name}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">Pothole Logs & Status ({wardPotholes.length} total)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {wardPotholes.map((p) => {
          const mapLink = `https://www.google.com/maps/dir/?api=1&destination=${p.position.lat},${p.position.lng}`;

          return (
            <Card key={p.id} className="p-4 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <SeverityBadge severity={p.severity} className="text-[10px] px-2 py-0.5" />
                  <PotholeStatusBadge pothole={p} />
                </div>

                <h3 className="font-semibold text-base mb-1 truncate flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {p.road}
                </h3>

                <div className="space-y-1.5 mt-3">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <AlertCircle className="h-3.5 w-3.5" />
                    <span>{p.reports} Citizen Reports</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" />
                    <span>Reported: {new Date(p.reportedAt).toLocaleDateString()}</span>
                  </div>
                  {p.daysOpen > 0 && (
                    <div className="text-xs text-muted-foreground ml-5.5 pl-5">
                      Days Open: <span className="font-bold">{p.daysOpen}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-5 pt-3 border-t border-border">
                <Button variant="outline" size="sm" asChild className="w-full gap-2 rounded-lg hover:bg-primary/10 hover:text-primary hover:border-primary/50 transition-colors">
                  <a href={mapLink} target="_blank" rel="noopener noreferrer">
                    <Navigation className="h-4 w-4" /> Get Directions
                  </a>
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
