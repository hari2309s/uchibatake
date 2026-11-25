import { clashes, cropById } from "@uchibatake/content";
import type { Planting, Space } from "./data/types";

/**
 * The companion ひとこと (03b, 04): a growing plant in the chosen space that
 * gardeners say doesn't get on with this crop. Traditional lore, worded as such.
 */
export function companionNote(cropId: string, space: Space | undefined, plantings: Planting[]): string | null {
  if (!space) return null;
  const crop = cropById(cropId);
  const neighbour = plantings.find((p) => p.status === "growing" && p.space_id === space.id && p.crop_id && clashes(cropId, p.crop_id));
  if (!crop || !neighbour) return null;
  const other = cropById(neighbour.crop_id!)!.name.toLowerCase();
  return `Your ${other} grows in the ${space.name.toLowerCase()} too, and gardeners have long said ${crop.name.toLowerCase()} and ${other} don't get on. Plant at the far end, a good stride away, or in another space.`;
}
