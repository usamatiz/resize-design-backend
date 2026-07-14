import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsObject, IsOptional, Max, Min } from 'class-validator';

export class UpdateDesignDto {
  @ApiProperty({
    description: 'Replace the stored Polotno resized JSON',
    type: Object,
  })
  @IsObject()
  resizedJson: Record<string, unknown>;

  @ApiProperty({ required: false, minimum: 1, maximum: 8192 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8192)
  width?: number;

  @ApiProperty({ required: false, minimum: 1, maximum: 8192 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8192)
  height?: number;
}
