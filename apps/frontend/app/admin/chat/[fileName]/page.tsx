import { ChatWithCV } from "@/components/chat-with-cv";

interface PageProps {
  params: {
    fileName: string;
  };
}

export default function ChatPage({ params }: PageProps) {
  return (
    <div className="container mx-auto p-4">
      <ChatWithCV initialFileName={params.fileName} />
    </div>
  );
}
