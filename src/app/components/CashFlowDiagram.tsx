import { memo, useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
  useReactFlow,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { fmtCurrency } from "../../lib/calculations";
import {
  buildCashFlowGraph,
  type CashFlowNodeData,
  type CashFlowState,
  validateReconciliation,
} from "../../lib/cashFlowModel";

interface Props {
  state: CashFlowState;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string | null) => void;
  showSummary?: boolean;
}

const TONE_STYLES: Record<NonNullable<CashFlowNodeData["tone"]>, string> = {
  neutral: "border-border bg-card text-foreground",
  positive: "border-emerald-500/40 bg-emerald-500/10 text-emerald-400",
  negative: "border-red-500/30 bg-red-500/5 text-red-300",
  warning: "border-amber-500/40 bg-amber-500/10 text-amber-400",
};

function CashFlowNode({ data, selected, id }: NodeProps<Node<CashFlowNodeData>>) {
  const tone = data.tone ?? "neutral";
  const isHub = data.kind === "hub";
  const isResult = data.kind === "result";
  const isLineItem = data.kind === "lineItem";

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!data.editable || !data.onSelect) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      (data.onSelect as (nodeId: string) => void)(id);
    }
  };

  return (
    <div
      role={data.editable ? "button" : undefined}
      tabIndex={data.editable ? 0 : undefined}
      aria-label={data.editable ? `${data.label}: ${fmtCurrency(data.monthly)} per month. Press Enter to edit.` : undefined}
      onKeyDown={handleKeyDown}
      className={`rounded-lg border shadow-sm transition-all ${
        isLineItem ? "px-2 py-1.5 min-w-[108px] max-w-[120px]" : "px-3 py-2 min-w-[132px]"
      } ${TONE_STYLES[tone]} ${selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""} ${
        isHub ? "min-w-[152px]" : ""
      } ${data.editable ? "cursor-pointer hover:border-primary/50" : ""}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-border !border-border !w-2 !h-2" />
      <div
        className={`uppercase tracking-wide opacity-80 truncate ${
          isLineItem ? "text-[9px]" : "text-[10px]"
        } ${isHub ? "text-primary" : ""}`}
        title={data.label}
      >
        {data.label}
      </div>
      <div
        className={`font-mono text-foreground ${
          isHub || isResult ? "text-base" : isLineItem ? "text-xs" : "text-sm"
        }`}
      >
        {fmtCurrency(data.monthly)}
        <span className="text-[9px] text-muted-foreground ml-0.5">/mo</span>
      </div>
      {data.pctOfTakeHome != null && !isLineItem && data.kind !== "source" && data.kind !== "hub" && (
        <div className="text-[9px] text-muted-foreground font-mono">{data.pctOfTakeHome}% of take-home</div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-border !border-border !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = { cashFlow: memo(CashFlowNode) };

function FitViewOnChange({ deps }: { deps: unknown[] }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    const timer = window.setTimeout(() => {
      fitView({ padding: 0.12, maxZoom: 1, minZoom: 0.35 });
    }, 50);
    return () => window.clearTimeout(timer);
  }, deps);
  return null;
}

export function FlowSummaryBar({ state }: { state: CashFlowState }) {
  const reconciliation = useMemo(() => validateReconciliation(state), [state]);

  return (
    <div
      className={`rounded-lg border px-4 py-3 flex flex-wrap items-center justify-between gap-2 text-xs ${
        reconciliation.balanced
          ? "border-emerald-500/30 bg-emerald-500/5"
          : reconciliation.surplus < 0
            ? "border-red-500/30 bg-red-500/5"
            : "border-amber-500/30 bg-amber-500/5"
      }`}
    >
      <span className="text-muted-foreground">
        Take-home {fmtCurrency(reconciliation.monthlyTakeHome)}/mo · Spending{" "}
        {fmtCurrency(reconciliation.totalSpending)}/mo
      </span>
      <span
        className={`font-mono font-medium ${
          reconciliation.surplus >= 0 ? "text-emerald-400" : "text-red-400"
        }`}
      >
        {reconciliation.surplus >= 0 ? "Surplus" : "Shortage"}: {fmtCurrency(Math.abs(reconciliation.surplus))}/mo
      </span>
    </div>
  );
}

export function CashFlowDiagram({ state, selectedNodeId, onSelectNode, showSummary = true }: Props) {
  const graph = useMemo(() => buildCashFlowGraph(state), [state]);
  const { nodes, edges, height } = graph;

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node<CashFlowNodeData>) => {
      if (node.data.editable) onSelectNode(node.id);
      else onSelectNode(null);
    },
    [onSelectNode],
  );

  const styledNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
        data: {
          ...n.data,
          onSelect: n.data.editable ? onSelectNode : undefined,
        },
      })),
    [nodes, selectedNodeId, onSelectNode],
  );

  const canvasHeight = Math.min(Math.max(height, 380), 720);

  return (
    <div className="space-y-3 min-w-0">
      {showSummary && <FlowSummaryBar state={state} />}

      <div
        className="rounded-lg border border-border bg-[#0a0a0c] overflow-hidden w-full"
        style={{ height: canvasHeight }}
      >
        <ReactFlow
          nodes={styledNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={() => onSelectNode(null)}
          minZoom={0.3}
          maxZoom={1.1}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
          panOnScroll
          zoomOnScroll={false}
        >
          <FitViewOnChange deps={[height, styledNodes.length, selectedNodeId]} />
          <Background color="#27272e" gap={20} size={1} />
          <Controls
            showInteractive={false}
            className="!bg-card !border-border !shadow-md [&>button]:!bg-secondary [&>button]:!border-border [&>button]:!text-foreground"
          />
        </ReactFlow>
      </div>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Click or press Enter on a line-item node to edit it in the panel on the left. Use zoom controls if the diagram
        feels tight.
      </p>

      <table className="sr-only">
        <caption>Monthly cash flow summary</caption>
        <thead>
          <tr>
            <th scope="col">Node</th>
            <th scope="col">Monthly</th>
          </tr>
        </thead>
        <tbody>
          {nodes.map((n) => (
            <tr key={n.id}>
              <td>{n.data.label}</td>
              <td>{fmtCurrency(n.data.monthly)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
