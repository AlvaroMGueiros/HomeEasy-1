import { Controller, Get, Header } from '@nestjs/common';

import { Public } from '../auth/public.decorator';
import { accountDeletionDocument, privacyPolicyDocument } from './legal-documents';

@Public()
@Controller('legal')
export class LegalController {
  @Get('privacy')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getPrivacyPolicy() {
    return privacyPolicyDocument;
  }

  @Get('account-deletion')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getAccountDeletionInstructions() {
    return accountDeletionDocument;
  }
}
