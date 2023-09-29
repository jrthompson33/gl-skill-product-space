export interface ProductNode {
    productId: string;
    x: number | null;
    y: number | null;
}

export interface ProductEdge {
    source: string;
    target: string;
}

export interface ProductMetadata {
    productId: string,
    productName: string,
    productCode: string,
    productSector: {
        productId: string,
    }
}