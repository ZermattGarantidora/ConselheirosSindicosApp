export type DocumentImprovement = Readonly<{
  draftId: string;
  baseEvent: number;
  baseHash: string;
  message: string;
  text: string;
  changes: string;
  status: "offered" | "accepted" | "declined";
}>;
