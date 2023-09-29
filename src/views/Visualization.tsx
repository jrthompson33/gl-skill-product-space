import React, { useState, useCallback, useMemo } from 'react';

import * as d3 from 'd3';
import { ProductEdge, ProductMetadata, ProductNode } from '../core/data';

export interface VisualizationProps {
    nodes: ProductNode[];
    edges: ProductEdge[];
    metadata: ProductMetadata[];
}

const MARGIN = {
    LEFT: 30,
    RIGHT: 30,
    TOP: 30,
    BOTTOM: 30
}

const hs92ColorsMap = new Map<string, string>([
    ['product-HS92-1', 'rgb(125, 218, 161)'],
    ['product-HS92-2', '#F5CF23'],
    ['product-HS92-3', 'rgb(218, 180, 125)'],
    ['product-HS92-4', 'rgb(187, 150, 138)'],
    ['product-HS92-5', 'rgb(217, 123, 123)'],
    ['product-HS92-6', 'rgb(197, 123, 217)'],
    ['product-HS92-7', 'rgb(141, 123, 216)'],
    ['product-HS92-8', 'rgb(123, 162, 217)'],
    ['product-HS92-9', 'rgb(125, 218, 218)'],
    ['product-HS92-10', '#2a607c'],
    ['product-HS92-14', 'rgb(178, 61, 109)'],
]);

const filterToBackOfArray = (array: any[], condition: (a: any) => boolean) => {
    const arrayMeetsCondition = array.filter(condition),
        arrayNotMeetsCondition = array.filter(a => !condition(a));
    return [...arrayNotMeetsCondition, ...arrayMeetsCondition];
}

