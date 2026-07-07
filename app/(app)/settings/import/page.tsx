import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/supabase/auth";
import { ImportWizard } from "@/components/import/import-wizard";

export default async function ImportPage() {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/login");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold">Import Fitbit Data</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Export your data at{" "}
          <a
            href="https://takeout.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            takeout.google.com
          </a>{" "}
          (Fitbit category only), then drop the ZIP below. Re-importing
          overlapping dates is safe — nothing gets duplicated.
        </p>
      </div>
      <ImportWizard />
    </div>
  );
}
