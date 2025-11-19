import { MessageItem } from "@/lib/assistant";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import { Copy, Check } from "lucide-react";

// Function to remove inline citation links from text
const removeInlineCitations = (text: string): string => {
  // Remove markdown citation links like ([domain.com](url)) but preserve the line break
  return text.replace(/\s*\(\[([^\]]+)\]\([^)]+\)\)(\s*\n)?/g, '$2');
};

interface MessageProps {
  message: MessageItem;
}

const Message: React.FC<MessageProps> = ({ message }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const text = removeInlineCitations(message.content[0].text as string);
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="text-sm">
      {message.role === "user" ? (
        <div className="flex justify-end">
          <div>
            <div className="ml-4 rounded-[16px] px-4 py-2 md:ml-24 bg-[#ededed] text-stone-900  font-light">
              <div>
                <div>
                  <ReactMarkdown>
                    {removeInlineCitations(message.content[0].text as string)}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col group">
          <div className="flex">
            <div className="mr-4 rounded-[16px] px-4 py-2 md:mr-24 text-black bg-white font-light flex-1">
              <div>
                <div className="prose max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: ({ node, ...props }) => (
                        <div className="overflow-x-auto">
                          <table className="min-w-full border border-gray-200" {...props} />
                        </div>
                      ),
                    }}
                  >
                    {removeInlineCitations(message.content[0].text as string)}
                  </ReactMarkdown>
                </div>
                {/* Image display has been disabled */}
              </div>
            </div>
          </div>
          <button
            onClick={handleCopy}
            className="self-start p-1.5 hover:bg-gray-100 rounded-md transition-opacity"
            title={copied ? "Copied!" : "Copy response"}
          >
            {copied ? (
              <Check size={16} className="text-green-600" />
            ) : (
              <Copy size={16} className="text-gray-500" />
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default Message;
