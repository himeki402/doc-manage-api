import { Injectable, Logger } from '@nestjs/common';
import { CloudinaryService } from './cloudinary.service';
import * as fs from 'fs';
import * as path from 'path';
import * as sharp from 'sharp';
import { Poppler } from 'node-poppler';

@Injectable()
export class ThumbnailService {
  private readonly logger = new Logger(ThumbnailService.name);
  private readonly poppler: Poppler;

  constructor(private readonly cloudinaryService: CloudinaryService) {
    this.poppler = new Poppler();
  }

  async generateThumbnail(
    file: Express.Multer.File,
  ): Promise<{ thumbnailUrl: string; thumbnailKey?: string }> {
    try {
      const mimeType = file.mimetype;

      // Chỉ xử lý file PDF, các loại file khác trả về thumbnail mặc định
      if (mimeType === 'application/pdf') {
        try {
          // Tạo thư mục uploads nếu chưa tồn tại
          const uploadsDir = path.resolve(process.cwd(), 'uploads');
          this.logger.log(`Thư mục uploads: ${uploadsDir}`);

          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }

          const timestamp = Date.now();
          const tempPdfPath = path.join(uploadsDir, `temp-${timestamp}.pdf`);

          const tempPngBasePath = path.join(uploadsDir, `temp-${timestamp}`);

          fs.writeFileSync(tempPdfPath, file.buffer);

          if (!fs.existsSync(tempPdfPath)) {
            throw new Error(`Không thể tạo file PDF tạm thời: ${tempPdfPath}`);
          }

          // Sử dụng poppler để chuyển đổi trang đầu tiên của PDF sang PNG
          const options = {
            firstPageToConvert: 1,
            lastPageToConvert: 1,
            pngFile: true,
          };

          await this.poppler.pdfToCairo(tempPdfPath, tempPngBasePath, options);

          await new Promise((resolve) => setTimeout(resolve, 1000));

          const files = fs.readdirSync(uploadsDir);
          const pngFile = files.find(
            (file) =>
              file.startsWith(`temp-${timestamp}`) && file.endsWith('.png'),
          );

          if (!pngFile) {
            throw new Error(
              `Không thể tìm thấy file PNG được tạo từ ${tempPngBasePath}`,
            );
          }

          const actualPngFilePath = path.join(uploadsDir, pngFile);

          const pngBuffer = fs.readFileSync(actualPngFilePath);

          const optimizedBuffer = await sharp(pngBuffer)
            .resize(600, 800, { fit: 'inside' })
            .jpeg({ quality: 80 })
            .toBuffer();

          // Xóa các file tạm
          try {
            if (fs.existsSync(tempPdfPath)) {
              fs.unlinkSync(tempPdfPath);
            }
            if (fs.existsSync(actualPngFilePath)) {
              fs.unlinkSync(actualPngFilePath);
            }
          } catch (cleanupError) {
            this.logger.warn(`Lỗi khi xóa file tạm: ${cleanupError.message}`);
          }

          // Tải lên Cloudinary
          const cloudinaryResult =
            await this.cloudinaryService.uploadImage(optimizedBuffer);
          return { thumbnailUrl: cloudinaryResult.url };
        } catch (pdfError) {
          this.logger.error(
            `Lỗi khi tạo thumbnail từ PDF: ${pdfError.message}`,
            pdfError.stack,
          );
          return {
            thumbnailUrl: `${process.env.APP_URL}/assets/default-thumbnails/pdf.png`,
          };
        }
      } else {
        return {
          thumbnailUrl: `${process.env.APP_URL}/assets/default-thumbnails/${this.getDefaultThumbnail(
            mimeType,
          )}`,
        };
      }
    } catch (error) {
      this.logger.error(`Lỗi khi tạo thumbnail: ${error.message}`, error.stack);
      // Trả về thumbnail mặc định nếu có lỗi
      return {
        thumbnailUrl: `${process.env.APP_URL}/assets/default-thumbnails/document.png`,
      };
    }
  }

  private getDefaultThumbnail(mimeType: string): string {
    if (mimeType.includes('pdf')) return 'pdf.png';
    if (mimeType.includes('word')) return 'docx.png';
    if (mimeType.includes('text')) return 'text.png';
    return 'document.png';
  }
}
