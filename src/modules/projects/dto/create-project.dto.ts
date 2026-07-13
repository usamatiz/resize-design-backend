import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsObject, IsString, Min, MinLength } from 'class-validator';

function parseJsonField(value: unknown): unknown {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export class CreateProjectDto {
  @ApiProperty({ example: 'Summer campaign v1' })
  @IsString()
  @MinLength(1)
  name: string;

  @ApiProperty({
    description: 'Polotno store JSON exported from the editor',
    type: Object,
  })
  @Transform(({ value }) => parseJsonField(value))
  @IsObject()
  sourceJson: Record<string, unknown>;

  @ApiProperty({ example: 1080, description: 'Canvas width in pixels' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  width: number;

  @ApiProperty({ example: 1080, description: 'Canvas height in pixels' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  height: number;
}
