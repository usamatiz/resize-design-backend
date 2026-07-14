import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateProjectDto {
  @ApiProperty({ required: false, example: 'Summer campaign v2' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;
}
