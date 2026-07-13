import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, IsUrl, MinLength } from 'class-validator';

export class UpdateProjectDto {
  @ApiProperty({ required: false, example: 'Summer campaign v2' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiProperty({
    required: false,
    description: 'Replace the stored Polotno source JSON',
    type: Object,
  })
  @IsOptional()
  @IsObject()
  sourceJson?: Record<string, unknown>;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsUrl()
  sourceImageUrl?: string;
}
