import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class GeneratePresetSizeDto {
  @ApiProperty({ example: 'square' })
  @IsString()
  @MinLength(1)
  key: string;

  @ApiProperty({ example: 1080, minimum: 1, maximum: 8192 })
  @IsInt()
  @Min(1)
  @Max(8192)
  width: number;

  @ApiProperty({ example: 1080, minimum: 1, maximum: 8192 })
  @IsInt()
  @Min(1)
  @Max(8192)
  height: number;
}

export class GeneratePresetsDto {
  @ApiPropertyOptional({
    example: 'Reflow the layout for social media. Keep the logo prominent.',
  })
  @IsOptional()
  @IsString()
  prompt?: string;

  @ApiProperty({ type: [GeneratePresetSizeDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => GeneratePresetSizeDto)
  sizes: GeneratePresetSizeDto[];
}
