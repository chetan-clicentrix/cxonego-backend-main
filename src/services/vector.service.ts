export class VectorService {
    /**
     * Generates a mock embedding for a given text.
     * In a real implementation, this would call an API like Gemini (embedding-001) or OpenAI.
     */
    async generateEmbedding(text: string): Promise<number[]> {
        // Simplified "embedding" for demonstration: character code distribution
        // This is a placeholder. Real embeddings are usually 768 or 1536 dims.
        const dim = 128;
        const embedding = new Array(dim).fill(0);
        const cleanText = text.toLowerCase().replace(/[^a-z0-9]/g, '');

        for (let i = 0; i < cleanText.length; i++) {
            const charCode = cleanText.charCodeAt(i);
            embedding[charCode % dim] += 1;
        }

        // Normalize the vector
        const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0)) || 1;
        return embedding.map(val => val / magnitude);
    }

    /**
     * Calculates cosine similarity between two vectors.
     */
    cosineSimilarity(vecA: number[], vecB: number[]): number {
        if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

        let dotProduct = 0;
        let magA = 0;
        let magB = 0;

        for (let i = 0; i < vecA.length; i++) {
            dotProduct += vecA[i] * vecB[i];
            magA += vecA[i] * vecA[i];
            magB += vecB[i] * vecB[i];
        }

        magA = Math.sqrt(magA);
        magB = Math.sqrt(magB);

        if (magA === 0 || magB === 0) return 0;
        return dotProduct / (magA * magB);
    }
}

export const vectorService = new VectorService();
