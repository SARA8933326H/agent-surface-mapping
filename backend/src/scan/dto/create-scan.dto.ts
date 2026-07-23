import { IsUrl, IsOptional, IsObject } from 'class-validator';
import { CrawlOptions } from '@surface/shared';

export class CreateScanRequestDto {
  @IsUrl({ require_protocol: true }, { message: 'url must be a valid URL with http or https' })
  url: string;

  @IsOptional()
  @IsObject()
  options?: CrawlOptions;
}
