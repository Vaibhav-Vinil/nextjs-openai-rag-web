import { ExternalLinkIcon } from "lucide-react";

export type Annotation = {
  type: "file_citation" | "url_citation" | "container_file_citation";
  fileId?: string;
  containerId?: string;
  url?: string;
  title?: string;
  filename?: string;
  index?: number;
};

export function Annotations({ annotations }: { annotations: Annotation[] }) {
  if (!annotations || annotations.length === 0) return null;
  
  return (
    <div className="mt-2 space-y-2 text-sm text-gray-500">
      <div className="font-medium">Source References:</div>
      <div className="space-y-1">
        {annotations.map((annotation, i) => (
          <div key={i} className="rounded border border-gray-200 p-2 text-xs">
            {annotation.title && (
              <div className="font-semibold">{annotation.title}</div>
            )}
            {annotation.url && (
              <a 
                href={annotation.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline flex items-center gap-1"
              >
                {annotation.url}
                <ExternalLinkIcon size={12} />
              </a>
            )}
            {annotation.filename && (
              <div className="text-gray-600">{annotation.filename}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Annotations;
