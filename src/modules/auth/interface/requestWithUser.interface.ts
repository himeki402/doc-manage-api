import { Request } from 'express';
import { SystemRole } from 'src/common/enum/systemRole.enum';

interface RequestWithUser extends Request {
  user: { id: string; role: SystemRole };
}

export default RequestWithUser;
