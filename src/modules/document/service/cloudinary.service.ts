import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
    this.logger.log('Cloudinary đã được cấu hình');
  }

  async uploadImage(
    buffer: Buffer,
    folder: string = 'document-thumbnails',
  ): Promise<{ url: string; public_id: string }> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          format: 'webp',
          transformation: [
            {
              width: 400,
              height: 600,
              crop: 'limit',
              quality: 'auto:good',
              fetch_format: 'webp',
            },
          ],
        },
        (error, result) => {
          if (error) {
            this.logger.error(
              `Lỗi khi upload lên Cloudinary: ${error.message}`,
              error.stack,
            );
            return reject(new Error(error.message));
          }

          this.logger.log(
            `Upload thành công lên Cloudinary. Public ID: ${result?.public_id}`,
          );
          this.logger.log(`URL hình ảnh: ${result?.secure_url}`);

          resolve({
            url: result?.secure_url ?? '',
            public_id: result?.public_id ?? '',
          });
        },
      );

      this.logger.log('Đang chuyển buffer thành stream để upload...');
      const readableStream = new Readable({
        read() {
          this.push(buffer);
          this.push(null);
        },
      });

      readableStream.pipe(uploadStream);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    this.logger.log(
      `Bắt đầu xóa hình ảnh từ Cloudinary. Public ID: ${publicId}`,
    );

    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Đã xóa thành công hình ảnh với Public ID: ${publicId}`);
    } catch (error) {
      this.logger.error(
        `Lỗi khi xóa hình ảnh từ Cloudinary: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
