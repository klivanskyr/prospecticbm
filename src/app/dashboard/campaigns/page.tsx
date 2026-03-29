import { redirect } from "next/navigation";

// Campaigns are now company-scoped. Redirect to the company list.
export default function CampaignsRedirectPage() {
  redirect("/dashboard");
}
