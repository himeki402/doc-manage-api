import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { DocumentAuditLogService } from '../service/documentAuditLog.service';
import { SystemRoles } from 'src/decorator/systemRoles.decorator';
import JwtAuthGuard from 'src/modules/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/modules/auth/guard/roles.guard';
import { SystemRole } from 'src/common/enum/systemRole.enum';
import { ResponseData } from 'src/helpers/response.helper';

@Controller('documents/audit-logs')
export class DocumentAuditLogController {
  constructor(
    private readonly documentAuditLogService: DocumentAuditLogService,
  ) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @SystemRoles(SystemRole.ADMIN, SystemRole.USER)
  @Get(':id')
  async getDocumentAuditLogs(@Param('id') documentId: string) {
    if (!documentId) {
      throw new Error('Document ID is required');
    }
    const data = await this.documentAuditLogService.findByDocument(documentId);
    return ResponseData.success(
      data,
      'Document audit logs retrieved successfully',
    );
  }
}
