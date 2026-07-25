import { Module } from '@nestjs/common';
import { VulnService } from './vuln.service';

@Module({
  providers: [VulnService],
  exports: [VulnService],
})
export class VulnModule {}
