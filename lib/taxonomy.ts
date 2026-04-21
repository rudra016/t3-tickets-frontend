// One-liner definitions for the T3 classification taxonomy. Surfaced as
// tooltips on Origin / Resolution badges so agents don't have to remember
// what a rarely-used label means.

export const ORIGIN_DESCRIPTIONS: Record<string, string> = {
  "All devices down": "Full system offline — no iPads, boards, or network",
  "All iPads down": "Every iPad kiosk offline at the property",
  "Some iPads down": "A subset of iPads offline; others working",
  "All boards down": "Every locker control board offline",
  "Some boards down": "A subset of control boards offline",
  "Locker issue": "Locker mechanical or software malfunction",
  "Locker door issue": "Door won't open, close, or is misaligned",
  "Camera issue": "Camera offline, blacked out, or misconfigured",
  "Room issue": "Package-room (not locker) problem",
  "Staff Concerns": "Property staff question or complaint, not a device failure",
  "Proactive Maintenance": "Planned check-in, install prep, or preventive work",
  "Delivery Issues": "Package delivery workflow problem",
  Other: "Doesn't fit any standard bucket",
};

export const RESOLUTION_DESCRIPTIONS: Record<string, string> = {
  "ISP Issues": "Root cause was the property's internet provider, not Luxer's system",
  "Explained to Staff": "Educated staff; no actual system change needed",
  "Scheduled Repair": "Field technician dispatched to fix hardware",
  "Checked Connectivity": "Verified the network was healthy; no real fix required",
  "Rebooted iPad": "Power-cycled the iPad kiosk",
  "Rebooted Control Board": "Power-cycled one or more locker control boards",
  "Rebooted Router/Switch": "Power-cycled networking hardware",
  "Reseated Adapters/Cables": "Unplugged and reseated physical connections",
  "Replaced Adapters": "Swapped in new power/USB adapters",
  "Replaced Backup Battery": "Swapped the APC battery backup unit",
  "Replaced SD Card": "Swapped the control-board SD card",
  "Replaced Board": "Swapped a full control board",
  "Deleted / Reinstalled App": "Reinstalled the iPad kiosk app",
  "Adjusted Admin Settings": "Changed config in the admin portal",
  "Checked Settings": "Verified admin/config state; no change made",
  "Updated iPad Settings": "Changed iOS/app settings on the iPad",
  "Replaced Decal": "Swapped the locker decal/label",
  "Monitoring Issue": "False alert from monitoring; nothing actually broken",
  "Power Issues": "Root cause was property power (outage, breaker, etc.)",
  "Sent Keys": "Shipped physical locker keys to the property",
  "Aged Out / Upgrade": "Hardware reached end-of-life; flagged for upgrade",
  "Escalate to Product team": "Couldn't resolve at T3; handed off to engineering",
  Other: "Doesn't fit any standard bucket",
};

export function describeOrigin(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return ORIGIN_DESCRIPTIONS[value];
}

export function describeResolution(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  return RESOLUTION_DESCRIPTIONS[value];
}
