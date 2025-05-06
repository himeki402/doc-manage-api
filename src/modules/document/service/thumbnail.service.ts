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
          const uploadsDir = path.join(process.cwd(), 'uploads');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }

          // Tạo tên file tạm thời
          const tempPdfPath = path.join(uploadsDir, `temp-${Date.now()}.pdf`);
          const tempPngPath = path.join(uploadsDir, `temp-${Date.now()}.png`);

          // Ghi file PDF tạm thời
          fs.writeFileSync(tempPdfPath, file.buffer);

          // Sử dụng poppler để chuyển đổi trang đầu tiên của PDF sang PNG
          const options = {
            firstPageToConvert: 1,
            lastPageToConvert: 1,
            pngFile: true,
            scale: 300, // DPI cao hơn cho chất lượng tốt
          };

          await this.poppler.pdfToCairo(tempPdfPath, tempPngPath, options);

          // Đọc file PNG đã tạo
          const pngBuffer = fs.readFileSync(tempPngPath);

          // Tối ưu hóa hình ảnh với sharp
          const optimizedBuffer = await sharp(pngBuffer)
            .resize(600, 800, { fit: 'inside' })
            .jpeg({ quality: 80 })
            .toBuffer();

          // Xóa các file tạm
          fs.unlinkSync(tempPdfPath);
          fs.unlinkSync(tempPngPath);

          // Tải lên Cloudinary
          const cloudinaryResult =
            await this.cloudinaryService.uploadImage(optimizedBuffer);
          return { thumbnailUrl: cloudinaryResult.url };
        } catch (pdfError) {
          this.logger.error(
            `Lỗi khi tạo thumbnail từ PDF: ${pdfError.message}`,
            pdfError.stack,
          );
          // Nếu xử lý PDF thất bại, trả về thumbnail mặc định
          return {
            thumbnailUrl: `${process.env.APP_URL}/assets/default-thumbnails/pdf.png`,
          };
        }
      } else {
        // Trả về thumbnail mặc định cho các loại file khác
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
