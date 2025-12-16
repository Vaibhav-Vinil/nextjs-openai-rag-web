import { MessageItem } from "@/lib/assistant";
import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from 'remark-gfm';
import { Copy, Check, Share2 } from "lucide-react";
import { INITIAL_MESSAGE } from "@/config/constants";

// Function to process message content and extract product images
export const processMessageContent = (content: any[]): { 
  text: string | React.ReactNode[];
  productImage?: { src: string; link: string }; 
  productImages?: Array<{src: string; link: string; position: number}>;
} => {
  if (!content || !content[0]) {
    return { text: '' };
  }
  
  let text = content[0]?.text || '';
  let productImage: { src: string; link: string } | undefined = undefined;
  const productImages: Array<{src: string; link: string; position: number}> = [];
  
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

  // Process the text to find and handle image placeholders
  try {
    const parts: (string | React.ReactNode)[] = [];
    let lastIndex = 0;
    
    // Find all image placeholders in the text
    const imageMatches = [...text.matchAll(/\{[^\{\}]*"product_img"[^\{\}]*\}/g)];
    
    if (imageMatches.length > 0) {
      for (const match of imageMatches) {
        try {
          // Add text before the match
          if (match.index !== undefined && match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
          }
          
          // Parse the image data
          let imgData;
          try {
            imgData = JSON.parse(match[0]);
          } catch (e) {
            // If direct parsing fails, try to fix potential JSON issues
            const fixedJson = match[0]
              .replace(/([{\s,])(\w+)\s*:/g, '$1"$2":')
              .replace(/:\s*'([^']*)'/g, ': "$1"')
              .replace(/,/g, ', ');
            imgData = JSON.parse(fixedJson);
          }
          
          if (imgData?.product_img) {
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
            
            // Add image component at this position
            parts.push(
              <div key={parts.length} className="my-4">
                <a 
                  href={productLink} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-block"
                >
                  <img 
                    src={imgData.product_img} 
                    alt="Product" 
                    className="max-w-full h-auto max-h-80 rounded-lg border border-gray-200 hover:shadow-lg transition-shadow"
                  />
                </a>
              </div>
            );
            
            // Store the image data for backward compatibility
            if (!productImage) {
              productImage = {
                src: imgData.product_img,
                link: productLink
              };
            }
            
            productImages.push({
              src: imgData.product_img,
              link: productLink,
              position: match.index || 0
            });
          }
          
          // Update the last index
          if (match.index !== undefined) {
            lastIndex = match.index + match[0].length;
          }
        } catch (e) {
          console.error('Error processing image data:', e);
          // If there's an error, include the original text
          if (match.index !== undefined) {
            parts.push(text.substring(lastIndex, match.index + match[0].length));
            lastIndex = match.index + match[0].length;
          }
        }
      }
      
      // Add any remaining text after the last match
      if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
      }
      
      // If we found any product images, return the parts array
      if (parts.length > 0) {
        return {
          text: parts,
          productImage,
          productImages
        };
      }
    }
  } catch (e) {
    console.error('Error in processMessageContent:', e);
  }
  
  // If we get here, either no image was found or there was an error
  return { text };
}

interface MessageProps {
  message: MessageItem;
  messageIndex: number;
}

const Message: React.FC<MessageProps> = ({ message, messageIndex }) => {
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  
  const { text, productImage, productImages } = processMessageContent(message.content);
  const imagesToShow = productImages || (productImage ? [productImage] : []);

  const handleCopy = async () => {
    // Convert text to string if it's a ReactNode array
    const textToCopy = Array.isArray(text) 
      ? text.map(part => typeof part === 'string' ? part : '').join('') 
      : text;
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = async () => {
    try {
      // Convert text to string if it's a ReactNode array
      const contentToShare = Array.isArray(text)
        ? text.map(part => typeof part === 'string' ? part : '').join('')
        : text;
      
      // Create a persistent snippet on the server and return a short id.
      const res = await fetch(`/api/snippets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: contentToShare }),
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
                  {typeof text === 'string' ? (
                    <ReactMarkdown>
                      {text}
                    </ReactMarkdown>
                  ) : (
                    <div>{text}</div>
                  )}
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
                  {Array.isArray(text) ? (
                    // If text is an array (contains React nodes), render them directly
                    <div className="prose max-w-none">
                      {text.map((part, i) => (
                        <React.Fragment key={i}>
                          {typeof part === 'string' ? (
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
                              {part}
                            </ReactMarkdown>
                          ) : (
                            part
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  ) : (
                    // Fallback for plain text (shouldn't happen with the new processing)
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
