import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Key, MapPin } from "lucide-react";

import { env } from "@/config/env";

const KEY_NAME = "gmaps_key";

export function useGoogleMapsKey() {
  const [key, setKey] = useState<string>(() => env.MAP_API_KEY || localStorage.getItem(KEY_NAME) || "");
  useEffect(() => {
    if (key && key !== env.MAP_API_KEY) localStorage.setItem(KEY_NAME, key);
  }, [key]);
  return { key, setKey };
}

export function GoogleMapsKeyPrompt({ onSave }: { onSave: (k: string) => void }) {
  const [val, setVal] = useState("");
  return (
    <Card className="p-8 max-w-xl mx-auto shadow-elegant border-2 border-dashed">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl gradient-monsoon flex items-center justify-center text-white shrink-0">
          <MapPin className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-display font-semibold mb-1">Connect Google Maps</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Paste your Google Maps JavaScript API key to enable the live Bengaluru map, heatmaps, and geocoding.
            Your key is stored locally in your browser only.
          </p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Key className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="AIza…"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button onClick={() => val && onSave(val.trim())} disabled={!val}>
              Save Key
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Get one at{" "}
            <a
              href="https://console.cloud.google.com/google/maps-apis/credentials"
              target="_blank"
              rel="noreferrer"
              className="text-primary underline"
            >
              Google Cloud Console
            </a>{" "}
            — enable Maps JavaScript API, Places, and Geocoding.
          </p>
        </div>
      </div>
    </Card>
  );
}
