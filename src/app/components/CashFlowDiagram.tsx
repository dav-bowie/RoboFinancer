import { memo, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  Position,
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
      className={`rounded-lg border px-3 py-2 min-w-[140px] shadow-sm transition-all ${
        TONE_STYLES[tone]
      } ${selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""} ${
        isHub ? "min-w-[160px]" : ""
      } ${data.editable ? "cursor-pointer hover:border-primary/50" : ""}`}
    >
      <Handle type="target" position={Position.Left} className="!bg-border !border-border !w-2 !h-2" />
      <div className={`text-[10px] uppercase tracking-wide opacity-80 ${isHub ? "text-primary" : ""}`}>
        {data.label}
      </div>
      <div className={`font-mono ${isHub || isResult ? "text-lg" : "text-sm"} text-foreground`}>
        {fmtCurrency(data.monthly)}
        <span className="text-[10px] text-muted-foreground ml-1">/mo</span>
      </div>
      {data.pctOfTakeHome != null && data.kind !== "source" && data.kind !== "hub" && (
        <div className="text-[10px] text-muted-foreground font-mono">{data.pctOfTakeHome}% of take-home</div>
      )}
      <Handle type="source" position={Position.Right} className="!bg-border !border-border !w-2 !h-2" />
    </div>
  );
}

const nodeTypes = { cashFlow: memo(CashFlowNode) };

export function CashFlowDiagram({ state, selectedNodeId, onSelectNode }: Props) {
  const { nodes, edges } = useMemo(() => buildCashFlowGraph(state), [state]);
  const reconciliation = useMemo(() => validateReconciliation(state), [state]);

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

  return (
    <div className="space-y-3">
      <div
        className={`rounded-lg border px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs ${
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

      <div className="rounded-lg border border-border bg-[#0a0a0c] h-[520px] overflow-hidden">
        <ReactFlow
          nodes={styledNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodeClick={onNodeClick}
          onPaneClick={() => onSelectNode(null)}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.4}
          maxZoom={1.2}
          proOptions={{ hideAttribution: true }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable
        >
          <Background color="#27272e" gap={20} size={1} />
          <Controls
            showInteractive={false}
            className="!bg-card !border-border !shadow-md [&>button]:!bg-secondary [&>button]:!border-border [&>button]:!text-foreground"
          />
        </ReactFlow>
      </div>

      <p className="text-[11px] text-muted-foreground">
        Click or press Enter on an editable line-item node to adjust its monthly amount in the editor panel. Edge labels show dollar flow
        per month.
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
