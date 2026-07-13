import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({ example: 'Summer campaign v1' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({
    description: 'Polotno store JSON exported from the editor',
    type: Object,
  })
  @IsObject()
  sourceJson: Record<string, unknown>;

  @ApiProperty({
    required: false,
    description: 'Optional public URL of a preview render of the source design',
  })
  @IsOptional()
  @IsUrl()
  sourceImageUrl?: string;
}
