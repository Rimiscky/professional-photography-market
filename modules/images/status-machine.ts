export const imageStatuses = ["DRAFT", "UPLOADING", "PROCESSING", "READY", "PENDING_REVIEW", "PUBLISHED", "UNPUBLISHED", "REJECTED", "ARCHIVED", "ERROR"] as const;
export type ImageStatus = (typeof imageStatuses)[number];

const transitions: Record<ImageStatus, readonly ImageStatus[]> = {
  DRAFT: ["UPLOADING", "PROCESSING", "ARCHIVED"], UPLOADING: ["PROCESSING", "ERROR"],
  PROCESSING: ["READY", "ERROR"], READY: ["PROCESSING", "PENDING_REVIEW", "PUBLISHED", "ARCHIVED"],
  PENDING_REVIEW: ["PUBLISHED", "REJECTED", "UNPUBLISHED"], PUBLISHED: ["UNPUBLISHED", "ARCHIVED"],
  UNPUBLISHED: ["PROCESSING", "PUBLISHED", "ARCHIVED"], REJECTED: ["PROCESSING", "DRAFT", "ARCHIVED"],
  ARCHIVED: [], ERROR: ["PROCESSING", "ARCHIVED"],
};

export function canTransitionImage(from: ImageStatus, to: ImageStatus) { return transitions[from].includes(to); }
export function assertImageTransition(from: ImageStatus, to: ImageStatus) { if (!canTransitionImage(from, to)) throw new Error(`INVALID_IMAGE_TRANSITION:${from}:${to}`); }
