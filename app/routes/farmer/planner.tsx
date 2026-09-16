import { redirect } from "react-router";
import { listFields } from "~/lib/fields";

/**
 * "Plot planner" isn't its own screen — it's a shortcut into the real plot
 * planner, which is per-field (/farmer/fields/:fieldId, see field-detail.tsx).
 * Jump straight to the first field if there is one; otherwise send the
 * farmer to the fields list, which already explains how to add one.
 */
export async function clientLoader() {
  const fields = await listFields();
  if (fields.length > 0) {
    throw redirect(`/farmer/fields/${fields[0].id}`);
  }
  throw redirect("/farmer/fields");
}

export default function FarmerPlanner() {
  return null;
}
