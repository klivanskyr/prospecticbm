import { serve } from "inngest/next";
import { inngest } from "@/lib/inngest/client";
import {
  runCampaign,
  discoverAndSendToProspect,
  resetDailyQuotas,
} from "@/lib/inngest/functions";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [runCampaign, discoverAndSendToProspect, resetDailyQuotas],
});