export const Visualization = (props: VisualizationProps) => {
    const { nodes, edges, metadata } = props;

    const [nodeHighlighted, setNodeHighlighted] = useState<string | undefined>(undefined);

    const xExtent = useMemo(() => d3.extent(nodes, n => n.x), [nodes]),
        yExtent = useMemo(() => d3.extent(nodes, n => n.y), [nodes]);

    // TODO optimize to handle screen size changes
    // TODO Have the SVG fit the width / height of the DOM
    // TODO Use that dimensions here to draw node/links well
    const width = 900,
        height = 500;

    const xScale = useMemo(() => d3.scaleLinear().domain(xExtent as [number, number]).range([0, width - MARGIN.LEFT - MARGIN.RIGHT]), [xExtent]),
        yScale = useMemo(() => d3.scaleLinear().domain(yExtent as [number, number]).range([0, height - MARGIN.TOP - MARGIN.BOTTOM]), [yExtent]);

    const delaunay = useMemo(() => d3.Delaunay.from(nodes, n => xScale(Number(n.x)), n => yScale(Number(n.y))), [nodes]);



    const handleMouseMove = useCallback((event: React.MouseEvent) => {
        const eventTarget = event.target as SVGElement;
        const rect = eventTarget.getBoundingClientRect();

        const xProjected = event.clientX - rect.left - MARGIN.LEFT,
            yProjected = event.clientY - rect.top - MARGIN.TOP;

        const nIndex = delaunay.find(xProjected, yProjected);

        setNodeHighlighted(nodes[nIndex].productId);
    }, [delaunay, nodes, setNodeHighlighted]);

    const mapNodes = useMemo(() => new Map<string, ProductNode>(nodes.map(n => [n.productId, n])), [nodes]);
    const mapMetadata = useMemo(() => new Map<string, ProductMetadata>(metadata.map(m => [m.productId, m])), [metadata]);
    const mapNeighbors = useMemo(() => new Map<string, string[]>(nodes.map(n => {
        const connectedEdges = edges.filter(e => e.source === n.productId || e.target === n.productId);
        const neighborSet = new Set(connectedEdges.map(e => e.source === n.productId ? e.target : e.source));

        return [n.productId, Array.from(neighborSet)];
    })), [nodes, edges]);

    const neighborsHighlighted = useMemo(() => nodeHighlighted ? mapNeighbors.get(nodeHighlighted) : [], [mapNeighbors, nodeHighlighted]);

    const isHighlightedCondition = useCallback((n: ProductNode) => {
        return nodeHighlighted === n.productId || (!!neighborsHighlighted && neighborsHighlighted.indexOf(n.productId) > -1);
    }, [nodeHighlighted, neighborsHighlighted]);

    const highlighted = useMemo(() => nodeHighlighted ? mapNodes.get(nodeHighlighted) : undefined, [mapNodes, nodeHighlighted]);
    const highlightedMetadata = useMemo(() => nodeHighlighted ? mapMetadata.get(nodeHighlighted) : undefined, [mapMetadata, nodeHighlighted]);

    if (nodes && edges && nodes.length > 0 && edges.length > 0) {
        // Wish list: 
        // Run bee swarm cluster to lay out all the nodes with null x and y
        // Add a legend for all the colors
        // Add a title specifying numbers of nodes

        // TODO don't cast to Number as that will 0 out nulls


        const circleNodes = filterToBackOfArray(nodes, isHighlightedCondition)
            .map((n: ProductNode, i: number) => {
                const isHighlighted = isHighlightedCondition(n);
                const nMeta = mapMetadata.get(n.productId)
                const productSector = nMeta?.productSector.productId;
                const fill = productSector ? hs92ColorsMap.get(productSector) : '#CCCCCC';
                return (<circle key={`node-${i}`} className={`node-circle${(isHighlighted ? ' highlighted' : '')}`} cx={xScale(Number(n.x))} cy={yScale(Number(n.y))} r='4' style={{ fill }} />);
            });

        const lineEdges = filterToBackOfArray(edges, e => mapNodes.get(e.source)?.productId === nodeHighlighted || mapNodes.get(e.target)?.productId === nodeHighlighted)
            .map((e: ProductEdge, i: number) => {
                const sourceNode = mapNodes.get(e.source),
                    targetNode = mapNodes.get(e.target);
                if (sourceNode && targetNode) {
                    const isHighlighted = sourceNode.productId === nodeHighlighted || targetNode.productId === nodeHighlighted;
                    if (sourceNode.x && sourceNode.y && targetNode.x && targetNode.y) {
                        return <path key={`link-${i}`} className={`edge-line${isHighlighted ? ' highlighted' : ''}`} d={`M${[xScale(sourceNode.x), yScale(sourceNode.y)]}L${[xScale(targetNode.x), yScale(targetNode.y)]}`} />;
                    } else {
                        // TODO update this to use the temporary x and y
                        return undefined;
                    }
                } else {
                    console.error(`Nodes in edge could not be found in data.`, e, sourceNode, targetNode);
                    return undefined;
                }
            });

        // Create tooltip to render on highlight
        const tooltip = (
            <div className='tooltip-container tooltip-right' aria-hidden='true'
                style={!highlighted ?
                    { visibility: 'hidden' } :
                    { visibility: 'visible', left: `${xScale(Number(highlighted.x)) + MARGIN.LEFT}px`, top: `${yScale(Number(highlighted.y)) + MARGIN.RIGHT}px` }}>
                <div className='tooltip' style={{ transform: `translate(0px, 50%)` }}>
                    <div className='tooltip-inner'>
                        <span className='tooltip-name'>{`${highlightedMetadata?.productName} (${highlightedMetadata?.productCode})`}</span>
                        <div className='tooltip-series'>
                            <div>
                                <span className='tooltip-series-legend' style={{ background: (hs92ColorsMap.get(highlightedMetadata?.productSector.productId + '') ? hs92ColorsMap.get(highlightedMetadata?.productSector.productId + '') : '#CCCCCC') }}></span>
                                <span className='tooltip-series-sector'>{highlightedMetadata?.productSector.productId}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );


        return (
            <div style={{ height: '500px', width: '900px', margin: 'auto', position: 'relative' }}>
                {tooltip}
                <svg width={width} height={height}>
                    <g transform={`translate(${[MARGIN.LEFT, MARGIN.TOP]})`}>
                        <g>
                            {lineEdges}
                        </g>
                        <g>
                            {circleNodes}
                        </g>
                    </g>
                    <rect
                        className='visualization-hover'
                        width={width}
                        height={height}
                        onMouseMove={handleMouseMove} />
                </svg>
            </div>
        )
    } else {
        // Loading here
        return <svg></svg>
    }





}
