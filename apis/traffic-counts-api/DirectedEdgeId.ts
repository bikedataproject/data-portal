export class DirectedEdgeId {
    private directedEdgeId: number;

    constructor(directedEdgeId: number) {
        this.directedEdgeId = directedEdgeId;
    }

    Id(): number {
        return this.directedEdgeId;
    }

    IsForward(): boolean {
        return this.directedEdgeId > 0;
    }

    EdgeId(): number {
        if (this.directedEdgeId > 0) {
            return this.directedEdgeId - 1;
        } else {
            return (-this.directedEdgeId) - 1;
        }
    }

    Invert(): DirectedEdgeId {
        return new DirectedEdgeId(-this.directedEdgeId);
    }

    static ToDirectedEdgeId(edgeId: number, forward: boolean): DirectedEdgeId {
        if (forward) {
            return new DirectedEdgeId(edgeId + 1);
        } else {
            return new DirectedEdgeId(-(edgeId + 1));
        }
    }   
}