import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Max,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class DesignSizeDto {
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

export class CreateDesignsBatchDto {
  @ApiProperty({
    example: 'Resize this Instagram post for a story format. Keep the logo prominent.',
  })
  @IsString()
  @MinLength(1)
  prompt: string;

  @ApiProperty({ type: [DesignSizeDto], minItems: 1 })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => DesignSizeDto)
  sizes: DesignSizeDto[];
}
