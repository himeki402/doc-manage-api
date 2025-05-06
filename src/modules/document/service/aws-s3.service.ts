import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  ObjectCannedACL,
} from '@aws-sdk/client-s3';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AwsS3Service {
  private s3Client: S3Client;
  private readonly logger = new Logger(AwsS3Service.name);

  constructor(private configService: ConfigService) {
    const region = this.configService.get<string>('AWS_REGION');
    const accessKeyId = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    const secretAccessKey = this.configService.get<string>(
      'AWS_SECRET_ACCESS_KEY',
    );

    if (!region || !accessKeyId || !secretAccessKey) {
      throw new BadRequestException(
        'AWS credentials or region are not configured properly',
      );
    }

    this.s3Client = new S3Client({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'documents',
  ): Promise<{
    key: string;
    url: string;
  }> {
    try {
      if (!file || !file.buffer) {
        throw new BadRequestException('File buffer is required');
      }
      if (!['application/pdf'].includes(file.mimetype)) {
        throw new BadRequestException('Only PDF files are allowed');
      }
      if (file.size > 10 * 1024 * 1024) {
        throw new BadRequestException('File size exceeds 10MB');
      }

      const fileExtension = file.originalname.split('.').pop();
      const key = `${folder}/${uuid()}.${fileExtension}`;
      const bucket = this.configService.get<string>('AWS_BUCKET_NAME');

      if (!bucket) {
        throw new BadRequestException('AWS bucket name is not configured');
      }

      const params = {
        Bucket: bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      this.logger.log(`Uploading file to S3: ${key}`);
      await this.s3Client.send(new PutObjectCommand(params));

      const url = `https://${bucket}.s3.${this.configService.get<string>('AWS_REGION')}.amazonaws.com/${key}`;

      return {
        key,
        url,
      };
    } catch (error) {
      this.logger.error(`Error uploading file to S3: ${error.message}`);
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const bucket = this.configService.get<string>('AWS_BUCKET_NAME');
      if (!bucket) {
        throw new BadRequestException('AWS bucket name is not configured');
      }

      const params = {
        Bucket: bucket,
        Key: key,
      };

      await this.s3Client.send(new DeleteObjectCommand(params));
      this.logger.log(`Deleted file from S3: ${key}`);
    } catch (error) {
      this.logger.error(`Error deleting file from S3: ${error.message}`);
      throw error;
    }
  }
}
