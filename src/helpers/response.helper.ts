import { HttpStatus } from '@nestjs/common';

export class ResponseData {
  static success<T>(
    data: T,
    message: string = 'Success',
    statusCode: number = HttpStatus.OK,
  ) {
    return {
      statusCode,
      message,
      data,
    };
  }

  static error(message: string, statusCode: number, error?: any) {
    return {
      statusCode,
      message,
      error: error || null,
    };
  }

  static paginate<T>(
    data: T[],
    total: number,
    page: number,
    limit: number,
    message: string = 'Success',
  ) {
    return {
      statusCode: HttpStatus.OK,
      message,
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
