import { requireChatGPTUser } from "../../chatgpt-auth";
import { PhotographerOnboarding } from "../../../components/onboarding/photographer-onboarding";

export const dynamic = "force-dynamic";

export default async function PhotographerOnboardingPage() {
  const user = await requireChatGPTUser("/onboarding/photographe");
  return <PhotographerOnboarding email={user.email} displayName={user.fullName ?? ""}/>;
}
