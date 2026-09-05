"use client";

import { addVisibilitySnapshot } from "@/app/local-visibility/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActionState, useState } from "react";

const METRIC_OPTIONS = [
  { value: "map_pack_position", label: "Map-pack position (for a keyword)" },
  { value: "profile_views", label: "Profile views (GBP Insights)" },
  { value: "search_views", label: "Search views (GBP Insights)" },
  { value: "website_clicks", label: "Website clicks (GBP Insights)" },
  { value: "call_clicks", label: "Call clicks (GBP Insights)" },
  { value: "direction_requests", label: "Direction requests (GBP Insights)" },
];

const selectClassName =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AddVisibilitySnapshotForm({ businessId }: { businessId: string }) {
  const [state, formAction, isPending] = useActionState(addVisibilitySnapshot, null);
  const [metricType, setMetricType] = useState(METRIC_OPTIONS[0]!.value);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="businessId" value={businessId} />
      <div className="space-y-1.5">
        <Label htmlFor="visibility-metric-type">Metric</Label>
        <select
          id="visibility-metric-type"
          name="metricType"
          className={selectClassName}
          value={metricType}
          onChange={(event) => setMetricType(event.target.value)}
        >
          {METRIC_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      {metricType === "map_pack_position" ? (
        <div className="space-y-1.5">
          <Label htmlFor="visibility-keyword">Keyword searched</Label>
          <Input id="visibility-keyword" name="keyword" maxLength={200} placeholder="e.g. dentist in Makati" />
        </div>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="visibility-value">Value</Label>
        <Input id="visibility-value" name="value" type="number" step="any" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="visibility-notes">Notes (optional)</Label>
        <Input id="visibility-notes" name="notes" maxLength={500} />
      </div>
      {state?.error ? (
        <p role="alert" className="text-destructive text-sm">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" size="sm" disabled={isPending}>
        {isPending ? "Saving..." : "Log snapshot"}
      </Button>
    </form>
  );
}
