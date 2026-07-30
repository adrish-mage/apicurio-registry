import { useState, useMemo } from "react";
import { CheckCircle2, XCircle, AlertTriangle, ArrowRight, Wrench } from "lucide-react";

const MOCK_TOOLS = [
  {
    name: "search_documents",
    title: "Search Documents",
    description: "Searches the document store and returns matching document IDs.",
    inputSchema: {
      properties: {
        query: { type: "string", description: "Search query text" },
        maxResults: { type: "integer", description: "Max results to return" },
      },
      required: ["query"],
    },
    outputSchema: {
      properties: {
        documentIds: { type: "array", description: "Matching document IDs" },
        totalCount: { type: "integer", description: "Total match count" },
      },
      required: ["documentIds"],
    },
  },
  {
    name: "fetch_document",
    title: "Fetch Document",
    description: "Fetches the full content of a document by ID.",
    inputSchema: {
      properties: {
        documentIds: { type: "array", description: "IDs of documents to fetch" },
      },
      required: ["documentIds"],
    },
    outputSchema: {
      properties: {
        content: { type: "string", description: "Full document content" },
        documentId: { type: "string", description: "The fetched document ID" },
      },
      required: ["content"],
    },
  },
  {
    name: "summarize_text",
    title: "Summarize Text",
    description: "Summarizes a block of text into a shorter form.",
    inputSchema: {
      properties: {
        text: { type: "string", description: "Text to summarize" },
        maxWords: { type: "integer", description: "Maximum summary length" },
      },
      required: ["text"],
    },
    outputSchema: {
      properties: {
        summary: { type: "string", description: "The generated summary" },
      },
      required: ["summary"],
    },
  },
  {
    name: "translate_text",
    title: "Translate Text",
    description: "Translates text into a target language.",
    inputSchema: {
      properties: {
        content: { type: "string", description: "Text to translate" },
        targetLanguage: { type: "string", description: "ISO language code" },
      },
      required: ["content", "targetLanguage"],
    },
    outputSchema: {
      properties: {
        translatedText: { type: "string", description: "Translated output" },
      },
      required: ["translatedText"],
    },
  },
];

function checkCompatibility(sourceTool, targetTool) {
  const outputProps = sourceTool.outputSchema?.properties || {};
  const requiredInputs = targetTool.inputSchema?.required || [];
  const inputProps = targetTool.inputSchema?.properties || {};

  const matched = [];
  const missing = [];
  const typeMismatches = [];

  requiredInputs.forEach((fieldName) => {
    const outField = outputProps[fieldName];
    const inField = inputProps[fieldName];
    if (!outField) {
      missing.push(fieldName);
    } else if (outField.type !== inField.type) {
      typeMismatches.push({ field: fieldName, outType: outField.type, inType: inField.type });
    } else {
      matched.push(fieldName);
    }
  });

  let status = "compatible";
  if (missing.length > 0 || typeMismatches.length > 0) {
    status = missing.length > 0 ? "incompatible" : "partial";
  }

  return { status, matched, missing, typeMismatches, requiredInputs };
}

const STATUS_STYLES = {
  compatible: { icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200", label: "Compatible" },
  partial: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", label: "Type mismatch" },
  incompatible: { icon: XCircle, color: "text-red-600", bg: "bg-red-50", border: "border-red-200", label: "Incompatible" },
};

function SchemaBadge({ type }) {
  return (
    <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
      {type}
    </span>
  );
}

function ToolCompatRow({ source, target }) {
  const result = useMemo(() => checkCompatibility(source, target), [source, target]);
  const style = STATUS_STYLES[result.status];
  const Icon = style.icon;

  return (
    <div className={`rounded-lg border ${style.border} ${style.bg} p-4`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-800">
          <Wrench size={14} className="text-slate-400" />
          {target.title}
          <span className="font-mono text-xs text-slate-400">{target.name}</span>
        </div>
        <div className={`flex items-center gap-1.5 text-sm font-medium ${style.color}`}>
          <Icon size={16} />
          {style.label}
        </div>
      </div>

      {result.requiredInputs.length === 0 ? (
        <p className="text-xs text-slate-500">This tool takes no required inputs.</p>
      ) : (
        <div className="space-y-1.5">
          {result.requiredInputs.map((field) => {
            const isMissing = result.missing.includes(field);
            const mismatch = result.typeMismatches.find((m) => m.field === field);
            return (
              <div key={field} className="flex items-center gap-2 text-xs">
                {isMissing ? (
                  <XCircle size={13} className="text-red-500 shrink-0" />
                ) : mismatch ? (
                  <AlertTriangle size={13} className="text-amber-500 shrink-0" />
                ) : (
                  <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                )}
                <span className="font-mono text-slate-700">{field}</span>
                {isMissing && <span className="text-red-500">— not produced by {source.name}</span>}
                {mismatch && (
                  <span className="flex items-center gap-1 text-amber-600">
                    <SchemaBadge type={mismatch.outType} /> <ArrowRight size={10} /> <SchemaBadge type={mismatch.inType} />
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function CompatibleToolsView() {
  const [sourceName, setSourceName] = useState(MOCK_TOOLS[0].name);
  const sourceTool = MOCK_TOOLS.find((t) => t.name === sourceName);
  const otherTools = MOCK_TOOLS.filter((t) => t.name !== sourceName);

  return (
    <div className="min-h-full bg-slate-50 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900 mb-1">Compatible Tools</h1>
          <p className="text-sm text-slate-500">
            Prototype for Apicurio Registry issue{" "}
            <a href="https://github.com/Apicurio/apicurio-registry/issues/8427" className="underline text-blue-600" target="_blank" rel="noreferrer">
              #8427
            </a>{" "}
            — given a tool's output schema, show which other registered tools can consume it as input.
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-5">
          <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
            Select source tool (output side)
          </label>
          <select
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            className="w-full border border-slate-300 rounded-md px-3 py-2 text-sm bg-white"
          >
            {MOCK_TOOLS.map((t) => (
              <option key={t.name} value={t.name}>
                {t.title} ({t.name})
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500 mt-2">{sourceTool.description}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {Object.entries(sourceTool.outputSchema.properties).map(([field, def]) => (
              <span key={field} className="text-[11px] font-mono bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-slate-600">
                {field}: {def.type}
              </span>
            ))}
          </div>
        </div>

        <h2 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
          Compatibility with other registered tools
        </h2>
        <div className="space-y-3">
          {otherTools.map((target) => (
            <ToolCompatRow key={target.name} source={sourceTool} target={target} />
          ))}
        </div>
      </div>
    </div>
  );
}
