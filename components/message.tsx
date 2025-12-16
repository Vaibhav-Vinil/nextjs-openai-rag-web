import { MessageItem } from "@/lib/assistant";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import { Copy, Check, Share2 } from "lucide-react";
import { INITIAL_MESSAGE } from "@/config/constants";

// Function to process message content and extract product images
export const processMessageContent = (content: any[]): { text: string; productImage?: { src: string; link: string } } => {
  if (!content || !content[0]) {
    return { text: '' };
  }
  
  let text = content[0]?.text || '';
  let productImage: { src: string; link: string } | undefined = undefined;
  
  // Helper function to clean up text after extracting product info
  const cleanText = (text: string, jsonString: string) => {
    return text.replace(new RegExp(`\\s*${jsonString.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g'), '').trim();
  };
  
  // Try to find product image in annotations
  const productImgAnnotation = content[0]?.annotations?.find(
    (a: any) => a.type === 'file_citation' && a.text?.includes('"product_img":')
  );

  if (productImgAnnotation) {
    try {
      // First try to parse the entire annotation as JSON
      try {
        const annotationData = JSON.parse(productImgAnnotation.text);
        if (annotationData.product_img) {
          return {
            text,
            productImage: {
              src: annotationData.product_img,
              link: annotationData.product_url || annotationData.product_link || ''
            }
          };
        }
      } catch (e) {
        // If full JSON parse fails, fall back to regex matching
        const imgMatch = productImgAnnotation.text.match(/"product_img"\s*:\s*"([^"]+)"/);
        const urlMatch = productImgAnnotation.text.match(/"product_url"\s*:\s*"([^"]+)"/);
        const linkMatch = productImgAnnotation.text.match(/"product_link"\s*:\s*"([^"]+)"/);
        
        if (imgMatch) {
          // Prefer product_url, fall back to product_link, or use empty string
          const link = (urlMatch && urlMatch[1]) || (linkMatch && linkMatch[1]) || '';
          return {
            text,
            productImage: {
              src: imgMatch[1],
              link: link
            }
          };
        }
      }
    } catch (e) {
      console.error('Error parsing product image from annotation:', e);
    }
  }

  // Try to find product image in the text directly (JSON format)
  const jsonMatch = text.match(/\{[^\{\}]*"product_img"[^\{\}]*\}/);
  if (jsonMatch) {
    try {
      let imgData;
      // First try to parse the JSON directly
      try {
        imgData = JSON.parse(jsonMatch[0]);
      } catch (e) {
        // If direct parsing fails, try to fix potential JSON issues
        const fixedJson = jsonMatch[0]
          .replace(/([{\s,])(\w+)\s*:/g, '$1"$2":')
          .replace(/:\s*'([^']*)'/g, ': "$1"')
          .replace(/,/g, ', ');
        
        console.log('Fixed JSON:', fixedJson);
        imgData = JSON.parse(fixedJson);
      }

      if (imgData?.product_img) {
        console.log('Available keys in imgData:', Object.keys(imgData));
        
        // Get the best available link - prefer product_url, fall back to product_link, or use empty string
        let productLink = imgData.product_url || imgData.product_link || '';
        
        // If it's just a number, construct the URL with the ID (fallback)
        if (/^\d+$/.test(productLink)) {
          productLink = `https://pv.market/products/${productLink}`;
        } 
        // If it's not a full URL, make sure it's properly formatted
        else if (productLink && !productLink.startsWith('http')) {
          productLink = `https://pv.market/${productLink.replace(/^\/+/, '')}`;
        }
        
        console.log('Final productLink:', productLink);
        
        // Clean up the text by removing the JSON string
        const cleanedText = cleanText(text, jsonMatch[0]);
        
        return {
          text: cleanedText,
          productImage: {
            src: imgData.product_img,
            link: productLink
          }
        };
      }
    } catch (e) {
      console.error('Error processing product image data:', e);
    }
  }
  
  // If we get here, either no image was found or there was an error
  return { text };
};

interface MessageProps {
  message: MessageItem;
  messageIndex: number;
}

const Message: React.FC<MessageProps> = ({ message, messageIndex }) => {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);

  const { text, productImage } = processMessageContent(message.content);

  const handleCopy = async () => {
    const textToCopy = text;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      // Create a persistent snippet on the server and return a short id.
      const res = await fetch(`/api/snippets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });
      if (!res.ok) throw new Error("Failed to create snippet");
      const data = await res.json();
      const id = data.id;
      const shareUrl = `${window.location.origin}/share/${id}`;
      await navigator.clipboard.writeText(shareUrl);
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch (error) {
      console.error('Error sharing response snippet:', error);
    }
  };
  return (
    <div className="text-sm">
      {message.role === "user" ? (
        <div className="flex justify-end">
          <div>
            <div className="ml-4 rounded-2xl px-4 py-3 md:ml-24 bg-white/20 backdrop-blur-lg border border-white/30 text-stone-900 font-light shadow-lg">
              <div>
                <div>
                  <ReactMarkdown>
                    {text}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col group">
          <div className="flex">
            <div className="mr-4 rounded-2xl px-4 py-3 md:mr-24 text-black bg-white/20 backdrop-blur-lg border border-white/30 font-light flex-1 shadow-lg">
              <div>
                <div className="prose max-w-none">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={{
                      table: (props) => (
                        <div className="overflow-x-auto">
                          <table className="min-w-full border border-gray-200" {...props} />
                        </div>
                      ),
                    }}
                  >
                    {text}
                  </ReactMarkdown>
                  {productImage && (
                    <div className="mt-4">
                      <a 
                        href={productImage.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block"
                      >
                        <img 
                          src={productImage.src} 
                          alt="Product" 
                          className="max-w-full h-auto rounded-lg border border-gray-200 hover:shadow-lg transition-shadow"
                        />
                      </a>
                    </div>
                  )}
                </div>
                {/* Image display has been disabled */}
              </div>
            </div>
          </div>
          {/* Don't show copy/share buttons for the initial default assistant message */}
          {!(messageIndex === 0 &&
            typeof message.content[0].text === 'string' &&
            message.content[0].text.trim() === INITIAL_MESSAGE.trim()) && (
            <div className="flex gap-1">
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
              <button
                onClick={handleShare}
                className="self-start p-1.5 hover:bg-gray-100 rounded-md transition-opacity"
                title={shared ? "Link copied!" : "Share response"}
              >
                {shared ? (
                  <Check size={16} className="text-green-600" />
                ) : (
                  <Share2 size={16} className="text-gray-500" />
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Message;
