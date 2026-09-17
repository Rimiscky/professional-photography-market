import { requireChatGPTUser } from "../../chatgpt-auth";
import { ProfileEditor } from "../../../components/onboarding/profile-editor";

export const dynamic = "force-dynamic";

export default async function StudioProfilePage() {
  const user = await requireChatGPTUser("/studio/profil");
  return <ProfileEditor email={user.email} initialName={user.fullName ?? ""}/>;
}
