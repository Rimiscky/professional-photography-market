import { requireChatGPTUser } from "../../../chatgpt-auth";
import { ImageUploadForm } from "../../../../components/images/image-upload-form";

export const dynamic = "force-dynamic";
export default async function NewPhotoPage(){await requireChatGPTUser("/studio/photos/nouvelle");return <ImageUploadForm/>}
