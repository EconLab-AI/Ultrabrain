/**
 * KnowledgeGraphView - 3D force-directed knowledge graph visualization
 *
 * Renders observations, files, sessions, projects, and tags as an
 * interactive 3D graph using @react-three/fiber.
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Text } from '@react-three/drei';
import * as THREE from 'three';

interface GraphNode {
  id: string;
  type: 'file' | 'observation' | 'session' | 'project' | 'tag';
  label: string;
  metadata?: Record<string, any>;
}

interface GraphEdge {
  source: string;
  target: string;
  type: string;
  weight?: number;
}

interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

interface NodePosition {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

const NODE_COLORS: Record<string, string> = {
  file: '#4fc3f7',
  observation: '#81c784',
  session: '#ffb74d',
  project: '#e57373',
  tag: '#ba68c8',
};

const LEGEND_ITEMS = [
  { type: 'file', label: 'File', color: NODE_COLORS.file },
  { type: 'observation', label: 'Observation', color: NODE_COLORS.observation },
  { type: 'session', label: 'Session', color: NODE_COLORS.session },
  { type: 'project', label: 'Project', color: NODE_COLORS.project },
  { type: 'tag', label: 'Tag', color: NODE_COLORS.tag },
];

// Force simulation parameters
const REPULSION = 50;
const SPRING_K = 0.02;
const SPRING_LENGTH = 5;
const DAMPING = 0.92;
const SETTLE_THRESHOLD = 0.01;

interface SimulationState {
  positions: Map<string, NodePosition>;
  settled: boolean;
}

function initializePositions(nodes: GraphNode[]): Map<string, NodePosition> {
  const positions = new Map<string, NodePosition>();
  const radius = Math.max(nodes.length * 0.5, 10);

  nodes.forEach((node, i) => {
    // Distribute on a sphere
    const phi = Math.acos(-1 + (2 * i) / Math.max(nodes.length, 1));
    const theta = Math.sqrt(nodes.length * Math.PI) * phi;

    positions.set(node.id, {
      x: radius * Math.cos(theta) * Math.sin(phi) + (Math.random() - 0.5) * 2,
      y: radius * Math.sin(theta) * Math.sin(phi) + (Math.random() - 0.5) * 2,
      z: radius * Math.cos(phi) + (Math.random() - 0.5) * 2,
      vx: 0,
      vy: 0,
      vz: 0,
    });
  });

  return positions;
}

function GraphNode3D({
  node,
  position,
  connectionCount,
  isSelected,
  onClick,
}: {
  node: GraphNode;
  position: [number, number, number];
  connectionCount: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = NODE_COLORS[node.type] || '#ffffff';
  const baseSize = 0.3 + Math.min(connectionCount * 0.1, 0.7);
  const size = isSelected ? baseSize * 1.3 : baseSize;

  return (
    <group position={position}>
      <mesh ref={meshRef} onClick={(e) => { e.stopPropagation(); onClick(); }}>
        <sphereGeometry args={[size, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={isSelected ? color : '#000000'}
          emissiveIntensity={isSelected ? 0.5 : 0}
        />
      </mesh>
      <Text
        position={[0, size + 0.4, 0]}
        fontSize={0.35}
        color="#c9d1d9"
        anchorX="center"
        anchorY="bottom"
        maxWidth={6}
      >
        {node.label.length > 20 ? node.label.slice(0, 18) + '...' : node.label}
      </Text>
    </group>
  );
}

function Edges({ edges, positions }: { edges: GraphEdge[]; positions: Map<string, NodePosition> }) {
  const lineGeometry = useMemo(() => {
    const points: number[] = [];

    for (const edge of edges) {
      const source = positions.get(edge.source);
      const target = positions.get(edge.target);
      if (!source || !target) continue;

      points.push(source.x, source.y, source.z);
      points.push(target.x, target.y, target.z);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
    return geometry;
  }, [edges, positions]);

  return (
    <lineSegments geometry={lineGeometry}>
      <lineBasicMaterial color="#30363d" opacity={0.4} transparent />
    </lineSegments>
  );
}

function ForceGraph({
  graphData,
  selectedNodeId,
  onSelectNode,
}: {
  graphData: GraphData;
  selectedNodeId: string | null;
  onSelectNode: (id: string | null) => void;
}) {
  const simulationRef = useRef<SimulationState>({
    positions: initializePositions(graphData.nodes),
    settled: false,
  });
  const [renderTick, setRenderTick] = useState(0);

  // Recompute adjacency on data change
  const adjacency = useMemo(() => {
    const adj = new Map<string, Set<string>>();
    for (const edge of graphData.edges) {
      if (!adj.has(edge.source)) adj.set(edge.source, new Set());
      if (!adj.has(edge.target)) adj.set(edge.target, new Set());
      adj.get(edge.source)!.add(edge.target);
      adj.get(edge.target)!.add(edge.source);
    }
    return adj;
  }, [graphData.edges]);

  const connectionCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const [id, neighbors] of adjacency) {
      counts.set(id, neighbors.size);
    }
    return counts;
  }, [adjacency]);

  // Reinitialize positions when graph data changes
  useEffect(() => {
    simulationRef.current = {
      positions: initializePositions(graphData.nodes),
      settled: false,
    };
  }, [graphData.nodes]);

  // Force simulation in useFrame
  useFrame(() => {
    const sim = simulationRef.current;
    if (sim.settled) return;

    const positions = sim.positions;
    const nodeIds = [...positions.keys()];
    let maxVelocity = 0;

    // Repulsion between all pairs
    for (let i = 0; i < nodeIds.length; i++) {
      const a = positions.get(nodeIds[i])!;
      for (let j = i + 1; j < nodeIds.length; j++) {
        const b = positions.get(nodeIds[j])!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = a.z - b.z;
        const distSq = dx * dx + dy * dy + dz * dz + 0.01;
        const force = REPULSION / distSq;
        const dist = Math.sqrt(distSq);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;

        a.vx += fx;
        a.vy += fy;
        a.vz += fz;
        b.vx -= fx;
        b.vy -= fy;
        b.vz -= fz;
      }
    }

    // Spring attraction along edges
    for (const edge of graphData.edges) {
      const a = positions.get(edge.source);
      const b = positions.get(edge.target);
      if (!a || !b) continue;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) + 0.01;
      const displacement = dist - SPRING_LENGTH;
      const force = SPRING_K * displacement;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fz = (dz / dist) * force;

      a.vx += fx;
      a.vy += fy;
      a.vz += fz;
      b.vx -= fx;
      b.vy -= fy;
      b.vz -= fz;
    }

    // Apply velocities and damping
    for (const id of nodeIds) {
      const p = positions.get(id)!;
      p.vx *= DAMPING;
      p.vy *= DAMPING;
      p.vz *= DAMPING;
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;

      const velocity = Math.sqrt(p.vx * p.vx + p.vy * p.vy + p.vz * p.vz);
      maxVelocity = Math.max(maxVelocity, velocity);
    }

    if (maxVelocity < SETTLE_THRESHOLD) {
      sim.settled = true;
    }

    setRenderTick(t => t + 1);
  });

  const positions = simulationRef.current.positions;

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[20, 20, 20]} intensity={0.8} />

      <Edges edges={graphData.edges} positions={positions} />

      {graphData.nodes.map(node => {
        const pos = positions.get(node.id);
        if (!pos) return null;

        return (
          <GraphNode3D
            key={node.id}
            node={node}
            position={[pos.x, pos.y, pos.z]}
            connectionCount={connectionCounts.get(node.id) || 0}
            isSelected={selectedNodeId === node.id}
            onClick={() => onSelectNode(selectedNodeId === node.id ? null : node.id)}
          />
        );
      })}

      <OrbitControls enableDamping dampingFactor={0.1} />
    </>
  );
}

interface KnowledgeGraphViewProps {
  currentProject?: string;
  projects?: string[];
  onProjectChange?: (project: string) => void;
}

export function KnowledgeGraphView({ currentProject, projects, onProjectChange }: KnowledgeGraphViewProps) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterProject, setFilterProject] = useState(currentProject || '');

  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !graphData) return null;
    return graphData.nodes.find(n => n.id === selectedNodeId) || null;
  }, [selectedNodeId, graphData]);

  const selectedEdges = useMemo(() => {
    if (!selectedNodeId || !graphData) return [];
    return graphData.edges.filter(e => e.source === selectedNodeId || e.target === selectedNodeId);
  }, [selectedNodeId, graphData]);

  const fetchGraph = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filterProject) params.set('project', filterProject);
      params.set('limit', '150');

      const res = await fetch(`/api/graph?${params.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
      const data = await res.json();
      setGraphData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filterProject]);

  useEffect(() => {
    fetchGraph();
  }, [fetchGraph]);

  useEffect(() => {
    if (currentProject !== undefined) {
      setFilterProject(currentProject);
    }
  }, [currentProject]);

  return (
    <div style={styles.container}>
      {/* Controls Bar */}
      <div style={styles.controlsBar}>
        <div style={styles.controlsLeft}>
          <h2 style={styles.heading}>Knowledge Graph</h2>
          {projects && projects.length > 0 && (
            <select
              style={styles.projectSelect}
              value={filterProject}
              onChange={(e) => {
                setFilterProject(e.target.value);
                if (onProjectChange) onProjectChange(e.target.value);
              }}
            >
              <option value="">All Projects</option>
              {projects.map(p => (
                <option key={p} value={p}>{p.split('/').pop()}</option>
              ))}
            </select>
          )}
          <button style={styles.refreshBtn} onClick={fetchGraph}>
            Refresh
          </button>
        </div>

        {/* Legend */}
        <div style={styles.legend}>
          {LEGEND_ITEMS.map(item => (
            <div key={item.type} style={styles.legendItem}>
              <div style={{ ...styles.legendDot, backgroundColor: item.color }} />
              <span style={styles.legendLabel}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Main content area */}
      <div style={styles.graphArea}>
        {loading && (
          <div style={styles.overlay}>
            <span style={styles.overlayText}>Loading graph data...</span>
          </div>
        )}

        {error && (
          <div style={styles.overlay}>
            <span style={styles.errorText}>Error: {error}</span>
          </div>
        )}

        {graphData && graphData.nodes.length === 0 && !loading && (
          <div style={styles.overlay}>
            <span style={styles.overlayText}>No data to display. Try a different project or add more observations.</span>
          </div>
        )}

        {graphData && graphData.nodes.length > 0 && (
          <Canvas
            camera={{ position: [0, 0, 30], fov: 60 }}
            style={{ background: '#0d1117' }}
            onPointerMissed={() => setSelectedNodeId(null)}
          >
            <ForceGraph
              graphData={graphData}
              selectedNodeId={selectedNodeId}
              onSelectNode={setSelectedNodeId}
            />
          </Canvas>
        )}

        {/* Detail Panel */}
        {selectedNode && (
          <div style={styles.detailPanel}>
            <div style={styles.detailHeader}>
              <div style={{ ...styles.detailTypeBadge, backgroundColor: NODE_COLORS[selectedNode.type] || '#666' }}>
                {selectedNode.type}
              </div>
              <button style={styles.detailClose} onClick={() => setSelectedNodeId(null)}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
            <div style={styles.detailTitle}>{selectedNode.label}</div>
            {selectedNode.metadata && Object.keys(selectedNode.metadata).length > 0 && (
              <div style={styles.detailMeta}>
                {Object.entries(selectedNode.metadata).map(([key, value]) => (
                  <div key={key} style={styles.detailMetaRow}>
                    <span style={styles.detailMetaKey}>{key}:</span>
                    <span style={styles.detailMetaValue}>{String(value)}</span>
                  </div>
                ))}
              </div>
            )}
            <div style={styles.detailEdges}>
              <div style={styles.detailEdgesTitle}>Connections ({selectedEdges.length})</div>
              {selectedEdges.slice(0, 10).map((edge, i) => {
                const otherId = edge.source === selectedNodeId ? edge.target : edge.source;
                const otherNode = graphData?.nodes.find(n => n.id === otherId);
                return (
                  <div key={i} style={styles.detailEdgeRow}>
                    <span style={styles.detailEdgeType}>{edge.type}</span>
                    <span
                      style={styles.detailEdgeTarget}
                      onClick={() => setSelectedNodeId(otherId)}
                    >
                      {otherNode?.label || otherId}
                    </span>
                  </div>
                );
              })}
              {selectedEdges.length > 10 && (
                <div style={styles.detailEdgeMore}>+{selectedEdges.length - 10} more</div>
              )}
            </div>
          </div>
        )}

        {/* Stats */}
        {graphData && (
          <div style={styles.stats}>
            {graphData.nodes.length} nodes, {graphData.edges.length} edges
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    overflow: 'hidden',
  },
  controlsBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    background: '#161b22',
    borderBottom: '1px solid #30363d',
    flexWrap: 'wrap',
    gap: '8px',
  },
  controlsLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  heading: {
    margin: 0,
    fontSize: '16px',
    fontWeight: 600,
    color: '#c9d1d9',
  },
  projectSelect: {
    background: '#21262d',
    border: '1px solid #30363d',
    borderRadius: '6px',
    color: '#c9d1d9',
    padding: '4px 8px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  refreshBtn: {
    background: '#21262d',
    border: '1px solid #30363d',
    borderRadius: '6px',
    color: '#c9d1d9',
    padding: '4px 12px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  legend: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  legendDot: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
  },
  legendLabel: {
    color: '#8b949e',
    fontSize: '12px',
  },
  graphArea: {
    flex: 1,
    position: 'relative',
    minHeight: 0,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0d1117',
    zIndex: 10,
  },
  overlayText: {
    color: '#8b949e',
    fontSize: '14px',
  },
  errorText: {
    color: '#f85149',
    fontSize: '14px',
  },
  detailPanel: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    width: '280px',
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '8px',
    padding: '12px',
    zIndex: 20,
    maxHeight: 'calc(100% - 24px)',
    overflowY: 'auto',
  },
  detailHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
  },
  detailTypeBadge: {
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    color: '#0d1117',
    textTransform: 'uppercase' as const,
  },
  detailClose: {
    background: 'none',
    border: 'none',
    color: '#8b949e',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
  },
  detailTitle: {
    color: '#c9d1d9',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '8px',
    wordBreak: 'break-all' as const,
  },
  detailMeta: {
    marginBottom: '12px',
    padding: '8px',
    background: '#0d1117',
    borderRadius: '4px',
  },
  detailMetaRow: {
    display: 'flex',
    gap: '8px',
    marginBottom: '4px',
    fontSize: '12px',
  },
  detailMetaKey: {
    color: '#8b949e',
    flexShrink: 0,
  },
  detailMetaValue: {
    color: '#c9d1d9',
    wordBreak: 'break-all' as const,
  },
  detailEdges: {
    borderTop: '1px solid #30363d',
    paddingTop: '8px',
  },
  detailEdgesTitle: {
    color: '#8b949e',
    fontSize: '12px',
    fontWeight: 600,
    marginBottom: '6px',
  },
  detailEdgeRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '4px',
    fontSize: '12px',
  },
  detailEdgeType: {
    color: '#8b949e',
    background: '#21262d',
    padding: '1px 4px',
    borderRadius: '3px',
    fontSize: '10px',
    flexShrink: 0,
  },
  detailEdgeTarget: {
    color: '#58a6ff',
    cursor: 'pointer',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  detailEdgeMore: {
    color: '#8b949e',
    fontSize: '11px',
    marginTop: '4px',
  },
  stats: {
    position: 'absolute',
    bottom: '12px',
    left: '12px',
    color: '#484f58',
    fontSize: '12px',
    zIndex: 5,
  },
};
