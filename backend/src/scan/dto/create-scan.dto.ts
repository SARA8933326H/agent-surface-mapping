import { IsUrl, IsOptional, IsObject, IsInt, Min, Max } from 'class-validator';
import { CrawlOptions } from '@surface/shared';

export class CreateScanRequestDto {
  @IsUrl({ require_protocol: true, require_tld: false }, { message: 'url must be a valid URL with http or https' })
  url: string;

  @IsOptional()
  @IsObject()
  options?: CrawlOptions;

  /** Re-run automatically every N minutes (15 min to 7 days). */
  @IsOptional()
  @IsInt()
  @Min(15)
  @Max(10080)
  recurringIntervalMin?: number;
}
