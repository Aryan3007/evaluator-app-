declare module 'react-native-image-to-pdf' {
    interface PDFOptions {
        imagePaths: string[];
        name: string;
        maxSize?: {
            width: number;
            height: number;
        };
        quality?: number; // 0.0 - 1.0
    }

    interface PDFResult {
        filePath: string;
    }

    const RNImageToPdf: {
        createPDFbyImages(options: PDFOptions): Promise<PDFResult>;
    };

    export default RNImageToPdf;
}
