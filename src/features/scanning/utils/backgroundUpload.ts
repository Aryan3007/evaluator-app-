import ReactNativeBlobUtil from 'react-native-blob-util';
import axios from '../../../core/api/axios';

interface BackgroundUploadParams {
    images: string[];
    subjectName: string;
    subjectCode: string;
    pdfName: string;
    onSuccess: (pdfName: string) => void;
    onError: (error: string, pdfName: string) => void;
}

interface PresignedUpload {
    base_url: string;
    fields: Record<string, string>;
    url: string;
}

async function uploadImageToS3(
    imagePath: string,
    presignedData: PresignedUpload,
    fileName: string,
): Promise<void> {
    const filePath = imagePath.replace('file://', '');

    const multipartData: Array<{ name: string; data: string; filename?: string; type?: string }> = [
        ...Object.entries(presignedData.fields).map(([key, value]) => ({
            name: key,
            data: value,
        })),
        {
            name: 'file',
            filename: fileName,
            type: 'image/jpeg',
            data: ReactNativeBlobUtil.wrap(filePath),
        },
    ];

    const response = await ReactNativeBlobUtil.fetch(
        'POST',
        presignedData.base_url,
        { 'Content-Type': 'multipart/form-data' },
        multipartData,
    );

    if (response.respInfo.status >= 400) {
        throw new Error(`S3 upload failed for ${fileName}: ${response.respInfo.status}`);
    }
}

export async function backgroundUpload(params: BackgroundUploadParams): Promise<void> {
    const { images, subjectName, subjectCode, pdfName, onSuccess, onError } = params;

    try {
        // ── Step 1: Get presigned URLs for all images ──
        const imageFiles = images.map((_, index) => ({
            file_name: `${pdfName.replace('.pdf', '')}_page${index + 1}.jpg`,
            file_type: 'image/jpeg',
        }));

        console.log(`[Upload] Requesting presigned URLs for ${images.length} images...`);

        const presignedResponse = await axios.post('/api/files/presigned-upload', {
            subject_name: subjectName,
            paper_code: subjectCode,
            files: imageFiles,
        });

        if (!presignedResponse.data.success || !presignedResponse.data.uploads) {
            throw new Error('Failed to get presigned URLs');
        }

        const uploads: PresignedUpload[] = presignedResponse.data.uploads;
        console.log(`[Upload] Got ${uploads.length} presigned URLs`);

        // ── Step 2: Upload all images to S3 in parallel ──
        console.log(`[Upload] Uploading ${images.length} images to S3 in parallel...`);

        await Promise.all(
            images.map((imagePath, index) =>
                uploadImageToS3(imagePath, uploads[index], imageFiles[index].file_name),
            ),
        );

        console.log(`[Upload] All images uploaded to S3`);

        // ── Step 3: Call image-upload API — backend creates PDF ──
        const imageUrls = uploads.map((u) => u.url);

        console.log(`[Upload] Calling image-upload API for "${pdfName}"...`);

        await axios.post('/api/files/image-upload', {
            subject_name: subjectName,
            paper_code: subjectCode,
            files: [
                {
                    file_name: pdfName,
                    image_urls: imageUrls,
                },
            ],
        });

        console.log(`[Upload] Done: "${pdfName}"`);
        onSuccess(pdfName);
    } catch (error: unknown) {
        const err = error as Record<string, any>;
        console.error(`[Upload] Failed:`, err?.response?.data || err?.message || error);
        const message =
            err?.response?.data?.message || err?.message || 'Upload failed';
        onError(message, pdfName);
    }
}
