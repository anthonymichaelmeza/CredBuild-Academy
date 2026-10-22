import { privateJson } from "@/modules/http/requests";
export async function POST() {
  return privateJson(
    {
      error: "Content administration is not enabled. No content was published.",
    },
    { status: 403 },
  );
}
