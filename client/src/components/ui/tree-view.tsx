import { useState } from "react";
import { ChevronRight, ChevronDown } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  data?: any;
  level: number;
  type: 'macroproceso' | 'proceso' | 'subproceso';
}

interface TreeViewProps {
  nodes: TreeNode[];
  selectedIds: Set<string>;
  onToggle: (nodeId: string, checked: boolean) => void;
  renderNodeInfo?: (node: TreeNode) => React.ReactNode;
}

interface TreeNodeItemProps {
  node: TreeNode;
  selectedIds: Set<string>;
  onToggle: (nodeId: string, checked: boolean) => void;
  renderNodeInfo?: (node: TreeNode) => React.ReactNode;
}

// Helper function to check if all leaf descendants are selected
function areAllDescendantsSelected(node: TreeNode, selectedIds: Set<string>): boolean {
  if (!node.children || node.children.length === 0) {
    // Leaf node - check if selected
    return selectedIds.has(node.id);
  }
  // Parent node - check if all children's descendants are selected
  return node.children.every(child => areAllDescendantsSelected(child, selectedIds));
}

// Helper function to check if some (but not all) descendants are selected
function areSomeDescendantsSelected(node: TreeNode, selectedIds: Set<string>): boolean {
  if (!node.children || node.children.length === 0) {
    return selectedIds.has(node.id);
  }
  return node.children.some(child => areSomeDescendantsSelected(child, selectedIds));
}

function TreeNodeItem({ node, selectedIds, onToggle, renderNodeInfo }: TreeNodeItemProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isSelected = selectedIds.has(node.id);

  // Check if all descendants are selected (recursively)
  const allChildrenSelected = hasChildren
    ? areAllDescendantsSelected(node, selectedIds)
    : false;

  // Check if some (but not all) descendants are selected
  const someChildrenSelected = hasChildren
    ? areSomeDescendantsSelected(node, selectedIds) && !allChildrenSelected
    : false;

  const handleToggle = () => {
    if (hasChildren) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleCheckboxChange = (checked: boolean | "indeterminate") => {
    // When user clicks on indeterminate checkbox, treat it as selecting (true)
    const newCheckedState = checked === "indeterminate" ? true : checked;
    onToggle(node.id, newCheckedState);
  };

  const indentClass = node.level === 0 ? "pl-0" : node.level === 1 ? "pl-8" : "pl-16";

  return (
    <div>
      <div
        className={cn(
          "flex items-center gap-2 py-2 hover:bg-muted/50 rounded-sm",
          indentClass
        )}
        data-testid={`tree-node-${node.id}`}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleToggle();
            }}
            className="p-1.5 hover:bg-muted rounded touch-manipulation"
            data-testid={`button-expand-${node.id}`}
          >
            {isExpanded ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronRight className="h-5 w-5" />
            )}
          </button>
        ) : (
          <div className="w-8" />
        )}

        <div 
          className="p-1 -m-1 touch-manipulation cursor-pointer select-none flex items-center"
          onClick={(e) => {
            e.stopPropagation();
            const newState = !(isSelected || allChildrenSelected);
            handleCheckboxChange(newState);
          }}
          onMouseDown={(e) => {
            // Prevent text selection when clicking
            e.preventDefault();
          }}
        >
          <Checkbox
            checked={isSelected || allChildrenSelected}
            ref={(input) => {
              if (input) {
                (input as any).indeterminate = someChildrenSelected;
              }
            }}
            onCheckedChange={(checked) => {
              handleCheckboxChange(checked);
            }}
            data-testid={`checkbox-${node.id}`}
            className={cn(
              allChildrenSelected && "data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600",
              "cursor-pointer"
            )}
            onClick={(e) => {
              // Stop propagation to prevent double-toggling
              e.stopPropagation();
            }}
          />
        </div>

        <div
          className={cn(
            "flex-1 flex items-center justify-between min-w-0",
            hasChildren && "cursor-pointer"
          )}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) {
              handleToggle();
            }
          }}
        >
          <span className={cn(
            "font-medium",
            node.level === 0 && "text-base font-semibold",
            node.level === 1 && "text-sm font-medium",
            node.level === 2 && "text-sm"
          )}>
            {node.label}
          </span>

          {renderNodeInfo && (
            <div className="flex items-center gap-2 flex-shrink-0">
              {renderNodeInfo(node)}
            </div>
          )}
        </div>
      </div>

      {hasChildren && isExpanded && (
        <div>
          {node.children!.map((child) => (
            <TreeNodeItem
              key={child.id}
              node={child}
              selectedIds={selectedIds}
              onToggle={onToggle}
              renderNodeInfo={renderNodeInfo}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function TreeView({ nodes, selectedIds, onToggle, renderNodeInfo }: TreeViewProps) {
  return (
    <div className="space-y-1">
      {nodes.map((node) => (
        <TreeNodeItem
          key={node.id}
          node={node}
          selectedIds={selectedIds}
          onToggle={onToggle}
          renderNodeInfo={renderNodeInfo}
        />
      ))}
    </div>
  );
}

export type { TreeNode };
