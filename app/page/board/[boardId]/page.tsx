import { BoardPageContent } from "../BoardPageContent";

type Props = { params: Promise<{ boardId: string }> };

export default async function BoardPage({ params }: Props) {
  const { boardId } = await params;
  return <BoardPageContent boardId={boardId} />;
}
