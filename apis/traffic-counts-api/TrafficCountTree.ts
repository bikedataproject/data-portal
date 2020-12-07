import { TreeEdge } from "./TreeEdge";

export class TrafficCountTree {
    count: number
    directedEdgeId: number
    originTree: { [key:number]:TreeEdge; }
    destinationTree: { [key:number]:TreeEdge; }

    constructor(directedEdgeId: number, count: number, originTree: { [key:number]:TreeEdge; }, destinationTree: { [key:number]:TreeEdge; }) {
        this.directedEdgeId = directedEdgeId;
        this.count = count;
        this.originTree = originTree;
        this.destinationTree = destinationTree;
    }
}