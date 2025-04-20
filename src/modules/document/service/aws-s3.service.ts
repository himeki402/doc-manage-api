import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import { v4 as uuid } from 'uuid';

@Injectable()
export class AwsS3Service {
  private s3: S3;

  constructor(private configService: ConfigService) {
    this.s3 = new S3({
      accessKeyId: this.configService.get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: this.configService.get('AWS_SECRET_ACCESS_KEY'),
      region: this.configService.get('AWS_REGION'),
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
        throw new Error('File buffer is required');
      }

      const fileExtension = file.originalname.split('.').pop();
      const key = `${folder}/${uuid()}.${fileExtension}`;

      const params = {
        Bucket: this.configService.get('AWS_BUCKET_NAME'),
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      };

      console.log('Uploading file to S3:', {
        bucket: params.Bucket,
        key: params.Key,
        contentType: params.ContentType,
        fileSize: file.buffer.length,
      });

      const result = await this.s3.upload(params).promise();

      // Generate a pre-signed URL for the uploaded file
      const url = await this.s3.getSignedUrlPromise('getObject', {
        Bucket: this.configService.get('AWS_BUCKET_NAME'),
        Key: key,
        Expires: 3600, // URL expires in 1 hour
      });

      return {
        key: result.Key,
        url: url,
      };
    } catch (error) {
      console.error('Error uploading file to S3:', error);
      throw error;
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const params = {
        Bucket: this.configService.get('AWS_BUCKET_NAME'),
        Key: key,
      };

      await this.s3.deleteObject(params).promise();
    } catch (error) {
      console.error('Error deleting file from S3:', error);
      throw error;
    }
  }
}
